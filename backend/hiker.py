"""HikerAPI (Instagram data) client — server-side only.

The access key lives in the HIKER_API_KEY env var and is sent as the
`x-access-key` header. It is NEVER returned to the frontend. All calls go to
https://api.hikerapi.com. Uses the stdlib (urllib) to avoid extra dependencies.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("HIKER_API_KEY", "").strip()
BASE_URL = "https://api.hikerapi.com"
_TIMEOUT = 20  # seconds


class HikerError(Exception):
    """Raised for configuration or upstream API failures."""


def is_configured() -> bool:
    return bool(API_KEY)


def _get(path: str, params: dict) -> dict:
    """GET {BASE_URL}{path}?params with the access-key header. Returns parsed JSON."""
    if not API_KEY:
        raise HikerError("HIKER_API_KEY not set")
    url = f"{BASE_URL}{path}?" + urllib.parse.urlencode(params)
    # HikerAPI's gateway rejects the default "Python-urllib" User-Agent (403),
    # so send a normal one alongside the access-key header.
    req = urllib.request.Request(
        url,
        headers={"x-access-key": API_KEY, "User-Agent": "content-management-crm/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # Surface upstream status without leaking the key (never in the URL/headers echoed).
        raise HikerError(f"HikerAPI HTTP {e.code}") from None
    except (urllib.error.URLError, TimeoutError) as e:
        raise HikerError(f"HikerAPI unreachable: {e.reason if hasattr(e, 'reason') else e}") from None
    except json.JSONDecodeError:
        raise HikerError("HikerAPI returned a non-JSON response") from None


def instagram_user(username: str) -> dict:
    """Fetch a public Instagram profile by username. Returns a slim, safe dict.

    Only whitelisted fields are returned — no raw upstream dump, no key.
    """
    username = (username or "").strip().lstrip("@")
    if not username:
        raise HikerError("username required")
    data = _get("/v2/user/by/username", {"username": username})
    u = data.get("user") or {}
    if not u:
        raise HikerError("user not found")
    return {
        "pk": str(u.get("pk") or ""),
        "username": u.get("username") or username,
        "full_name": u.get("full_name") or "",
        "followers": int(u.get("follower_count") or 0),
        "following": int(u.get("following_count") or 0),
        "posts": int(u.get("media_count") or 0),
        "is_verified": bool(u.get("is_verified")),
        "is_private": bool(u.get("is_private")),
        "category": u.get("category") or "",
        "biography": u.get("biography") or "",
        "profile_pic_url": u.get("profile_pic_url") or "",
    }
