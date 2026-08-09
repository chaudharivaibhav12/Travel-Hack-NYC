from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/group-trips", tags=["group-trips"])


# ─── Models ───────────────────────────────────────────────────────────────────

class GroupTripCreate(BaseModel):
    title: str
    destination: str
    checkin: str
    checkout: str
    organizer_email: str
    organizer_user_id: str | None = None
    invited_emails: list[str] = Field(default_factory=list)


class SurveyUpsert(BaseModel):
    user_email: str
    user_id: str | None = None
    arrival_date: str | None = None
    arrival_time: str = ""
    departure_date: str | None = None
    departure_time: str = ""
    join_full_trip: bool = True
    fixed_commitments: str = ""
    schedule_note: str = ""
    budget_band: str = ""
    budget_flexibility: str = ""
    spending_priorities: list[str] = Field(default_factory=list)
    accommodation_preference: str = ""
    room_preference: str = ""
    bathroom_preference: str = ""
    optional_cost_preference: str = ""
    daily_pace: str = ""
    preferred_start_time: str = ""
    walking_tolerance: str = ""
    transport_preference: str = ""
    free_time_need: str = ""
    group_style_preference: str = ""
    dietary_preferences: str = ""
    alcohol_preference: str = ""
    accessibility_needs: list[str] = Field(default_factory=list)
    sensory_preferences: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    must_do: str = ""
    cannot_do: list[str] = Field(default_factory=list)
    completed: bool = False


class ItinerarySave(BaseModel):
    member_email: str
    content: dict


class GroupTripUpdate(BaseModel):
    status: str


class InvitationResponse(BaseModel):
    email: str
    response: str


# ─── Trip CRUD ────────────────────────────────────────────────────────────────

@router.post("")
def create_group_trip(body: GroupTripCreate, supabase: Client = Depends(get_supabase)):
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
    trip = result.data[0]
    if body.invited_emails:
        invitations = [{
            "trip_id": trip["id"],
            "inviter_email": body.organizer_email.lower(),
            "invitee_email": email.lower(),
            "status": "pending",
        } for email in dict.fromkeys(body.invited_emails) if email.lower() != body.organizer_email.lower()]
        if invitations:
            try:
                supabase.table("group_trip_invitations").upsert(
                    invitations, on_conflict="trip_id,invitee_email"
                ).execute()
            except Exception:
                pass
    return {"trip_id": trip["id"], "trip": trip}


@router.get("")
def list_group_trips(email: str = Query(...), supabase: Client = Depends(get_supabase)):
    as_organizer = supabase.table("group_trips").select("*").eq("organizer_email", email).execute()
    try:
        accepted = (
            supabase.table("group_trip_invitations").select("trip_id")
            .eq("invitee_email", email.lower()).eq("status", "accepted").execute()
        )
        accepted_ids = [row["trip_id"] for row in (accepted.data or [])]
        as_invited_data = []
        for trip_id in accepted_ids:
            row = supabase.table("group_trips").select("*").eq("id", trip_id).single().execute()
            if row.data:
                as_invited_data.append(row.data)
    except Exception:
        legacy = supabase.table("group_trips").select("*").contains("invited_emails", [email]).execute()
        as_invited_data = legacy.data or []

    seen, trips = set(), []
    for t in (as_organizer.data or []) + as_invited_data:
        if t["id"] not in seen:
            seen.add(t["id"])
            trips.append(t)

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


@router.get("/invitations/pending")
def list_pending_invitations(email: str = Query(...), supabase: Client = Depends(get_supabase)):
    try:
        result = (
            supabase.table("group_trip_invitations").select("*")
            .eq("invitee_email", email.lower()).eq("status", "pending").execute()
        )
    except Exception:
        return {"invitations": [], "demo_mode": True}
    invitations = []
    for invitation in result.data or []:
        trip = supabase.table("group_trips").select("*").eq("id", invitation["trip_id"]).single().execute()
        if trip.data:
            invitations.append({**invitation, "trip": trip.data})
    return {"invitations": invitations}


@router.post("/{trip_id}/invitations/respond")
def respond_to_invitation(
    trip_id: str, body: InvitationResponse, supabase: Client = Depends(get_supabase)
):
    if body.response not in {"accepted", "declined"}:
        raise HTTPException(status_code=422, detail="Response must be accepted or declined")
    result = (
        supabase.table("group_trip_invitations")
        .update({"status": body.response, "responded_at": datetime.now(timezone.utc).isoformat()})
        .eq("trip_id", trip_id).eq("invitee_email", body.email.lower()).eq("status", "pending").execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Pending invitation not found")
    return {"invitation": result.data[0]}


@router.patch("/{trip_id}")
def update_group_trip(trip_id: str, body: GroupTripUpdate, supabase: Client = Depends(get_supabase)):
    allowed_statuses = {"setup", "survey-open", "generating", "reviewing", "locked"}
    if body.status not in allowed_statuses:
        raise HTTPException(status_code=422, detail="Invalid group trip status")
    result = supabase.table("group_trips").update({"status": body.status}).eq("id", trip_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"trip": result.data[0]}


@router.get("/{trip_id}")
def get_group_trip(trip_id: str, supabase: Client = Depends(get_supabase)):
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


# ─── Surveys ──────────────────────────────────────────────────────────────────

@router.post("/{trip_id}/surveys")
def upsert_survey(trip_id: str, body: SurveyUpsert, supabase: Client = Depends(get_supabase)):
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


@router.get("/{trip_id}/surveys/{user_email}")
def get_survey(trip_id: str, user_email: str, supabase: Client = Depends(get_supabase)):
    result = (
        supabase.table("member_surveys")
        .select("*")
        .eq("trip_id", trip_id)
        .eq("user_email", user_email)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Survey not found")
    return {"survey": result.data}


# ─── Generate context (structured data to pass to Claude) ────────────────────

@router.get("/{trip_id}/generate-context")
def get_generate_context(trip_id: str, supabase: Client = Depends(get_supabase)):
    """
    Returns structured trip + member preference data ready to feed into Claude.

    Shape:
    {
      "trip": { id, title, destination, checkin, checkout, organizer_email, invited_emails },
      "members": [
        {
          "email": str,
          "availability": { arrival_date, arrival_time, departure_date, departure_time,
                            join_full_trip, fixed_commitments, schedule_note },
          "budget":       { band, flexibility, spending_priorities,
                            accommodation_preference, room_preference,
                            bathroom_preference, optional_cost_preference },
          "pace":         { daily_pace, preferred_start_time, walking_tolerance,
                            transport_preference, free_time_need, group_style_preference },
          "comfort":      { dietary_preferences, alcohol_preference,
                            accessibility_needs, sensory_preferences },
          "interests":    { interests, must_do, cannot_do }
        }
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
                "arrival_date":      s.get("arrival_date"),
                "arrival_time":      s.get("arrival_time"),
                "departure_date":    s.get("departure_date"),
                "departure_time":    s.get("departure_time"),
                "join_full_trip":    s.get("join_full_trip", True),
                "fixed_commitments": s.get("fixed_commitments"),
                "schedule_note":     s.get("schedule_note"),
            },
            "budget": {
                "band":                    s.get("budget_band"),
                "flexibility":             s.get("budget_flexibility"),
                "spending_priorities":      s.get("spending_priorities", []),
                "accommodation_preference": s.get("accommodation_preference"),
                "room_preference":          s.get("room_preference"),
                "bathroom_preference":      s.get("bathroom_preference"),
                "optional_cost_preference": s.get("optional_cost_preference"),
            },
            "pace": {
                "daily_pace":             s.get("daily_pace"),
                "preferred_start_time":   s.get("preferred_start_time"),
                "walking_tolerance":      s.get("walking_tolerance"),
                "transport_preference":   s.get("transport_preference"),
                "free_time_need":         s.get("free_time_need"),
                "group_style_preference": s.get("group_style_preference"),
            },
            "comfort": {
                "dietary_preferences": s.get("dietary_preferences"),
                "alcohol_preference":  s.get("alcohol_preference"),
                "accessibility_needs": s.get("accessibility_needs", []),
                "sensory_preferences": s.get("sensory_preferences", []),
            },
            "interests": {
                "interests": s.get("interests", []),
                "must_do":   s.get("must_do"),
                "cannot_do": s.get("cannot_do", []),
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


# ─── Itineraries ──────────────────────────────────────────────────────────────

@router.post("/{trip_id}/itineraries")
def save_itinerary(trip_id: str, body: ItinerarySave, supabase: Client = Depends(get_supabase)):
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


@router.get("/{trip_id}/itineraries")
def list_itineraries(trip_id: str, supabase: Client = Depends(get_supabase)):
    result = supabase.table("itineraries").select("*").eq("trip_id", trip_id).execute()
    return {"itineraries": result.data or []}


@router.get("/{trip_id}/itineraries/{member_email}")
def get_itinerary(trip_id: str, member_email: str, supabase: Client = Depends(get_supabase)):
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
