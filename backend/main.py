from collections import Counter
from datetime import date

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
    # Optional: lets create_trip auto-join the creator as the trip's first
    # member without a second round trip. Absent for older callers.
    user_name: str | None = None
    user_email: str | None = None
    user_avatar: str | None = None


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

    new_trip = result.data[0]

    # Auto-join the creator as the trip's first member. Best-effort: a trip
    # that exists but has no member row yet is recoverable (join manually via
    # /members); a trip that silently never got created is not. This also
    # means a stale DB (members table not yet migrated per
    # backend/sql/002_preferences.sql) degrades to "0 members" instead of
    # failing the whole request.
    try:
        supabase.table("members").insert({
            "trip_id": new_trip["id"],
            "user_id": trip.user_id,
            "name": trip.user_name or "Trip creator",
            "email": trip.user_email,
            "avatar": trip.user_avatar,
        }).execute()
    except Exception:
        pass

    return {"trip_id": new_trip["id"], "trip": new_trip}


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


# ─── Preferences ─────────────────────────────────────────────────────────────
# One row per member per trip per category (backend/sql/002_preferences.sql).
# POST is an upsert — fill in once, come back and edit, same row — keyed on
# the (member_id, trip_id) unique constraint each table carries.

class PreferencesTravel(BaseModel):
    member_id: str
    trip_id: str
    origin_city: str
    origin_airport: str          # 3-letter IATA code, e.g. "JFK"
    departure_date: date
    return_date: date
    flight_budget: int
    departure_time_pref: str     # 'any' | 'morning' | 'afternoon' | 'evening'
    date_flexibility: str        # 'exact' | '1day' | '3days' | 'flexible'


class PreferencesStay(BaseModel):
    member_id: str
    trip_id: str
    budget_min: int
    budget_max: int
    property_types: list[str]
    vibes: list[str]
    needs: list[str]


class PreferencesFood(BaseModel):
    member_id: str
    trip_id: str
    cuisines: list[str]
    dietary: list[str]
    meal_budget: str             # 'budget' | 'mid' | 'splurge'


class PreferencesActivities(BaseModel):
    member_id: str
    trip_id: str
    interests: list[str]
    pace: str                    # 'relaxed' | 'moderate' | 'packed'
    must_sees: str                # free text


def _upsert_preferences(table: str, payload: dict) -> dict:
    try:
        result = (
            supabase.table(table)
            .upsert(payload, on_conflict="member_id,trip_id")
            .execute()
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not result.data:
        raise HTTPException(status_code=500, detail=f"Failed to save {table}")
    return result.data[0]


@app.post("/preferences/travel")
def save_travel_preferences(prefs: PreferencesTravel):
    return _upsert_preferences("preferences_travel", prefs.model_dump(mode="json"))


@app.post("/preferences/stay")
def save_stay_preferences(prefs: PreferencesStay):
    return _upsert_preferences("preferences_stay", prefs.model_dump(mode="json"))


@app.post("/preferences/food")
def save_food_preferences(prefs: PreferencesFood):
    return _upsert_preferences("preferences_food", prefs.model_dump(mode="json"))


@app.post("/preferences/activities")
def save_activities_preferences(prefs: PreferencesActivities):
    return _upsert_preferences("preferences_activities", prefs.model_dump(mode="json"))


def _fetch_member_preferences(trip_id: str, member_id: str) -> dict:
    """
    All four preference rows for one member on one trip — null for any
    category not filled in yet. Shared by GET /preferences/{trip_id}/{member_id}
    (wizard pre-fill, trip page checkmarks) and GET /trips/{trip_id}/plan
    (group consensus).
    """
    def _one(table: str):
        try:
            result = (
                supabase.table(table)
                .select("*")
                .eq("trip_id", trip_id)
                .eq("member_id", member_id)
                .execute()
            )
        except Exception:
            return None
        return result.data[0] if result.data else None

    return {
        "travel": _one("preferences_travel"),
        "stay": _one("preferences_stay"),
        "food": _one("preferences_food"),
        "activities": _one("preferences_activities"),
    }


@app.get("/preferences/{trip_id}/{member_id}")
def get_member_preferences(trip_id: str, member_id: str):
    return _fetch_member_preferences(trip_id, member_id)


# ─── Plan ────────────────────────────────────────────────────────────────────
# Deterministic group consensus + a live Stay22 hotel search, all in one call.
# No AI narrative and no live flight fares yet — those need ANTHROPIC_API_KEY
# and AEROXPLORER_TOKEN, which aren't set. Rather than fake them, this returns
# the real computed consensus and says in `notes` what's off and why; once
# those keys exist, an AI summary + fare lookups can slot in without changing
# this response's shape.

def _union(lists: list[list[str] | None]) -> list[str]:
    """Merge array preference fields (property types, cuisines, ...), stable order, no dupes."""
    seen: list[str] = []
    for values in lists:
        for value in values or []:
            if value not in seen:
                seen.append(value)
    return seen


def _mode(values: list[str | None]) -> str | None:
    """Most common non-null value — used for single-choice fields like pace or meal budget."""
    present = [value for value in values if value]
    if not present:
        return None
    return Counter(present).most_common(1)[0][0]


def _budget_consensus(mins: list[int], maxes: list[int]) -> dict:
    """Highest floor / lowest ceiling everyone can afford; average as fallback if no overlap."""
    if not mins or not maxes:
        return {"min": None, "max": None}
    budget_min, budget_max = max(mins), min(maxes)
    if budget_min > budget_max:
        budget_min = round(sum(mins) / len(mins))
        budget_max = round(sum(maxes) / len(maxes))
    return {"min": budget_min, "max": budget_max}


def _flight_groups(travel_prefs: list[dict]) -> dict:
    """Group members by departure date and flag anyone leaving on a different day."""
    dated = [(pref["name"], pref["departure_date"]) for pref in travel_prefs if pref.get("departure_date")]
    if not dated:
        return {"groups": [], "warnings": []}

    majority_date = Counter(date for _, date in dated).most_common(1)[0][0]
    groups: dict[str, list[str]] = {}
    for name, dep_date in dated:
        groups.setdefault(dep_date, []).append(name)

    warnings = [
        f"{name} departs {dep_date}, most of the group leaves {majority_date}"
        for name, dep_date in dated
        if dep_date != majority_date
    ]

    return {
        "groups": [{"date": dep_date, "members": names} for dep_date, names in groups.items()],
        "warnings": warnings,
    }


@app.get("/trips/{trip_id}/plan")
def get_trip_plan(trip_id: str):
    """
    Everything the results screen needs: trip details, each member's own
    preferences, a deterministic group consensus (merged stay/food/activity
    preferences + flight-date groupings), and a live Stay22 hotel search
    against that consensus budget.
    """
    trip_result = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trip_result.data

    members = (supabase.table("members").select("*").eq("trip_id", trip_id).execute().data) or []

    member_rows = []
    for member in members:
        prefs = _fetch_member_preferences(trip_id, member["id"])
        member_rows.append({
            "member_id": member["id"],
            "name": member.get("name") or "Traveler",
            **prefs,
        })

    stay_prefs = [row["stay"] for row in member_rows if row["stay"]]
    food_prefs = [row["food"] for row in member_rows if row["food"]]
    activity_prefs = [row["activities"] for row in member_rows if row["activities"]]
    travel_prefs = [
        {**row["travel"], "name": row["name"]} for row in member_rows if row["travel"]
    ]

    stay_budget = _budget_consensus(
        [pref["budget_min"] for pref in stay_prefs if pref.get("budget_min") is not None],
        [pref["budget_max"] for pref in stay_prefs if pref.get("budget_max") is not None],
    )

    consensus = {
        "stay": {
            "budget_min": stay_budget["min"],
            "budget_max": stay_budget["max"],
            "property_types": _union([pref.get("property_types") for pref in stay_prefs]),
            "vibes": _union([pref.get("vibes") for pref in stay_prefs]),
            "needs": _union([pref.get("needs") for pref in stay_prefs]),
        },
        "food": {
            "cuisines": _union([pref.get("cuisines") for pref in food_prefs]),
            "dietary": _union([pref.get("dietary") for pref in food_prefs]),
            "meal_budget": _mode([pref.get("meal_budget") for pref in food_prefs]),
        },
        "activities": {
            "interests": _union([pref.get("interests") for pref in activity_prefs]),
            "pace": _mode([pref.get("pace") for pref in activity_prefs]),
            "must_sees": [
                {"name": row["name"], "must_sees": row["activities"]["must_sees"]}
                for row in member_rows
                if row["activities"] and row["activities"].get("must_sees")
            ],
        },
        "flights": _flight_groups(travel_prefs),
    }

    hotels = unavailable_response()
    if stay_budget["min"] is not None and trip.get("lat") is not None and trip.get("lng") is not None:
        try:
            hotels = search_accommodations(
                lat=trip["lat"],
                lng=trip["lng"],
                checkin=trip["checkin"],
                checkout=trip["checkout"],
                guests=max(len(members), 1),
                page_size=10,
                min_price=stay_budget["min"],
                max_price=stay_budget["max"],
            )
        except Stay22ServiceError:
            hotels = unavailable_response()

    completed = sum(
        1 for row in member_rows
        if all(row[category] is not None for category in ("travel", "stay", "food", "activities"))
    )

    notes = []
    if not os.getenv("ANTHROPIC_API_KEY"):
        notes.append("AI-generated group summary is off — set ANTHROPIC_API_KEY in backend/.env to enable it.")
    if not os.getenv("AEROXPLORER_TOKEN"):
        notes.append("Live flight fare estimates are off — set AEROXPLORER_TOKEN in backend/.env to enable them.")

    return {
        "trip": trip,
        "members": member_rows,
        "members_completed": completed,
        "members_total": len(members),
        "consensus": consensus,
        "hotels": hotels,
        "ai_summary": None,
        "notes": notes,
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


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "GroupGo API running"}
