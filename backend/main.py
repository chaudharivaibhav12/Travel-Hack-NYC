from datetime import date, datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

from services.weather import WeatherServiceError, fetch_weather
from services.stay22 import Stay22ServiceError, search_accommodations, unavailable_response

load_dotenv()

app = FastAPI(title="GroupGo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_ANON_KEY"),
)


# ─── Config ──────────────────────────────────────────────────────────────────

@app.get("/config")
def get_config():
    """
    Public Supabase config for the frontend.

    The anon key is designed to be public (it ships in frontend bundles); the
    real security boundary is Row Level Security on each table. Serving it from
    here means the frontend has no hardcoded credentials of its own.
    """
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY"),
    }


# ─── Auth ────────────────────────────────────────────────────────────────────

@app.get("/auth/google")
def google_login():
    """Redirect user to Google OAuth via Supabase."""
    response = supabase.auth.sign_in_with_oauth({
        "provider": "google",
        "options": {
            "redirect_to": os.getenv("REDIRECT_URL", "http://localhost:5173/auth/callback")
        }
    })
    return RedirectResponse(url=response.url)


@app.get("/auth/callback")
def auth_callback(code: str = None, error: str = None):
    """
    Supabase handles the token exchange automatically on the frontend.
    This endpoint exists if you want server-side session handling.
    For most React setups, the frontend handles this directly via
    supabase.auth.onAuthStateChange() — you may not need this route at all.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    # Redirect back to frontend — Supabase JS client picks up the session
    return RedirectResponse(url=os.getenv("FRONTEND_URL", "http://localhost:5173"))


class TokenRequest(BaseModel):
    access_token: str


@app.post("/auth/verify")
def verify_token(body: TokenRequest):
    """
    Verify a Supabase JWT from the frontend and return user info.
    Frontend calls this after login to confirm the session server-side.
    """
    try:
        user = supabase.auth.get_user(body.access_token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "id": user.user.id,
            "email": user.user.email,
            "name": user.user.user_metadata.get("full_name"),
            "avatar": user.user.user_metadata.get("avatar_url"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.post("/auth/logout")
def logout(body: TokenRequest):
    """Sign out the user."""
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Trips ───────────────────────────────────────────────────────────────────

class TripCreate(BaseModel):
    event_name: str
    event_location: str
    lat: float
    lng: float
    checkin: date
    checkout: date
    user_id: str    # from Supabase auth


@app.post("/trips")
def create_trip(trip: TripCreate):
    """Create a new group trip. Returns a shareable trip ID."""
    if trip.checkout <= trip.checkin:
        raise HTTPException(status_code=422, detail="checkout must be after checkin")

    try:
        result = supabase.table("trips").insert({
            "event_name": trip.event_name,
            "event_location": trip.event_location,
            "lat": trip.lat,
            "lng": trip.lng,
            "checkin": trip.checkin.isoformat(),
            "checkout": trip.checkout.isoformat(),
            "created_by": trip.user_id,
        }).execute()
    except Exception as error:
        # Surface the real Postgres/Supabase error (e.g. "invalid input syntax
        # for type uuid") instead of an opaque 500 with no body — the frontend
        # proxy at app/api/trips/route.ts reads `detail` and shows it verbatim.
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create trip")

    return {"trip_id": result.data[0]["id"], "trip": result.data[0]}


@app.get("/trips")
def list_trips(user_id: str = Query(...)):
    """
    List trips a user created, most recent first. Powers the My Trips screen.
    (Trips someone only joined as a member, rather than created, aren't
    included yet — that needs a membership-based query once /members grows
    beyond quick-create.)
    """
    try:
        result = (
            supabase.table("trips")
            .select("*")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception:
        # A malformed user_id (e.g. the "demo-user" fallback, not a real
        # Supabase UUID) can never match a real trip — treat it as "no trips"
        # rather than 500ing. Matches how the frontend already degrades a
        # failed fetch to an empty list (lib/server/trips.ts).
        return {"trips": []}

    return {"trips": result.data or []}


@app.get("/trips/{trip_id}")
def get_trip(trip_id: str):
    """Get trip details + all members."""
    trip = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    members = supabase.table("members").select("*").eq("trip_id", trip_id).execute()

    return {
        "trip": trip.data,
        "members": members.data or []
    }


# ─── Members ─────────────────────────────────────────────────────────────────

class MemberJoin(BaseModel):
    trip_id: str
    user_id: str
    name: str
    budget_min: int
    budget_max: int
    origin_city: str
    origin_airport: str   # e.g. "JFK"
    vibe_raw: str         # plain English vibe description
    vibe_params: dict     # Claude-generated Stay22 params


@app.post("/members")
def join_trip(member: MemberJoin):
    """Add a member to a trip."""
    # Check trip exists
    trip = supabase.table("trips").select("id").eq("id", member.trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    result = supabase.table("members").insert({
        "trip_id": member.trip_id,
        "user_id": member.user_id,
        "name": member.name,
        "budget_min": member.budget_min,
        "budget_max": member.budget_max,
        "origin_city": member.origin_city,
        "origin_airport": member.origin_airport,
        "vibe_raw": member.vibe_raw,
        "vibe_params": member.vibe_params,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to join trip")

    return {"member": result.data[0]}


@app.get("/members/{trip_id}/consensus")
def get_consensus(trip_id: str):
    """
    Compute group consensus: overlapping budget range + merged vibe params.
    Frontend calls this before hitting Stay22 API.
    """
    members = supabase.table("members").select("*").eq("trip_id", trip_id).execute()
    if not members.data:
        raise HTTPException(status_code=404, detail="No members found for this trip")

    data = members.data
    budget_min = max(m["budget_min"] for m in data)   # highest floor (everyone can afford)
    budget_max = min(m["budget_max"] for m in data)   # lowest ceiling (no one overspends)

    if budget_min > budget_max:
        # No overlap — use average as fallback
        budget_min = int(sum(m["budget_min"] for m in data) / len(data))
        budget_max = int(sum(m["budget_max"] for m in data) / len(data))

    # Collect all origin airports for flight lookups
    origins = [{"name": m["name"], "airport": m["origin_airport"], "city": m["origin_city"]} for m in data]

    # Merge vibe params (take most common values across members)
    all_vibe_params = [m["vibe_params"] for m in data if m.get("vibe_params")]

    return {
        "member_count": len(data),
        "budget_consensus": {
            "min": budget_min,
            "max": budget_max,
        },
        "origins": origins,
        "vibe_params_per_member": all_vibe_params,  # Claude on frontend merges these
    }


# ─── Weather ─────────────────────────────────────────────────────────────────

@app.get("/weather")
def get_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    start_date: date = Query(),
    end_date: date = Query(),
):
    """Return an Open-Meteo forecast for a trip's coordinates and dates."""
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date")
    if (end_date - start_date).days > 15:
        raise HTTPException(status_code=422, detail="Weather requests are limited to 16 days")

    try:
        return fetch_weather(latitude, longitude, start_date, end_date)
    except WeatherServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


# ─── Accommodations ──────────────────────────────────────────────────────────

@app.get("/accommodations")
def get_accommodations(
    address: str = Query(default=None),
    lat: float = Query(default=None, ge=-90, le=90),
    lng: float = Query(default=None, ge=-180, le=180),
    checkin: date = Query(),
    checkout: date = Query(),
    guests: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    min_price: float = Query(default=None, ge=0),
    max_price: float = Query(default=None, ge=0),
):
    """Search accommodations via Stay22.

    Returns a normalized list of stays with prices across Booking.com,
    VRBO, Expedia, and Hotels.com. On provider failure or timeout, returns
    an empty unavailable response so the frontend can hide the panel gracefully.
    """
    if address is None and (lat is None or lng is None):
        raise HTTPException(
            status_code=422,
            detail="Provide either address or both lat and lng",
        )
    if checkout <= checkin:
        raise HTTPException(
            status_code=422,
            detail="checkout must be after checkin",
        )

    try:
        return search_accommodations(
            address=address,
            lat=lat,
            lng=lng,
            checkin=checkin,
            checkout=checkout,
            guests=guests,
            page_size=page_size,
            min_price=min_price,
            max_price=max_price,
        )
    except Stay22ServiceError:
        return unavailable_response()


# ─── User lookup (for email-based member invitation) ─────────────────────────

@app.get("/users/search")
def search_user_by_email(email: str = Query(..., description="Email to look up")):
    """
    Look up a registered user by email address.
    Used by the group trip UI to validate invites before sending them.

    Tries the 'profiles' table first (public-readable, synced from auth.users
    via a DB trigger — set this up in your Supabase project if you need real
    user lookup). Falls back gracefully so the UI can still store the invite.
    """
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email address")

    try:
        result = (
            supabase.table("profiles")
            .select("id, email, full_name, display_name")
            .eq("email", email.lower().strip())
            .maybe_single()
            .execute()
        )
        if result.data:
            name = (
                result.data.get("full_name")
                or result.data.get("display_name")
                or email.split("@")[0]
            )
            return {
                "found": True,
                "user_id": result.data.get("id"),
                "name": name,
                "email": email.lower().strip(),
            }
    except Exception:
        pass

    raise HTTPException(
        status_code=404,
        detail="User not found. They will see this trip once they join the platform.",
    )


# ─── Group Trips (Supabase-backed) ───────────────────────────────────────────

class GroupTripCreate(BaseModel):
    title: str
    destination: str
    checkin: str       # YYYY-MM-DD
    checkout: str      # YYYY-MM-DD
    organizer_email: str
    organizer_user_id: str | None = None
    invited_emails: list[str] = []


@app.post("/group-trips")
def create_group_trip(body: GroupTripCreate):
    """Create a group trip and return its Supabase UUID as trip_id."""
    result = supabase.table("group_trips").insert({
        "title": body.title,
        "destination": body.destination,
        "checkin": body.checkin,
        "checkout": body.checkout,
        "organizer_email": body.organizer_email,
        "organizer_user_id": body.organizer_user_id,
        "invited_emails": body.invited_emails,
        "status": "survey-open",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create group trip")

    return {"trip_id": result.data[0]["id"], "trip": result.data[0]}


@app.get("/group-trips")
def list_group_trips(email: str = Query(..., description="User email")):
    """Return all trips where the user is organizer or invited."""
    as_organizer = supabase.table("group_trips").select("*").eq("organizer_email", email).execute()
    as_invited   = supabase.table("group_trips").select("*").contains("invited_emails", [email]).execute()

    seen, trips = set(), []
    for t in (as_organizer.data or []) + (as_invited.data or []):
        if t["id"] not in seen:
            seen.add(t["id"])
            trips.append(t)

    # Attach per-trip survey completion counts
    for t in trips:
        surveys = (
            supabase.table("member_surveys")
            .select("user_email, completed_at")
            .eq("trip_id", t["id"])
            .execute()
        )
        t["survey_statuses"] = {
            s["user_email"]: ("complete" if s.get("completed_at") else "in-progress")
            for s in (surveys.data or [])
        }

    return {"trips": trips}


@app.get("/group-trips/{trip_id}")
def get_group_trip(trip_id: str):
    """Return trip details + survey completion status per member."""
    trip = supabase.table("group_trips").select("*").eq("id", trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    surveys = (
        supabase.table("member_surveys")
        .select("user_email, completed_at")
        .eq("trip_id", trip_id)
        .execute()
    )
    survey_statuses = {
        s["user_email"]: ("complete" if s.get("completed_at") else "in-progress")
        for s in (surveys.data or [])
    }

    return {"trip": trip.data, "survey_statuses": survey_statuses}


# ─── Member Surveys ───────────────────────────────────────────────────────────

class SurveyUpsert(BaseModel):
    user_email: str
    user_id: str | None = None
    # availability
    arrival_date: str | None = None
    arrival_time: str = ""
    departure_date: str | None = None
    departure_time: str = ""
    join_full_trip: bool = True
    fixed_commitments: str = ""
    schedule_note: str = ""
    # budget
    budget_band: str = ""
    budget_flexibility: str = ""
    spending_priorities: list[str] = []
    accommodation_preference: str = ""
    room_preference: str = ""
    bathroom_preference: str = ""
    optional_cost_preference: str = ""
    # pace
    daily_pace: str = ""
    preferred_start_time: str = ""
    walking_tolerance: str = ""
    transport_preference: str = ""
    free_time_need: str = ""
    group_style_preference: str = ""
    # comfort
    dietary_preferences: str = ""
    alcohol_preference: str = ""
    accessibility_needs: list[str] = []
    sensory_preferences: list[str] = []
    # interests
    interests: list[str] = []
    must_do: str = ""
    cannot_do: list[str] = []
    # mark complete
    completed: bool = False


@app.post("/group-trips/{trip_id}/surveys")
def upsert_survey(trip_id: str, body: SurveyUpsert):
    """Save or update a member's private survey for a trip."""
    trip = supabase.table("group_trips").select("id").eq("id", trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    now = datetime.now(timezone.utc).isoformat()
    row = {
        "trip_id":                  trip_id,
        "user_email":               body.user_email,
        "user_id":                  body.user_id,
        "arrival_date":             body.arrival_date or None,
        "arrival_time":             body.arrival_time,
        "departure_date":           body.departure_date or None,
        "departure_time":           body.departure_time,
        "join_full_trip":           body.join_full_trip,
        "fixed_commitments":        body.fixed_commitments,
        "schedule_note":            body.schedule_note,
        "budget_band":              body.budget_band,
        "budget_flexibility":       body.budget_flexibility,
        "spending_priorities":      body.spending_priorities,
        "accommodation_preference": body.accommodation_preference,
        "room_preference":          body.room_preference,
        "bathroom_preference":      body.bathroom_preference,
        "optional_cost_preference": body.optional_cost_preference,
        "daily_pace":               body.daily_pace,
        "preferred_start_time":     body.preferred_start_time,
        "walking_tolerance":        body.walking_tolerance,
        "transport_preference":     body.transport_preference,
        "free_time_need":           body.free_time_need,
        "group_style_preference":   body.group_style_preference,
        "dietary_preferences":      body.dietary_preferences,
        "alcohol_preference":       body.alcohol_preference,
        "accessibility_needs":      body.accessibility_needs,
        "sensory_preferences":      body.sensory_preferences,
        "interests":                body.interests,
        "must_do":                  body.must_do,
        "cannot_do":                body.cannot_do,
        "updated_at":               now,
        "completed_at":             now if body.completed else None,
    }

    result = (
        supabase.table("member_surveys")
        .upsert(row, on_conflict="trip_id,user_email")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save survey")

    return {"survey": result.data[0]}


@app.get("/group-trips/{trip_id}/surveys/{user_email}")
def get_survey(trip_id: str, user_email: str):
    """Fetch one member's survey for a trip."""
    result = (
        supabase.table("member_surveys")
        .select("*")
        .eq("trip_id", trip_id)
        .eq("user_email", user_email)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {"survey": result.data}


# ─── Generate Itinerary ───────────────────────────────────────────────────────

@app.get("/group-trips/{trip_id}/generate-context")
def get_generate_context(trip_id: str):
    """
    Assemble and return the structured trip + member-preference data you pass
    to Claude to generate per-person itineraries.

    Shape of the returned payload:
    {
      "trip": { id, title, destination, checkin, checkout, organizer_email, invited_emails },
      "members": [
        {
          "email": str,
          "availability": { arrival_date, arrival_time, departure_date, departure_time, join_full_trip, fixed_commitments, schedule_note },
          "budget":       { band, flexibility, spending_priorities, accommodation_preference, room_preference, bathroom_preference, optional_cost_preference },
          "pace":         { daily_pace, preferred_start_time, walking_tolerance, transport_preference, free_time_need, group_style_preference },
          "comfort":      { dietary_preferences, alcohol_preference, accessibility_needs, sensory_preferences },
          "interests":    { interests, must_do, cannot_do }
        },
        ...
      ]
    }
    """
    trip = supabase.table("group_trips").select("*").eq("id", trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")

    surveys = (
        supabase.table("member_surveys")
        .select("*")
        .eq("trip_id", trip_id)
        .not_.is_("completed_at", "null")
        .execute()
    )

    if not surveys.data:
        raise HTTPException(status_code=400, detail="No completed surveys for this trip")

    members = [
        {
            "email": s["user_email"],
            "availability": {
                "arrival_date":       s.get("arrival_date"),
                "arrival_time":       s.get("arrival_time"),
                "departure_date":     s.get("departure_date"),
                "departure_time":     s.get("departure_time"),
                "join_full_trip":     s.get("join_full_trip", True),
                "fixed_commitments":  s.get("fixed_commitments"),
                "schedule_note":      s.get("schedule_note"),
            },
            "budget": {
                "band":                       s.get("budget_band"),
                "flexibility":                s.get("budget_flexibility"),
                "spending_priorities":         s.get("spending_priorities", []),
                "accommodation_preference":    s.get("accommodation_preference"),
                "room_preference":             s.get("room_preference"),
                "bathroom_preference":         s.get("bathroom_preference"),
                "optional_cost_preference":    s.get("optional_cost_preference"),
            },
            "pace": {
                "daily_pace":            s.get("daily_pace"),
                "preferred_start_time":  s.get("preferred_start_time"),
                "walking_tolerance":     s.get("walking_tolerance"),
                "transport_preference":  s.get("transport_preference"),
                "free_time_need":        s.get("free_time_need"),
                "group_style_preference": s.get("group_style_preference"),
            },
            "comfort": {
                "dietary_preferences":  s.get("dietary_preferences"),
                "alcohol_preference":   s.get("alcohol_preference"),
                "accessibility_needs":  s.get("accessibility_needs", []),
                "sensory_preferences":  s.get("sensory_preferences", []),
            },
            "interests": {
                "interests":  s.get("interests", []),
                "must_do":    s.get("must_do"),
                "cannot_do":  s.get("cannot_do", []),
            },
        }
        for s in surveys.data
    ]

    return {
        "trip": {
            "id":              trip.data["id"],
            "title":           trip.data["title"],
            "destination":     trip.data["destination"],
            "checkin":         str(trip.data["checkin"]),
            "checkout":        str(trip.data["checkout"]),
            "organizer_email": trip.data["organizer_email"],
            "invited_emails":  trip.data.get("invited_emails", []),
        },
        "members": members,
    }


class ItinerarySave(BaseModel):
    member_email: str
    content: dict


@app.post("/group-trips/{trip_id}/itineraries")
def save_itinerary(trip_id: str, body: ItinerarySave):
    """Store the Claude-generated itinerary for one member."""
    result = (
        supabase.table("itineraries")
        .upsert(
            {"trip_id": trip_id, "member_email": body.member_email, "content": body.content},
            on_conflict="trip_id,member_email",
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save itinerary")
    return {"itinerary": result.data[0]}


@app.get("/group-trips/{trip_id}/itineraries")
def list_itineraries(trip_id: str):
    """Fetch all stored itineraries for a trip."""
    result = supabase.table("itineraries").select("*").eq("trip_id", trip_id).execute()
    return {"itineraries": result.data or []}


@app.get("/group-trips/{trip_id}/itineraries/{member_email}")
def get_itinerary(trip_id: str, member_email: str):
    """Fetch one member's stored itinerary."""
    result = (
        supabase.table("itineraries")
        .select("*")
        .eq("trip_id", trip_id)
        .eq("member_email", member_email)
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return {"itinerary": result.data}


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "GroupGo API running"}
