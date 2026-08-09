from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/members", tags=["members"])


class MemberJoin(BaseModel):
    trip_id: str
    user_id: str
    name: str
    budget_min: int
    budget_max: int
    origin_city: str
    origin_airport: str
    vibe_raw: str
    vibe_params: dict


@router.post("")
def join_trip(member: MemberJoin, supabase: Client = Depends(get_supabase)):
    trip = supabase.table("trips").select("id").eq("id", member.trip_id).single().execute()
    if not trip.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    result = supabase.table("members").insert(member.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to join trip")
    return {"member": result.data[0]}


@router.get("/{trip_id}/consensus")
def get_consensus(trip_id: str, supabase: Client = Depends(get_supabase)):
    members = supabase.table("members").select("*").eq("trip_id", trip_id).execute()
    if not members.data:
        raise HTTPException(status_code=404, detail="No members found for this trip")
    data = members.data
    budget_min = max(member["budget_min"] for member in data)
    budget_max = min(member["budget_max"] for member in data)
    if budget_min > budget_max:
        budget_min = int(sum(member["budget_min"] for member in data) / len(data))
        budget_max = int(sum(member["budget_max"] for member in data) / len(data))
    origins = [
        {"name": member["name"], "airport": member["origin_airport"], "city": member["origin_city"]}
        for member in data
    ]
    vibe_params = [member["vibe_params"] for member in data if member.get("vibe_params")]
    return {
        "member_count": len(data),
        "budget_consensus": {"min": budget_min, "max": budget_max},
        "origins": origins,
        "vibe_params_per_member": vibe_params,
    }
