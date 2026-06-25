"""Task-content translation via the Anthropic (Claude) API.

Only the manager-authored free-text fields of a task are translated. Results are
cached per task + language by db.set_translation, keyed on a hash of the source
text so edits trigger a fresh translation. No third-party SDK — raw HTTPS like
supa_admin.py — so there's nothing extra to install on Railway.
"""
import os
import json
import hashlib
import urllib.request
import urllib.error
import copy

API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
API_URL = "https://api.anthropic.com/v1/messages"

LANG_NAMES = {
    "pt": "Brazilian Portuguese (pt-BR)",
    "es": "Latin American Spanish (es)",
}


def enabled() -> bool:
    return bool(API_KEY)


def hash_map(flat: dict) -> str:
    return hashlib.sha1(json.dumps(flat, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


# ── flatten / re-apply the translatable fields of a task ──
_SCALAR_FIELDS = ("title", "description", "manager_notes", "extra_tips", "captions")
_DATA_SCALARS = ("location", "teasing", "swipe")


def flatten_task(task: dict) -> dict:
    """Pull the translatable strings out of a task into a flat {key: text} dict."""
    out: dict = {}
    for k in _SCALAR_FIELDS:
        if isinstance(task.get(k), str) and task[k].strip():
            out[k] = task[k]
    data = task.get("data") or {}
    for k in _DATA_SCALARS:
        if isinstance(data.get(k), str) and data[k].strip():
            out[f"data.{k}"] = data[k]
    for i, o in enumerate(data.get("outfit") or []):
        if isinstance(o, str) and o.strip():
            out[f"data.outfit.{i}"] = o
    for i, p in enumerate(data.get("parts") or []):
        if isinstance(p, dict) and isinstance(p.get("desc"), str) and p["desc"].strip():
            out[f"data.parts.{i}.desc"] = p["desc"]
    for i, m in enumerate(data.get("media") or []):
        if isinstance(m, dict):
            for f in ("description", "outfit", "location"):
                if isinstance(m.get(f), str) and m[f].strip():
                    out[f"data.media.{i}.{f}"] = m[f]
    return out


def apply_translation(task: dict, tr: dict) -> dict:
    """Overlay translated strings back onto a deep copy of the task."""
    res = copy.deepcopy(task)
    data = res.get("data") or {}
    for key, val in (tr or {}).items():
        if not isinstance(val, str):
            continue
        parts = key.split(".")
        if len(parts) == 1:
            res[parts[0]] = val
        elif parts[0] == "data":
            if len(parts) == 2:
                data[parts[1]] = val
            elif parts[1] == "outfit" and len(parts) == 3:
                arr = data.get("outfit") or []
                idx = int(parts[2])
                if idx < len(arr):
                    arr[idx] = val
                data["outfit"] = arr
            elif parts[1] == "parts" and len(parts) == 4:
                arr = data.get("parts") or []
                idx = int(parts[2])
                if idx < len(arr) and isinstance(arr[idx], dict):
                    arr[idx][parts[3]] = val
                data["parts"] = arr
            elif parts[1] == "media" and len(parts) == 4:
                arr = data.get("media") or []
                idx = int(parts[2])
                if idx < len(arr) and isinstance(arr[idx], dict):
                    arr[idx][parts[3]] = val
                data["media"] = arr
    res["data"] = data
    return res


def _call(system: str, user: str) -> str:
    body = json.dumps({
        "model": MODEL,
        "max_tokens": 4000,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=body, method="POST",
        headers={
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.loads(r.read().decode("utf-8"))
    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    return "".join(parts)


def _parse_json(out: str) -> dict:
    out = (out or "").strip()
    if out.startswith("```"):
        out = out.strip("`")
        if out[:4].lower() == "json":
            out = out[4:]
        out = out.strip()
    try:
        return json.loads(out)
    except Exception:
        i, j = out.find("{"), out.rfind("}")
        if 0 <= i < j:
            try:
                return json.loads(out[i:j + 1])
            except Exception:
                return {}
        return {}


def translate_map(texts: dict, lang: str) -> dict:
    """Translate {key: text} string values into the target language via Claude."""
    items = {k: v for k, v in texts.items() if isinstance(v, str) and v.strip()}
    if not items or not enabled():
        return {}
    target = LANG_NAMES.get(lang, lang)
    system = (
        "You are a professional translator for a content-creator management agency. "
        f"Translate the JSON string VALUES into {target}. Keep the tone natural, warm, friendly and "
        "clear for the creator who will read it. Do NOT translate or change the JSON keys. "
        "Preserve emojis, line breaks, numbers, @handles, #hashtags, URLs and proper nouns. "
        "Return ONLY a valid JSON object with exactly the same keys and the translated values — no commentary, no code fences."
    )
    user = json.dumps(items, ensure_ascii=False)
    try:
        out = _call(system, user)
    except Exception as e:
        print("translate warning:", e)
        return {}
    result = _parse_json(out)
    # keep only known keys with string values
    return {k: v for k, v in result.items() if k in items and isinstance(v, str)}
