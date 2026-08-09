import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from supabase import Client

from api.dependencies import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenRequest(BaseModel):
    access_token: str


@router.get("/google")
def google_login(supabase: Client = Depends(get_supabase)):
    response = supabase.auth.sign_in_with_oauth({
        "provider": "google",
        "options": {"redirect_to": os.getenv("REDIRECT_URL", "http://localhost:5173/auth/callback")},
    })
    return RedirectResponse(url=response.url)


@router.get("/callback")
def auth_callback(error: str = None):
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    return RedirectResponse(url=os.getenv("FRONTEND_URL", "http://localhost:5173"))


@router.post("/verify")
def verify_token(body: TokenRequest, supabase: Client = Depends(get_supabase)):
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
    except Exception as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


@router.post("/logout")
def logout(body: TokenRequest, supabase: Client = Depends(get_supabase)):
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
