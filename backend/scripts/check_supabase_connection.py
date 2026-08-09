#!/usr/bin/env python3
"""
Live Supabase connectivity check.

Verifies (against a REAL Supabase project, using SUPABASE_URL /
SUPABASE_ANON_KEY from the environment or backend/.env):

  1. The project is reachable and the anon key is valid
     (GET /auth/v1/health with the apikey header).
  2. The Google OAuth provider is enabled and Supabase returns a real
     authorize URL for it — i.e. the same call GET /auth/google in main.py
     makes under the hood.

This does NOT complete a full browser login (that needs a human to click
"Allow" on Google's consent screen) — it confirms the pieces that /auth/google
depends on are correctly configured and reachable.

Usage:
    cd backend
    source .venv/bin/activate   # or: pip install -r requirements-dev.txt
    python scripts/check_supabase_connection.py
"""
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        fail(
            "SUPABASE_URL / SUPABASE_ANON_KEY not set. "
            "Put real values in backend/.env (see .env.example) and re-run."
        )

    print(f"Checking Supabase project: {SUPABASE_URL}")

    # 1. Reachability + key validity
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/auth/v1/health",
            headers={"apikey": SUPABASE_ANON_KEY},
            timeout=10,
        )
    except httpx.HTTPError as e:
        fail(f"Could not reach {SUPABASE_URL}: {e}")

    if resp.status_code != 200:
        fail(f"Auth health check returned HTTP {resp.status_code}: {resp.text}")
    print(f"  [ok] project reachable, GoTrue health: {resp.json()}")

    # 2. Google OAuth provider enabled — same call /auth/google makes
    from supabase import create_client

    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        oauth_resp = client.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {"redirect_to": os.getenv("REDIRECT_URL", "http://localhost:5173/auth/callback")},
        })
    except Exception as e:
        fail(f"sign_in_with_oauth(google) raised: {e}")

    url = getattr(oauth_resp, "url", None)
    if not url or "provider=google" not in url:
        fail(f"Did not get a valid Google authorize URL back. Got: {url!r}")

    print(f"  [ok] Google OAuth authorize URL: {url}")
    print("\nAll checks passed. /auth/google is correctly wired to this Supabase project.")
    print("(Full end-to-end login still requires a human to complete Google's consent screen in a browser.)")


if __name__ == "__main__":
    main()
