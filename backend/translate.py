"""Task-content translation via the DeepL API.

Only the manager-authored free-text fields of a task are translated. Results are
cached per task + language by db.set_translation, keyed on a hash of the source
text so edits trigger a fresh translation. No third-party SDK — raw HTTPS like
supa_admin.py — so there's nothing extra to install on Railway.

DeepL is used (not an LLM) because task briefs are often explicit: a mechanical
MT engine translates that content literally without refusing or softening it,
and its PT/ES quality is excellent. Swapping engines means re-implementing only
translate_map(); flatten/apply/cache stay the same.
"""
import os
import json
import hashlib
import urllib.request
import urllib.error
import copy

DEEPL_KEY = os.getenv("DEEPL_API_KEY", "")

# DeepL free-tier keys end with ":fx" and use a separate host.
def _api_url() -> str:
    host = "api-free.deepl.com" if DEEPL_KEY.endswith(":fx") else "api.deepl.com"
    return f"https://{host}/v2/translate"

# Our app langs → DeepL target codes (Brazilian PT, Spanish).
DEEPL_TARGET = {"pt": "PT-BR", "es": "ES"}

# DeepL allows up to 50 texts per request.
_BATCH = 50


def enabled() -> bool:
    return bool(DEEPL_KEY)


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


def _deepl_batch(values: list, target: str) -> list:
    """Translate a single batch (<=50 texts) and return texts in the same order."""
    body = json.dumps({"text": values, "target_lang": target}).encode("utf-8")
    req = urllib.request.Request(
        _api_url(), data=body, method="POST",
        headers={
            "Authorization": f"DeepL-Auth-Key {DEEPL_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.loads(r.read().decode("utf-8"))
    return [t.get("text", "") for t in (data.get("translations") or [])]


def translate_map(texts: dict, lang: str) -> dict:
    """Translate {key: text} string values into the target language via DeepL."""
    items = {k: v for k, v in texts.items() if isinstance(v, str) and v.strip()}
    if not items or not enabled():
        return {}
    target = DEEPL_TARGET.get(lang)
    if not target:
        return {}
    keys = list(items.keys())
    values = [items[k] for k in keys]
    translated: list = []
    try:
        for i in range(0, len(values), _BATCH):
            translated.extend(_deepl_batch(values[i:i + _BATCH], target))
    except Exception as e:
        print("translate (deepl) warning:", e)
        return {}
    out: dict = {}
    for i, k in enumerate(keys):
        if i < len(translated) and isinstance(translated[i], str):
            out[k] = translated[i]
    return out
