from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/trips", tags=["trips"])


class TripCreate(BaseModel):
    event_name: str
    event_location: str
    lat: float
    lng: float
    checkin: date
    checkout: date
    user_id: str
    user_name: str | None = None
    user_email: str | None = None
    user_avatar: str | None = None


@router.post("")
def create_trip(trip: TripCreate, supabase: Client = Depends(get_supabase)):
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
        raise HTTPException(status_code=400, detail=str(error)) from error
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create trip")
    new_trip = result.data[0]
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


@router.get("")
def list_trips(user_id: str = Query(...), supabase: Client = Depends(get_supabase)):
    try:
        result = (
            supabase.table("trips").select("*").eq("created_by", user_id)
            .order("created_at", desc=True).execute()
        )
    except Exception:
        return {"trips": []}
    return {"trips": result.data or []}


@router.get("/{trip_id}")
def get_trip(trip_id: str, supabase: Client = Depends(get_supabase)):
    trip = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    members = supabase.table("members").select("*").eq("trip_id", trip_id).execute()
    return {"trip": trip.data, "members": members.data or []}
