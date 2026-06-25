"""Google Drive integration: OAuth helpers + CRM folder operations."""
from __future__ import annotations

import json
import os

# Google may return granular scopes that differ slightly from what we request;
# relax so the token exchange doesn't error on "scope has changed".
os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

import db  # Supabase layer (falls back to file storage when DB disabled)

TOKEN_KEY = "google_token"
from pathlib import Path

from dotenv import load_dotenv
import io

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
COMPANY_NAME = os.getenv("COMPANY_NAME", "companyname")
SHARED_DRIVE_ID = os.getenv("SHARED_DRIVE_ID", "").strip()

# Full Drive access + the granular scopes (to match the previous CRM and cover every operation).
SCOPES = [
    "https://www.googleapis.com/auth/drive",           # full: see/edit/create/delete/organise all files
    "https://www.googleapis.com/auth/drive.file",      # files created/opened with the app
    "https://www.googleapis.com/auth/drive.metadata",  # view/manage file metadata
    "https://www.googleapis.com/auth/drive.appdata",   # app's own config data
]

TOKEN_FILE = Path(__file__).parent / "token.json"
FOLDER_MIME = "application/vnd.google-apps.folder"

ROOT_FOLDER = f"{COMPANY_NAME}_crm"
# The five top-level folders under the CRM root (from the agreed blueprint).
TOP_FOLDERS = ["models", "templates", "tasks", "edit-review", "team-use"]


# ───────────────────────── OAuth ─────────────────────────
def _client_config():
    return {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }


def build_flow(state: str | None = None) -> Flow:
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=state)
    flow.redirect_uri = REDIRECT_URI
    return flow


def is_configured() -> bool:
    return bool(CLIENT_ID and CLIENT_SECRET)


def save_credentials(creds: Credentials) -> None:
    data = json.loads(creds.to_json())
    if db.enabled():
        db.set_setting(TOKEN_KEY, data)
    else:
        TOKEN_FILE.write_text(creds.to_json())


def _token_data() -> dict | None:
    if db.enabled():
        return db.get_setting(TOKEN_KEY)
    if TOKEN_FILE.exists():
        return json.loads(TOKEN_FILE.read_text())
    return None


def load_credentials() -> Credentials | None:
    data = _token_data()
    if not data:
        return None
    creds = Credentials.from_authorized_user_info(data, SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        save_credentials(creds)
    return creds


def disconnect() -> None:
    if db.enabled():
        db.delete_setting(TOKEN_KEY)
    elif TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


def is_connected() -> bool:
    return _token_data() is not None


def migrate_token_file_to_db() -> bool:
    """One-time: move an existing local token.json into Supabase."""
    if not db.enabled() or not TOKEN_FILE.exists():
        return False
    if db.get_setting(TOKEN_KEY):
        return False
    db.set_setting(TOKEN_KEY, json.loads(TOKEN_FILE.read_text()))
    return True


def _service():
    creds = load_credentials()
    if not creds:
        raise RuntimeError("Not connected to Google Drive.")
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def account_email() -> str | None:
    try:
        about = _service().about().get(fields="user(emailAddress)").execute()
        return about.get("user", {}).get("emailAddress")
    except Exception:
        return None


# ───────────────────── Drive primitives ─────────────────────
def _drive_id():
    return SHARED_DRIVE_ID or None


def _list(query: str):
    """List files/folders matching a query (Shared-Drive aware)."""
    service = _service()
    params = dict(
        q=query,
        fields="files(id,name,mimeType,modifiedTime,size,webViewLink)",
        pageSize=1000,
        orderBy="folder,name",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
    )
    drive_id = _drive_id()
    if drive_id:
        params.update(corpora="drive", driveId=drive_id)
    return service.files().list(**params).execute().get("files", [])


def find_or_create_folder(name: str, parent_id: str | None) -> dict:
    """Idempotently get-or-create a folder by name under a parent."""
    service = _service()
    safe = name.replace("'", "\\'")
    query = (
        f"name = '{safe}' and mimeType = '{FOLDER_MIME}' and trashed = false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"
    existing = _list(query)
    if existing:
        return existing[0]

    meta = {"name": name, "mimeType": FOLDER_MIME}
    if parent_id:
        meta["parents"] = [parent_id]
    return (
        service.files()
        .create(body=meta, fields="id,name,mimeType,webViewLink", supportsAllDrives=True)
        .execute()
    )


def list_children(folder_id: str) -> list[dict]:
    return _list(f"'{folder_id}' in parents and trashed = false")


def _list_all(query: str, fields: str) -> list[dict]:
    """Paginated list with custom fields (Shared-Drive aware)."""
    service = _service()
    items: list[dict] = []
    token = None
    drive_id = _drive_id()
    while True:
        params = dict(
            q=query, fields=f"nextPageToken, files({fields})", pageSize=1000,
            supportsAllDrives=True, includeItemsFromAllDrives=True, pageToken=token,
        )
        if drive_id:
            params.update(corpora="drive", driveId=drive_id)
        resp = service.files().list(**params).execute()
        items.extend(resp.get("files", []))
        token = resp.get("nextPageToken")
        if not token:
            break
    return items


def list_media() -> list[dict]:
    """All image/video files across the CRM Drive, enriched with the owning
    model name (derived from the folder path) and immediate folder name."""
    folders = _list_all(f"mimeType = '{FOLDER_MIME}' and trashed = false", "id,name,parents")
    fmap = {f["id"]: f for f in folders}

    # locate the models/ and gallery/ folders so we can categorize each file
    root = get_root()
    models_id = gallery_id = None
    if root:
        for f in folders:
            if root["id"] in (f.get("parents") or []):
                if f.get("name") == "models":
                    models_id = f["id"]
                elif f.get("name") == "gallery":
                    gallery_id = f["id"]

    media = _list_all(
        "(mimeType contains 'image/' or mimeType contains 'video/') and trashed = false",
        "id,name,mimeType,size,modifiedTime,parents",
    )
    out = []
    for m in media:
        parents = m.get("parents") or []
        parent = parents[0] if parents else None
        parent_folder = fmap.get(parent) if parent else None
        folder_name = parent_folder.get("name") if parent_folder else None
        kind = "Image" if (m.get("mimeType") or "").startswith("image/") else "Video"

        # walk up to the model folder (child of models/), capturing its id
        model = None
        model_folder_id = None
        node, guard = parent, 0
        while node and guard < 25:
            f = fmap.get(node)
            if not f:
                break
            if models_id and models_id in (f.get("parents") or []):
                model = f.get("name"); model_folder_id = node; break
            node = (f.get("parents") or [None])[0]
            guard += 1
        if model and "_" in model:
            model = model.rsplit("_", 1)[0]

        # derive a category from the folder structure (DB overrides this later)
        category = None
        if gallery_id and parent_folder and gallery_id in (parent_folder.get("parents") or []):
            category = parent_folder.get("name")  # gallery/<Category>/file
        elif model_folder_id:
            base = "Model Media" if parent == model_folder_id else "Task Content"
            category = f"{base} ({kind})"

        out.append({
            "id": m["id"], "name": m["name"], "mimeType": m.get("mimeType"),
            "size": m.get("size"), "modifiedTime": m.get("modifiedTime"),
            "model": model, "folder": folder_name, "category": category,
        })
    out.sort(key=lambda x: x.get("modifiedTime") or "", reverse=True)
    return out


def gallery_folder(category: str) -> str:
    """Ensure youtopia_crm/gallery/<Category>/ exists; return its id."""
    root = get_root()
    if not root:
        raise RuntimeError("CRM structure not initialised. Connect first.")
    gal = find_or_create_folder("gallery", root["id"])
    sub = find_or_create_folder(category or "Uncategorized", gal["id"])
    return sub["id"]


# ───────────────────── CRM structure ─────────────────────
def ensure_root_structure() -> dict:
    """Create (or find) the CRM root + its five top-level folders.

    Called automatically right after a successful connection.
    """
    drive_id = _drive_id()
    # In a Shared Drive the root's parent is the drive itself; in My Drive it's the account root.
    root = find_or_create_folder(ROOT_FOLDER, drive_id)
    children = {}
    for name in TOP_FOLDERS:
        children[name] = find_or_create_folder(name, root["id"])
    return {"root": root, "folders": children}


def get_root() -> dict | None:
    drive_id = _drive_id()
    safe = ROOT_FOLDER.replace("'", "\\'")
    query = f"name = '{safe}' and mimeType = '{FOLDER_MIME}' and trashed = false"
    if drive_id:
        query += f" and '{drive_id}' in parents"
    found = _list(query)
    return found[0] if found else None


def models_folder_id() -> str | None:
    root = get_root()
    if not root:
        return None
    found = _list(
        f"name = 'models' and mimeType = '{FOLDER_MIME}' and trashed = false and '{root['id']}' in parents"
    )
    return found[0]["id"] if found else None


def create_model_folder(model_name: str, user_id: str) -> dict:
    """Create models/<modelname_userID>/Root folder/  (per the blueprint)."""
    parent = models_folder_id()
    if not parent:
        raise RuntimeError("CRM structure not initialised. Connect first.")
    model_folder = find_or_create_folder(f"{model_name}_{user_id}", parent)
    root_inner = find_or_create_folder("Root folder", model_folder["id"])
    return {"model_folder": model_folder, "root_folder": root_inner}


# ───────────────────── per-content-type structure ─────────────────────
def task_subfolders(task_type: str | None, data: dict | None) -> list[str]:
    """Deliverable subfolders to create inside a task's upload folder, tailored
    to each content type. Empty list = a single flat task folder."""
    data = data or {}
    if task_type == "ppv_sequence":
        parts = data.get("parts") or []
        return ["Teasing"] + [f"Part {i + 1}" for i in range(len(parts))]
    if task_type == "detailed":
        media = data.get("media") or []
        return [f"Media {i + 1}" for i in range(len(media))]
    if task_type == "images_videos":
        return ["Images", "Videos"]
    if task_type == "ppv_long":
        return ["Video", "Pictures"]
    if task_type == "swipe":
        return ["Swipe"]
    # video, or anything else → single task folder, no subfolders
    return []


def build_task_structure(parent_id: str, task_title: str, task_type: str | None,
                         data: dict | None) -> dict:
    """Create <task_title>/ under parent + its type-specific subfolders.
    Returns the task folder dict and a {name: id} map of created subfolders."""
    task_folder = find_or_create_folder(task_title, parent_id)
    subs = {}
    for name in task_subfolders(task_type, data):
        subs[name] = find_or_create_folder(name, task_folder["id"])["id"]
    return {"task_folder": task_folder, "subfolders": subs}


# ───────────────────── file operations ─────────────────────
def create_subfolder(parent_id: str, name: str) -> dict:
    return find_or_create_folder(name, parent_id)


def upload_file(parent_id: str, filename: str, content: bytes, mime: str | None = None) -> dict:
    """Upload bytes as a new file into a Drive folder (used by the creator app)."""
    service = _service()
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime or "application/octet-stream",
                              resumable=False)
    meta = {"name": filename, "parents": [parent_id]}
    return (
        service.files()
        .create(body=meta, media_body=media,
                fields="id,name,mimeType,size,webViewLink,modifiedTime",
                supportsAllDrives=True)
        .execute()
    )


def move_file(file_id: str, new_parent_id: str) -> dict:
    service = _service()
    current = service.files().get(
        fileId=file_id, fields="parents", supportsAllDrives=True
    ).execute()
    prev_parents = ",".join(current.get("parents", []))
    return (
        service.files()
        .update(
            fileId=file_id,
            addParents=new_parent_id,
            removeParents=prev_parents,
            fields="id,name,parents",
            supportsAllDrives=True,
        )
        .execute()
    )


def get_file_meta(file_id: str) -> dict:
    service = _service()
    return service.files().get(
        fileId=file_id, fields="id,name,mimeType,size", supportsAllDrives=True
    ).execute()


def get_file_bytes(file_id: str) -> bytes:
    service = _service()
    return service.files().get_media(fileId=file_id).execute()


def copy_file(file_id: str, parent_id: str) -> dict:
    service = _service()
    return (
        service.files()
        .copy(fileId=file_id, body={"parents": [parent_id]},
              fields="id,name,parents", supportsAllDrives=True)
        .execute()
    )


def rename_file(file_id: str, name: str) -> dict:
    service = _service()
    return (
        service.files()
        .update(fileId=file_id, body={"name": name}, fields="id,name", supportsAllDrives=True)
        .execute()
    )


def trash_file(file_id: str) -> dict:
    """Move to Trash (recoverable) rather than hard-delete (safety, per spec)."""
    service = _service()
    return (
        service.files()
        .update(fileId=file_id, body={"trashed": True}, supportsAllDrives=True, fields="id,trashed")
        .execute()
    )
