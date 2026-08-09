from fastapi import APIRouter, Depends, Query
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
def search_users(
    email: str = Query(..., min_length=3, max_length=254),
    supabase: Client = Depends(get_supabase),
):
    query = email.strip().lower()
    try:
        result = (
            supabase.table("profiles").select("user_id,email,display_name,avatar_url")
            .ilike("email", f"{query}%").limit(5).execute()
        )
    except Exception:
        return {"users": [], "demo_mode": True}
    return {
        "users": [
            {
                "id": row["user_id"],
                "email": row["email"],
                "name": row.get("display_name") or row["email"].split("@")[0],
                "avatar": row.get("avatar_url"),
            }
            for row in (result.data or [])
        ]
    }
