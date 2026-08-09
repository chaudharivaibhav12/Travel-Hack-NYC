from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/preferences", tags=["preferences"])


class PreferencesTravel(BaseModel):
    member_id: str
    trip_id: str
    origin_city: str
    origin_airport: str
    departure_date: date
    return_date: date
    flight_budget: int
    departure_time_pref: str
    date_flexibility: str


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
    meal_budget: str


class PreferencesActivities(BaseModel):
    member_id: str
    trip_id: str
    interests: list[str]
    pace: str
    must_sees: str


def upsert_preferences(supabase: Client, table: str, payload: dict) -> dict:
    try:
        result = supabase.table(table).upsert(
            payload, on_conflict="member_id,trip_id"
        ).execute()
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    if not result.data:
        raise HTTPException(status_code=500, detail=f"Failed to save {table}")
    return result.data[0]


def fetch_member_preferences(supabase: Client, trip_id: str, member_id: str) -> dict:
    def fetch_one(table: str):
        try:
            result = (
                supabase.table(table).select("*").eq("trip_id", trip_id)
                .eq("member_id", member_id).execute()
            )
        except Exception:
            return None
        return result.data[0] if result.data else None

    return {
        "travel": fetch_one("preferences_travel"),
        "stay": fetch_one("preferences_stay"),
        "food": fetch_one("preferences_food"),
        "activities": fetch_one("preferences_activities"),
    }


@router.post("/travel")
def save_travel_preferences(
    preferences: PreferencesTravel,
    supabase: Client = Depends(get_supabase),
):
    return upsert_preferences(
        supabase, "preferences_travel", preferences.model_dump(mode="json")
    )


@router.post("/stay")
def save_stay_preferences(
    preferences: PreferencesStay,
    supabase: Client = Depends(get_supabase),
):
    return upsert_preferences(
        supabase, "preferences_stay", preferences.model_dump(mode="json")
    )


@router.post("/food")
def save_food_preferences(
    preferences: PreferencesFood,
    supabase: Client = Depends(get_supabase),
):
    return upsert_preferences(
        supabase, "preferences_food", preferences.model_dump(mode="json")
    )


@router.post("/activities")
def save_activities_preferences(
    preferences: PreferencesActivities,
    supabase: Client = Depends(get_supabase),
):
    return upsert_preferences(
        supabase, "preferences_activities", preferences.model_dump(mode="json")
    )


@router.get("/{trip_id}/{member_id}")
def get_member_preferences(
    trip_id: str,
    member_id: str,
    supabase: Client = Depends(get_supabase),
):
    return fetch_member_preferences(supabase, trip_id, member_id)
