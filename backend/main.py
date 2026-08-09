from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

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


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "GroupGo API running"}