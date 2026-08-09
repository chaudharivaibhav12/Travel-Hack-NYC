import os
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from api.dependencies import get_supabase
from api.routers.preferences import fetch_member_preferences
from services.stay22 import Stay22ServiceError, search_accommodations, unavailable_response

router = APIRouter(prefix="/trips", tags=["plans"])


def union_values(groups: list[list[str] | None]) -> list[str]:
    merged: list[str] = []
    for values in groups:
        for value in values or []:
            if value not in merged:
                merged.append(value)
    return merged


def mode(values: list[str | None]) -> str | None:
    present = [value for value in values if value]
    return Counter(present).most_common(1)[0][0] if present else None


def budget_consensus(minimums: list[int], maximums: list[int]) -> dict:
    if not minimums or not maximums:
        return {"min": None, "max": None}
    budget_minimum = max(minimums)
    budget_maximum = min(maximums)
    if budget_minimum > budget_maximum:
        budget_minimum = round(sum(minimums) / len(minimums))
        budget_maximum = round(sum(maximums) / len(maximums))
    return {"min": budget_minimum, "max": budget_maximum}


def flight_groups(travel_preferences: list[dict]) -> dict:
    dated = [
        (preference["name"], preference["departure_date"])
        for preference in travel_preferences
        if preference.get("departure_date")
    ]
    if not dated:
        return {"groups": [], "warnings": []}
    majority_date = Counter(date for _, date in dated).most_common(1)[0][0]
    grouped: dict[str, list[str]] = {}
    for name, departure_date in dated:
        grouped.setdefault(departure_date, []).append(name)
    return {
        "groups": [
            {"date": departure_date, "members": names}
            for departure_date, names in grouped.items()
        ],
        "warnings": [
            f"{name} departs {departure_date}, most of the group leaves {majority_date}"
            for name, departure_date in dated
            if departure_date != majority_date
        ],
    }


@router.get("/{trip_id}/plan")
def get_trip_plan(trip_id: str, supabase: Client = Depends(get_supabase)):
    trip_result = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
    if not trip_result.data:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = trip_result.data
    members = (
        supabase.table("members").select("*").eq("trip_id", trip_id).execute().data
        or []
    )

    member_rows = []
    for member in members:
        preferences = fetch_member_preferences(supabase, trip_id, member["id"])
        member_rows.append({
            "member_id": member["id"],
            "name": member.get("name") or "Traveler",
            **preferences,
        })

    stay_preferences = [row["stay"] for row in member_rows if row["stay"]]
    food_preferences = [row["food"] for row in member_rows if row["food"]]
    activity_preferences = [
        row["activities"] for row in member_rows if row["activities"]
    ]
    travel_preferences = [
        {**row["travel"], "name": row["name"]}
        for row in member_rows
        if row["travel"]
    ]
    stay_budget = budget_consensus(
        [item["budget_min"] for item in stay_preferences if item.get("budget_min") is not None],
        [item["budget_max"] for item in stay_preferences if item.get("budget_max") is not None],
    )
    consensus = {
        "stay": {
            "budget_min": stay_budget["min"],
            "budget_max": stay_budget["max"],
            "property_types": union_values([item.get("property_types") for item in stay_preferences]),
            "vibes": union_values([item.get("vibes") for item in stay_preferences]),
            "needs": union_values([item.get("needs") for item in stay_preferences]),
        },
        "food": {
            "cuisines": union_values([item.get("cuisines") for item in food_preferences]),
            "dietary": union_values([item.get("dietary") for item in food_preferences]),
            "meal_budget": mode([item.get("meal_budget") for item in food_preferences]),
        },
        "activities": {
            "interests": union_values([item.get("interests") for item in activity_preferences]),
            "pace": mode([item.get("pace") for item in activity_preferences]),
            "must_sees": [
                {"name": row["name"], "must_sees": row["activities"]["must_sees"]}
                for row in member_rows
                if row["activities"] and row["activities"].get("must_sees")
            ],
        },
        "flights": flight_groups(travel_preferences),
    }

    hotels = unavailable_response()
    if stay_budget["min"] is not None and trip.get("lat") is not None and trip.get("lng") is not None:
        try:
            hotels = search_accommodations(
                lat=trip["lat"], lng=trip["lng"], checkin=trip["checkin"],
                checkout=trip["checkout"], guests=max(len(members), 1), page_size=10,
                min_price=stay_budget["min"], max_price=stay_budget["max"],
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
