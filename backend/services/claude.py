import json
import os
from datetime import date, timedelta

from pydantic import BaseModel, Field, ValidationError


class ItineraryItem(BaseModel):
    time_period: str
    title: str
    location: str
    description: str
    rationale: str
    estimated_cost: str | None = None
    indoor_backup: str | None = None


class ItineraryDay(BaseModel):
    date: str
    title: str
    items: list[ItineraryItem] = Field(min_length=1)


class GeneratedItinerary(BaseModel):
    summary: str
    days: list[ItineraryDay] = Field(min_length=1)
    practical_tips: list[str] = Field(default_factory=list)
    generated_by: str


class ClaudeItineraryError(RuntimeError):
    pass


def _extract_json(text: str) -> dict:
    content = text.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        return json.loads(content)
    except json.JSONDecodeError as error:
        raise ClaudeItineraryError("Claude returned invalid JSON") from error


def generate_with_claude(context: dict) -> GeneratedItinerary:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ClaudeItineraryError("ANTHROPIC_API_KEY is not configured")

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
            max_tokens=5000,
            system=(
                "You are a careful travel planner. Return only valid JSON. "
                "Never invent live availability, booking URLs, exact prices, or weather. "
                "Use only hotel and weather facts supplied in the context."
            ),
            messages=[{
                "role": "user",
                "content": (
                    "Build a realistic day-by-day itinerary from this context:\n"
                    f"{json.dumps(context, default=str)}\n\n"
                    "Return this exact JSON shape: {\"summary\": string, \"days\": "
                    "[{\"date\": \"YYYY-MM-DD\", \"title\": string, \"items\": "
                    "[{\"time_period\": string, \"title\": string, \"location\": string, "
                    "\"description\": string, \"rationale\": string, "
                    "\"estimated_cost\": string|null, \"indoor_backup\": string|null}]}], "
                    "\"practical_tips\": [string]}. Include every trip day, respect dietary "
                    "needs and pace, and explain how choices match the traveler preferences."
                ),
            }],
        )
        text_blocks = [block.text for block in response.content if getattr(block, "type", None) == "text"]
        payload = _extract_json("".join(text_blocks))
        payload["generated_by"] = "claude"
        return GeneratedItinerary.model_validate(payload)
    except (ClaudeItineraryError, ValidationError):
        raise
    except Exception as error:
        raise ClaudeItineraryError(str(error)) from error


def generate_fallback(context: dict) -> GeneratedItinerary:
    trip = context["trip"]
    consensus = context["consensus"]
    start = date.fromisoformat(trip["checkin"])
    end = date.fromisoformat(trip["checkout"])
    interests = consensus["activities"]["interests"] or ["local highlights"]
    cuisines = consensus["food"]["cuisines"] or ["local cuisine"]
    must_sees = consensus["activities"]["must_sees"]
    must_see = must_sees[0]["must_sees"] if must_sees else None
    days = []
    current = start
    index = 0
    while current < end:
        interest = interests[index % len(interests)]
        highlight = must_see if index == 0 and must_see else f"{trip['event_location']} {interest} district"
        days.append(ItineraryDay(
            date=current.isoformat(),
            title=f"Explore {trip['event_location']}",
            items=[
                ItineraryItem(
                    time_period="Morning",
                    title=f"Discover {highlight}",
                    location=highlight,
                    description=f"Spend the morning exploring {interest} at a comfortable pace.",
                    rationale=f"Matches the selected {interest} interest.",
                    indoor_backup="Visit a nearby museum or covered market.",
                ),
                ItineraryItem(
                    time_period="Afternoon",
                    title="Flexible neighborhood exploration",
                    location=trip["event_location"],
                    description="Leave room for local recommendations and travel time.",
                    rationale=f"Keeps the day aligned with the {consensus['activities']['pace'] or 'moderate'} pace preference.",
                    indoor_backup="Choose a nearby indoor cultural venue.",
                ),
                ItineraryItem(
                    time_period="Evening",
                    title=f"Try {cuisines[index % len(cuisines)]}",
                    location=trip["event_location"],
                    description="Choose a well-reviewed restaurant that confirms all dietary requirements.",
                    rationale="Matches the saved food preferences without inventing a reservation.",
                ),
            ],
        ))
        current += timedelta(days=1)
        index += 1
    return GeneratedItinerary(
        summary=f"A preference-led itinerary for {trip['event_location']}.",
        days=days,
        practical_tips=["Confirm opening hours and reservations before leaving.", "Recheck weather each morning."],
        generated_by="fallback",
    )


def generate_itinerary(context: dict) -> GeneratedItinerary:
    try:
        return generate_with_claude(context)
    except ClaudeItineraryError:
        return generate_fallback(context)
