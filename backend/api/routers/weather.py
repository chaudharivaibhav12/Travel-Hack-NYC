from datetime import date

from fastapi import APIRouter, HTTPException, Query

from services.weather import WeatherServiceError, fetch_weather

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("")
def get_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    start_date: date = Query(),
    end_date: date = Query(),
):
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date")
    if (end_date - start_date).days > 15:
        raise HTTPException(status_code=422, detail="Weather requests are limited to 16 days")
    try:
        return fetch_weather(latitude, longitude, start_date, end_date)
    except WeatherServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
