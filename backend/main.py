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
    checkin: str    # YYYY-MM-DD
    checkout: str   # YYYY-MM-DD
    user_id: str    # from Supabase auth


@app.post("/trips")
def create_trip(trip: TripCreate):
    """Create a new group trip. Returns a shareable trip ID."""
    result = supabase.table("trips").insert({
        "event_name": trip.event_name,
        "event_location": trip.event_location,
        "lat": trip.lat,
        "lng": trip.lng,
        "checkin": trip.checkin,
        "checkout": trip.checkout,
        "created_by": trip.user_id,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create trip")

    return {"trip_id": result.data[0]["id"], "trip": result.data[0]}


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


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "GroupGo API running"}
