"""Supabase Auth admin API helpers (service-role key required).

Used by the Manage Users page to list / create / delete login accounts. Needs
SUPABASE_URL + SUPABASE_SERVICE_KEY. When unset, enabled() is False and the
endpoints surface a clear "not configured" message instead of failing.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def enabled() -> bool:
    return bool(SUPABASE_URL and SERVICE_KEY)


def _req(path: str, method: str = "GET", body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=data,
        method=method,
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read()
        return json.loads(raw) if raw else {}


def list_users() -> list[dict]:
    d = _req("/auth/v1/admin/users?per_page=200")
    if isinstance(d, list):
        return d
    return d.get("users", [])


def create_user(email: str, password: str) -> dict:
    return _req(
        "/auth/v1/admin/users",
        "POST",
        {"email": email, "password": password, "email_confirm": True},
    )


def delete_user(user_id: str) -> dict:
    return _req(f"/auth/v1/admin/users/{user_id}", "DELETE")
