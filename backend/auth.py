"""Auth: verify Supabase JWTs and resolve a user's role (admin vs creator).

Until SUPABASE_URL + SUPABASE_ANON_KEY are configured, auth is DISABLED and every
request is treated as an admin (preserves the open behaviour, no lockout). Once the
keys are set, tokens are verified against Supabase and roles are enforced.
"""
from __future__ import annotations

import json
import os
import urllib.request

import db

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}
# VAs: scoped access to the Model Tasks section only (create/edit/delete tasks),
# no Drive / models / settings. Temporary — remove emails here to revoke.
VA_EMAILS = {e.strip().lower() for e in os.getenv("VA_EMAILS", "").split(",") if e.strip()}


def enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)


def verify_token(token: str) -> str | None:
    """Validate a Supabase access token; return the user's email or None."""
    if not token or not enabled():
        return None
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.load(r)
            return (data.get("email") or "").lower() or None
    except Exception:
        return None


def resolve(email: str | None) -> dict:
    """Map an email to a role. admin > va > creator (model.email) > none."""
    email = (email or "").lower()
    if email and email in ADMIN_EMAILS:
        return {"email": email, "role": "admin", "model_id": None, "name": "Admin"}
    if email and email in VA_EMAILS:
        return {"email": email, "role": "va", "model_id": None, "name": "VA"}
    if email:
        m = db.get_model_by_email(email)
        if m:
            return {"email": email, "role": "creator", "model_id": m["id"], "name": m["name"]}
    return {"email": email, "role": "none", "model_id": None, "name": email or "Guest"}


def user_from_header(authorization: str) -> dict:
    """Resolve the current user from an Authorization header.

    When auth is disabled, returns a synthetic admin so the app keeps working.
    """
    if not enabled():
        return {"email": None, "role": "admin", "model_id": None, "name": "Admin (auth off)"}
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    return resolve(verify_token(token))
