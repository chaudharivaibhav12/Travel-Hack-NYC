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

    # 2. Which providers are actually enabled?
    #
    # NOTE: supabase-py's sign_in_with_oauth() builds the authorize URL purely
    # client-side — it does NOT contact the server, so a URL coming back is no
    # evidence the provider is enabled. We must ask the server directly.
    settings = httpx.get(
        f"{SUPABASE_URL}/auth/v1/settings",
        headers={"apikey": SUPABASE_ANON_KEY},
        timeout=10,
    ).json()
    external = settings.get("external", {})
    enabled = sorted(k for k, v in external.items() if v)
    print(f"  [ok] enabled auth providers: {', '.join(enabled) or '(none)'}")

    # 3. Confirm Google specifically, by actually hitting the authorize endpoint
    redirect_to = os.getenv("REDIRECT_URL", "http://localhost:5173/auth/callback")
    probe = httpx.get(
        f"{SUPABASE_URL}/auth/v1/authorize",
        params={"provider": "google", "redirect_to": redirect_to},
        follow_redirects=False,
        timeout=10,
    )
    if probe.status_code == 400:
        print(f"  [WARN] Google OAuth is NOT enabled: {probe.json().get('msg')}")
        print("         Enable it at: Supabase dashboard -> Authentication -> Providers -> Google")
    elif probe.is_redirect and "google.com" in probe.headers.get("location", ""):
        print("  [ok] Google OAuth enabled — authorize redirects to Google")
    else:
        print(f"  [WARN] Unexpected authorize response: HTTP {probe.status_code}")

    # 4. Do the app's tables exist?
    for table in ("trips", "members"):
        r = httpx.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            params={"select": "*", "limit": 1},
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"},
            timeout=10,
        )
        if r.status_code == 200:
            print(f"  [ok] table '{table}' exists and is readable")
        else:
            print(f"  [WARN] table '{table}': HTTP {r.status_code} — {r.text[:120]}")

    print("\nReachability check done. Review any [WARN] lines above.")


if __name__ == "__main__":
    main()
