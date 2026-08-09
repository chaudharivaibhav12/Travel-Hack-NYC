from datetime import date

from fastapi import APIRouter, HTTPException, Query

from services.stay22 import Stay22ServiceError, search_accommodations, unavailable_response

router = APIRouter(prefix="/accommodations", tags=["accommodations"])


@router.get("")
def get_accommodations(
    address: str = Query(default=None), lat: float = Query(default=None, ge=-90, le=90),
    lng: float = Query(default=None, ge=-180, le=180), checkin: date = Query(),
    checkout: date = Query(), guests: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    min_price: float = Query(default=None, ge=0), max_price: float = Query(default=None, ge=0),
):
    if address is None and (lat is None or lng is None):
        raise HTTPException(status_code=422, detail="Provide either address or both lat and lng")
    if checkout <= checkin:
        raise HTTPException(status_code=422, detail="checkout must be after checkin")
    try:
        return search_accommodations(
            address=address, lat=lat, lng=lng, checkin=checkin, checkout=checkout,
            guests=guests, page_size=page_size, min_price=min_price, max_price=max_price,
        )
    except Stay22ServiceError:
        return unavailable_response()
