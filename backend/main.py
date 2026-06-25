"""CRM Drive backend — FastAPI app exposing Google Drive connection + folder ops."""
import os
from pathlib import Path

from fastapi import Body, Depends, FastAPI, File, Header, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import auth
import db
import drive
import supa_admin

app = FastAPI(title="Content Management CRM — Drive Backend")


@app.on_event("startup")
def _startup():
    if db.enabled():
        try:
            db.init_schema()
            migrated = drive.migrate_token_file_to_db()
            print("Supabase connected; schema ready." + (" Token migrated from file." if migrated else ""))
        except Exception as e:
            print("Supabase init error:", e)
    else:
        print("Supabase not configured (DATABASE_URL empty) — using local token file.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()

# in-memory OAuth state (single-user agency account for now)
_oauth_state = {"value": None}


# ───────────────────── auth dependencies ─────────────────────
def current_user(authorization: str = Header(default="")) -> dict:
    user = auth.user_from_header(authorization)
    if not user or user["role"] == "none":
        raise HTTPException(401, "Not authenticated")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Admins only")
    return user


def require_tasks(user: dict = Depends(current_user)) -> dict:
    """Model Tasks section: admins and VAs only (VAs are scoped to tasks)."""
    if user["role"] not in ("admin", "va"):
        raise HTTPException(403, "Not allowed")
    return user


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


# ───────────────────── OAuth flow ─────────────────────
@app.get("/auth/google/login")
def google_login():
    if not drive.is_configured():
        raise HTTPException(500, "Google OAuth not configured. Set GOOGLE_CLIENT_ID / SECRET in .env")
    flow = drive.build_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    _oauth_state["value"] = state
    return RedirectResponse(auth_url)


@app.get("/auth/google/callback")
def google_callback(code: str = "", state: str = "", error: str = ""):
    if error:
        return RedirectResponse(f"/?error={error}")
    flow = drive.build_flow(state=_oauth_state.get("value"))
    flow.fetch_token(code=code)
    drive.save_credentials(flow.credentials)
    # Auto-create the CRM root structure on first connect.
    try:
        drive.ensure_root_structure()
    except Exception as e:  # surfaced to the UI, connection still succeeds
        print("structure init warning:", e)
    dest = FRONTEND_URL or "/"
    sep = "&" if "?" in dest else "?"
    return RedirectResponse(f"{dest}{sep}connected=1")


@app.get("/api/status")
def status():
    db_ok = db.ping() if db.enabled() else None
    if not drive.is_configured():
        return {"configured": False, "connected": False, "db": db_ok}
    if not drive.is_connected():
        return {"configured": True, "connected": False}
    root = None
    try:
        root = drive.get_root()
    except Exception as e:
        return {"configured": True, "connected": True, "error": str(e)}
    return {
        "configured": True,
        "connected": True,
        "db": db_ok,
        "email": drive.account_email(),
        "company": drive.COMPANY_NAME,
        "root_folder": drive.ROOT_FOLDER,
        "root": root,
        "shared_drive": bool(drive.SHARED_DRIVE_ID),
    }


@app.post("/api/disconnect")
def api_disconnect(user: dict = Depends(require_admin)):
    drive.disconnect()
    return {"connected": False}


# ───────────────────── CRM structure / folders ─────────────────────
@app.post("/api/setup")
def setup(user: dict = Depends(require_admin)):
    _require_connection()
    return drive.ensure_root_structure()


@app.get("/api/tree")
def tree(user: dict = Depends(require_admin)):
    """Return the CRM root and its top-level folders (with child counts)."""
    _require_connection()
    root = drive.get_root()
    if not root:
        return {"root": None, "folders": []}
    folders = drive.list_children(root["id"])
    out = []
    for f in folders:
        children = drive.list_children(f["id"]) if f.get("mimeType") == drive.FOLDER_MIME else []
        out.append({**f, "child_count": len(children)})
    return {"root": root, "folders": out}


@app.get("/api/folder/{folder_id}")
def folder_contents(folder_id: str, user: dict = Depends(current_user)):
    _require_connection()
    return {"items": drive.list_children(folder_id)}


@app.post("/api/model/folder")
def model_folder(name: str = Query(...), user_id: str = Query(...), user: dict = Depends(require_admin)):
    """Create models/<name_userID>/Root folder/ — the registration trigger."""
    _require_connection()
    return drive.create_model_folder(name, user_id)


@app.post("/api/folder/{parent_id}/subfolder")
def subfolder(parent_id: str, name: str = Query(...), user: dict = Depends(current_user)):
    _require_connection()
    return drive.create_subfolder(parent_id, name)


@app.post("/api/folder/{folder_id}/upload")
async def upload(folder_id: str, file: UploadFile = File(...), user: dict = Depends(current_user)):
    """Creator uploads a deliverable into a task's Drive folder/subfolder."""
    _require_connection()
    content = await file.read()
    return drive.upload_file(folder_id, file.filename, content, file.content_type)


@app.post("/api/file/{file_id}/move")
def move(file_id: str, dest: str = Query(...), user: dict = Depends(require_admin)):
    _require_connection()
    return drive.move_file(file_id, dest)


@app.get("/api/file/{file_id}/content")
def file_content(file_id: str, download: int = 0):
    _require_connection()
    meta = drive.get_file_meta(file_id)
    data = drive.get_file_bytes(file_id)
    headers = {}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{meta.get("name", "file")}"'
    return Response(content=data, media_type=meta.get("mimeType", "application/octet-stream"), headers=headers)


@app.post("/api/file/{file_id}/copy")
def copy(file_id: str, dest: str = Query(...), user: dict = Depends(require_admin)):
    _require_connection()
    return drive.copy_file(file_id, dest)


@app.post("/api/file/{file_id}/rename")
def rename(file_id: str, name: str = Query(...), user: dict = Depends(require_admin)):
    _require_connection()
    return drive.rename_file(file_id, name)


@app.post("/api/file/{file_id}/trash")
def trash(file_id: str, user: dict = Depends(require_admin)):
    _require_connection()
    return drive.trash_file(file_id)


def _require_connection():
    if not drive.is_connected():
        raise HTTPException(401, "Not connected to Google Drive.")


@app.get("/api/me")
def me(authorization: str = Header(default="")):
    """Who am I? Drives the frontend login gate + role-based UI."""
    return auth.user_from_header(authorization)


def _require_db():
    if not db.enabled():
        raise HTTPException(400, "Supabase not configured (set DATABASE_URL).")


# ───────────────────── Models (DB-backed) ─────────────────────
@app.get("/api/models")
def models_list(user: dict = Depends(require_tasks)):
    if not db.enabled():
        return []
    return db.list_models()


@app.post("/api/models")
def models_create(payload: dict = Body(...), user: dict = Depends(require_admin)):
    """Manually register a model: writes to Supabase + auto-creates its Drive folder."""
    _require_db()
    if not payload.get("name"):
        raise HTTPException(400, "name is required")
    model = db.create_model(payload)
    if drive.is_connected():
        try:
            short = model["id"].replace("-", "")[:8]
            res = drive.create_model_folder(model["name"], short)
            model = db.update_model(model["id"], {"drive_folder_id": res["model_folder"]["id"]})
        except Exception as e:
            print("model folder create warning:", e)
    return model


@app.get("/api/models/{model_id}/tasks")
def model_tasks(model_id: str, user: dict = Depends(current_user)):
    """Tasks assigned to a model — powers the creator app view.
    Creators may only read their own model's tasks; admins read any."""
    if user["role"] not in ("admin", "va") and user.get("model_id") != model_id:
        raise HTTPException(403, "Not your tasks")
    if not db.enabled():
        return []
    return db.list_model_tasks(model_id)


@app.post("/api/models/{model_id}/approve")
def models_approve(model_id: str, user: dict = Depends(require_admin)):
    _require_db()
    return db.update_model(model_id, {"status": "Approved"})


@app.post("/api/models/{model_id}/setup-folder")
def models_setup_folder(model_id: str, user: dict = Depends(require_admin)):
    _require_db()
    _require_connection()
    m = db.get_model(model_id)
    if not m:
        raise HTTPException(404, "model not found")
    short = m["id"].replace("-", "")[:8]
    res = drive.create_model_folder(m["name"], short)
    return db.update_model(model_id, {"drive_folder_id": res["model_folder"]["id"]})


@app.patch("/api/models/{model_id}")
def models_update(model_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    allowed = {k: v for k, v in payload.items() if k in
               ("name", "legal_name", "username", "email", "location", "status", "progress")}
    if not allowed:
        raise HTTPException(400, "no updatable fields")
    # keep the Drive folder name in sync when the model is renamed
    if "name" in allowed:
        m = db.get_model(model_id)
        if m and m.get("drive_folder_id") and drive.is_connected():
            try:
                short = model_id.replace("-", "")[:8]
                drive.rename_file(m["drive_folder_id"], f"{allowed['name']}_{short}")
            except Exception as e:
                print("folder rename warning:", e)
    return db.update_model(model_id, allowed)


@app.delete("/api/models/{model_id}")
def models_delete(model_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_model(model_id)
    return {"deleted": True}


# ───────────────────── Tasks (DB-backed) ─────────────────────
@app.get("/api/tasks")
def tasks_list(templates: int = 0, user: dict = Depends(require_tasks)):
    if not db.enabled():
        return []
    return db.list_tasks(templates=bool(templates))


@app.post("/api/tasks")
def tasks_create(payload: dict = Body(...), user: dict = Depends(require_tasks)):
    """Create a task (or template). For real tasks, auto-create the upload folder
    inside each assigned model's Drive (the registration trigger of content)."""
    _require_db()
    if not payload.get("title"):
        raise HTTPException(400, "title is required")
    assignees = payload.get("assignees") or []
    pdata = payload.get("data") or {}
    targets = pdata.get("targetFolders") or {}
    task = db.create_task(payload, assignees)

    if drive.is_connected() and not task["is_template"]:
        for mid in assignees:
            m = db.get_model(mid)
            if not m or not m.get("drive_folder_id"):
                continue
            try:
                parent = targets.get(mid)
                if not parent:
                    parent = drive.find_or_create_folder("Root folder", m["drive_folder_id"])["id"]
                # Build <task>/ plus the content-type-specific subfolders
                # (e.g. PPV sequence → Teasing + Part 1..N).
                res = drive.build_task_structure(parent, task["title"], task["type"], pdata)
                db.set_assignee_folder(task["id"], mid, res["task_folder"]["id"])
            except Exception as e:
                print("task upload-folder warning:", e)
    return task


@app.post("/api/tasks/{task_id}/submit")
def task_submit(task_id: str, model_id: str = Query(...), user: dict = Depends(current_user)):
    """Creator submits their uploaded content for manager review (own model only)."""
    if user["role"] != "admin" and user.get("model_id") != model_id:
        raise HTTPException(403, "Not your task")
    _require_db()
    db.submit_assignee(task_id, model_id)
    return {"status": "submitted"}


@app.post("/api/tasks/{task_id}/review")
def task_review(task_id: str, payload: dict = Body(...), user: dict = Depends(require_tasks)):
    """Manager approves or requests changes (per-slot notes in `review`)."""
    _require_db()
    mid = payload.get("model_id")
    if not mid:
        raise HTTPException(400, "model_id is required")
    status = payload.get("status") or "approved"
    db.review_assignee(task_id, mid, status, payload.get("review") or {})
    return {"status": status}


@app.delete("/api/tasks/{task_id}")
def tasks_delete(task_id: str, user: dict = Depends(require_tasks)):
    _require_db()
    db.delete_task(task_id)
    return {"deleted": True}


# ───────────────────── Statistics ─────────────────────
@app.get("/api/stats")
def stats(user: dict = Depends(require_admin)):
    if not db.enabled():
        raise HTTPException(400, "Database not configured")
    return db.stats()


# ───────────────────── Manage Users ─────────────────────
def _role_of(email: str, roles: dict, model_emails: set) -> str:
    email = (email or "").lower()
    if email in auth.ADMIN_EMAILS or roles.get(email) == "admin":
        return "admin"
    if email in auth.VA_EMAILS or roles.get(email) == "va":
        return "va"
    if email in model_emails:
        return "creator"
    return "none"


@app.get("/api/users")
def users_list(user: dict = Depends(require_admin)):
    if not supa_admin.enabled():
        raise HTTPException(400, "User management needs SUPABASE_URL + SUPABASE_SERVICE_KEY on the backend.")
    roles = db.get_roles() if db.enabled() else {}
    models = {(m.get("email") or "").lower(): m for m in (db.list_models() if db.enabled() else []) if m.get("email")}
    out = []
    try:
        users = supa_admin.list_users()
    except Exception as e:
        raise HTTPException(502, f"Could not reach Supabase: {e}")
    for u in users:
        email = (u.get("email") or "").lower()
        role = _role_of(email, roles, set(models))
        out.append({
            "id": u.get("id"),
            "email": u.get("email"),
            "role": role,
            # env-granted roles can't be changed from the UI (they live in Railway)
            "locked": email in auth.ADMIN_EMAILS or email in auth.VA_EMAILS,
            "is_self": email == (user.get("email") or "").lower(),
            "model": models.get(email, {}).get("name"),
            "created_at": u.get("created_at"),
            "last_sign_in_at": u.get("last_sign_in_at"),
        })
    order = {"admin": 0, "va": 1, "creator": 2, "none": 3}
    out.sort(key=lambda x: (order.get(x["role"], 9), (x["email"] or "")))
    return out


@app.post("/api/users")
def users_create(payload: dict = Body(...), user: dict = Depends(require_admin)):
    if not supa_admin.enabled():
        raise HTTPException(400, "User management needs SUPABASE_URL + SUPABASE_SERVICE_KEY on the backend.")
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    role = payload.get("role") or "va"
    if not email or not password:
        raise HTTPException(400, "Email and password are required.")
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    try:
        created = supa_admin.create_user(email, password)
    except Exception as e:
        raise HTTPException(400, f"Could not create the account (it may already exist): {e}")
    if db.enabled():
        db.set_role(email, role)
    return {"id": created.get("id"), "email": email, "role": role}


@app.patch("/api/users/role")
def users_set_role(payload: dict = Body(...), user: dict = Depends(require_admin)):
    email = (payload.get("email") or "").strip().lower()
    role = payload.get("role")
    if not email:
        raise HTTPException(400, "Email is required.")
    if email in auth.ADMIN_EMAILS or email in auth.VA_EMAILS:
        raise HTTPException(400, "This account's role is set on the server (Railway) and can't be changed here.")
    if not db.enabled():
        raise HTTPException(400, "Database not configured")
    db.set_role(email, role)
    return {"email": email, "role": role}


@app.delete("/api/users/{user_id}")
def users_delete(user_id: str, email: str = Query(default=""), user: dict = Depends(require_admin)):
    if not supa_admin.enabled():
        raise HTTPException(400, "User management needs SUPABASE_URL + SUPABASE_SERVICE_KEY on the backend.")
    em = (email or "").lower()
    if em and em == (user.get("email") or "").lower():
        raise HTTPException(400, "You can't delete your own account.")
    if em and (em in auth.ADMIN_EMAILS or em in auth.VA_EMAILS):
        raise HTTPException(400, "This account is protected by the server config (Railway).")
    try:
        supa_admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(400, f"Could not delete the account: {e}")
    if em and db.enabled():
        db.set_role(em, None)
    return {"deleted": True}


# ───────────────────── Kanban (Office app) ─────────────────────
@app.get("/api/kanban/boards")
def kanban_boards(user: dict = Depends(require_admin)):
    _require_db()
    return db.list_boards()


@app.post("/api/kanban/boards")
def kanban_board_create(payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Board title is required.")
    return db.create_board(title, payload.get("description"))


@app.get("/api/kanban/boards/{board_id}")
def kanban_board_get(board_id: str, user: dict = Depends(require_admin)):
    _require_db()
    board = db.get_board(board_id)
    if not board:
        raise HTTPException(404, "Board not found")
    return board


@app.delete("/api/kanban/boards/{board_id}")
def kanban_board_delete(board_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_board(board_id)
    return {"deleted": True}


@app.post("/api/kanban/boards/{board_id}/lists")
def kanban_list_create(board_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "List title is required.")
    return db.create_list(board_id, title)


@app.delete("/api/kanban/lists/{list_id}")
def kanban_list_delete(list_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_list(list_id)
    return {"deleted": True}


@app.post("/api/kanban/lists/{list_id}/cards")
def kanban_card_create(list_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Card title is required.")
    return db.create_card(list_id, title, payload.get("description"))


@app.delete("/api/kanban/cards/{card_id}")
def kanban_card_delete(card_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_card(card_id)
    return {"deleted": True}


@app.post("/api/kanban/cards/{card_id}/move")
def kanban_card_move(card_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    list_id = payload.get("list_id")
    if not list_id:
        raise HTTPException(400, "list_id is required.")
    db.move_card(card_id, list_id, int(payload.get("position") or 0))
    return {"moved": True}


# ───────────────────── Todo (Office app) ─────────────────────
@app.get("/api/todo/lists")
def todo_lists(user: dict = Depends(require_admin)):
    _require_db()
    return db.list_todo_lists()


@app.post("/api/todo/lists")
def todo_list_create(payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "List title is required.")
    return db.create_todo_list(title, payload.get("description"), payload.get("color"))


@app.get("/api/todo/lists/{list_id}")
def todo_list_get(list_id: str, user: dict = Depends(require_admin)):
    _require_db()
    tl = db.get_todo_list(list_id)
    if not tl:
        raise HTTPException(404, "List not found")
    return tl


@app.delete("/api/todo/lists/{list_id}")
def todo_list_delete(list_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_todo_list(list_id)
    return {"deleted": True}


@app.post("/api/todo/lists/{list_id}/tasks")
def todo_task_create(list_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Task title is required.")
    return db.create_todo_task(list_id, title)


@app.patch("/api/todo/tasks/{task_id}")
def todo_task_update(task_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    db.update_todo_task(task_id, payload)
    return {"updated": True}


@app.delete("/api/todo/tasks/{task_id}")
def todo_task_delete(task_id: str, user: dict = Depends(require_admin)):
    _require_db()
    db.delete_todo_task(task_id)
    return {"deleted": True}


# ───────────────────── Gallery (media library) ─────────────────────
@app.get("/api/gallery")
def gallery(user: dict = Depends(require_admin)):
    if not drive.is_connected():
        raise HTTPException(400, "Google Drive is not connected.")
    try:
        items = drive.list_media()
    except Exception as e:
        raise HTTPException(400, f"Could not load gallery: {e}")
    if db.enabled():
        mmap = db.media_map()
        for it in items:
            row = mmap.get(it["id"])
            if row and row.get("category"):
                it["category"] = row["category"]
    return items


@app.post("/api/gallery/upload")
async def gallery_upload(category: str = Query(...), file: UploadFile = File(...),
                         user: dict = Depends(require_admin)):
    if not drive.is_connected():
        raise HTTPException(400, "Google Drive is not connected.")
    folder = drive.gallery_folder(category)
    content = await file.read()
    res = drive.upload_file(folder, file.filename, content, file.content_type)
    if db.enabled():
        db.set_media(res["id"], category, user.get("email"))
    return res


@app.post("/api/gallery/{file_id}/category")
def gallery_set_category(file_id: str, payload: dict = Body(...), user: dict = Depends(require_admin)):
    _require_db()
    db.set_media(file_id, payload.get("category"), user.get("email"))
    return {"ok": True}


# serve any other static assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
