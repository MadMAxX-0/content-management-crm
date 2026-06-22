"""Supabase (Postgres) layer: schema bootstrap + key/value settings + helpers.

Uses a direct Postgres connection (SQLAlchemy) so the backend can create its own
schema and read/write data. When DATABASE_URL is unset the app falls back to the
local token file (so local dev still works without Supabase).
"""
from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
_engine = None


def enabled() -> bool:
    return bool(DATABASE_URL)


def engine():
    global _engine
    if _engine is None:
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        _engine = create_engine(url, pool_pre_ping=True, future=True)
    return _engine


SCHEMA = """
create table if not exists app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  username text,
  email text,
  location text,
  status text default 'Pending',
  progress int default 0,
  drive_folder_id text,
  created_at timestamptz default now()
);
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role text default 'Model',
  model_id uuid references models(id) on delete set null,
  created_at timestamptz default now()
);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text,
  status text default 'todo',
  priority text default 'medium',
  due_date date,
  drive_folder_id text,
  created_at timestamptz default now()
);
create table if not exists task_assignees (
  task_id uuid references tasks(id) on delete cascade,
  model_id uuid references models(id) on delete cascade,
  upload_folder_id text,
  primary key (task_id, model_id)
);
alter table tasks add column if not exists tags jsonb default '[]'::jsonb;
alter table tasks add column if not exists manager_notes text;
alter table tasks add column if not exists extra_tips text;
alter table tasks add column if not exists captions text;
alter table tasks add column if not exists is_template boolean default false;
alter table tasks add column if not exists recurring boolean default false;
alter table tasks add column if not exists recurrence text;
alter table tasks add column if not exists upload_type text default 'google_drive';
alter table tasks add column if not exists data jsonb default '{}'::jsonb;
alter table task_assignees add column if not exists upload_folder_id text;
alter table task_assignees add column if not exists status text default 'todo';
alter table task_assignees add column if not exists submitted_at timestamptz;
alter table task_assignees add column if not exists reviewed_at timestamptz;
alter table task_assignees add column if not exists review jsonb default '{}'::jsonb;
"""


def init_schema() -> None:
    with engine().begin() as c:
        for stmt in SCHEMA.split(";"):
            s = stmt.strip()
            if s:
                c.execute(text(s))


# ── key/value settings (used for the Google token) ──
def get_setting(key: str):
    with engine().connect() as c:
        row = c.execute(text("select value from app_settings where key=:k"), {"k": key}).fetchone()
        return row[0] if row else None


def set_setting(key: str, value) -> None:
    with engine().begin() as c:
        c.execute(
            text(
                "insert into app_settings(key, value, updated_at) "
                "values (:k, cast(:v as jsonb), now()) "
                "on conflict (key) do update set value = excluded.value, updated_at = now()"
            ),
            {"k": key, "v": json.dumps(value)},
        )


def delete_setting(key: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from app_settings where key=:k"), {"k": key})


MODEL_COLS = (
    "id::text, name, legal_name, username, email, location, status, progress, "
    "drive_folder_id, created_at"
)


def list_models() -> list[dict]:
    with engine().connect() as c:
        rows = c.execute(text(f"select {MODEL_COLS} from models order by created_at desc")).mappings().all()
        return [dict(r) for r in rows]


def get_model(model_id: str) -> dict | None:
    with engine().connect() as c:
        row = c.execute(text(f"select {MODEL_COLS} from models where id = :id"), {"id": model_id}).mappings().first()
        return dict(row) if row else None


def create_model(d: dict) -> dict:
    with engine().begin() as c:
        row = c.execute(
            text(
                "insert into models (name, legal_name, username, email, location) "
                "values (:name, :legal_name, :username, :email, :location) "
                f"returning {MODEL_COLS}"
            ),
            {k: d.get(k) for k in ("name", "legal_name", "username", "email", "location")},
        ).mappings().one()
        return dict(row)


def update_model(model_id: str, fields: dict) -> dict:
    sets = ", ".join(f"{k} = :{k}" for k in fields)
    with engine().begin() as c:
        row = c.execute(
            text(f"update models set {sets} where id = :id returning {MODEL_COLS}"),
            {**fields, "id": model_id},
        ).mappings().one()
        return dict(row)


def delete_model(model_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from models where id = :id"), {"id": model_id})


# ───────────────────── Tasks ─────────────────────
TASK_COLS = (
    "id::text, title, description, type, status, priority, due_date, tags, manager_notes, "
    "extra_tips, captions, is_template, recurring, recurrence, upload_type, data, created_at"
)


def list_tasks(templates: bool = False) -> list[dict]:
    with engine().connect() as c:
        rows = c.execute(
            text(
                f"select {TASK_COLS}, "
                "coalesce((select json_agg(json_build_object('id', m.id::text, 'name', m.name, "
                "'status', ta.status, 'upload_folder_id', ta.upload_folder_id, 'review', ta.review)) "
                "from task_assignees ta join models m on m.id = ta.model_id where ta.task_id = t.id), '[]') as assignees "
                "from tasks t where is_template = :tpl order by created_at desc"
            ),
            {"tpl": templates},
        ).mappings().all()
        return [dict(r) for r in rows]


def list_model_tasks(model_id: str) -> list[dict]:
    """Tasks assigned to one model (creator app view), with that model's upload folder."""
    with engine().connect() as c:
        # Qualify task columns with t. — task_assignees also has a `status` column.
        task_cols_t = ", ".join("t." + c.strip() for c in TASK_COLS.split(","))
        rows = c.execute(
            text(
                f"select {task_cols_t}, ta.upload_folder_id, "
                "ta.status as assignee_status, ta.review "
                "from tasks t join task_assignees ta on ta.task_id = t.id "
                "where ta.model_id = :m and t.is_template = false "
                "order by t.created_at desc"
            ),
            {"m": model_id},
        ).mappings().all()
        return [dict(r) for r in rows]


def create_task(d: dict, assignee_ids: list[str]) -> dict:
    with engine().begin() as c:
        row = c.execute(
            text(
                "insert into tasks (title, description, type, status, priority, due_date, tags, "
                "manager_notes, extra_tips, captions, is_template, recurring, recurrence, upload_type, data) "
                "values (:title, :description, :type, coalesce(:status,'todo'), coalesce(:priority,'medium'), "
                ":due_date, cast(:tags as jsonb), :manager_notes, :extra_tips, :captions, "
                "coalesce(:is_template,false), coalesce(:recurring,false), :recurrence, "
                "coalesce(:upload_type,'google_drive'), cast(:data as jsonb)) "
                f"returning {TASK_COLS}"
            ),
            {
                "title": d.get("title"), "description": d.get("description"), "type": d.get("type"),
                "status": d.get("status"), "priority": d.get("priority"),
                "due_date": d.get("due_date") or None, "tags": _json(d.get("tags") or []),
                "manager_notes": d.get("manager_notes"), "extra_tips": d.get("extra_tips"),
                "captions": d.get("captions"), "is_template": d.get("is_template", False),
                "recurring": d.get("recurring", False), "recurrence": d.get("recurrence"),
                "upload_type": d.get("upload_type"), "data": _json(d.get("data") or {}),
            },
        ).mappings().one()
        task = dict(row)
        for mid in assignee_ids:
            c.execute(
                text("insert into task_assignees (task_id, model_id) values (:t, :m) on conflict do nothing"),
                {"t": task["id"], "m": mid},
            )
        return task


def set_assignee_folder(task_id: str, model_id: str, folder_id: str) -> None:
    with engine().begin() as c:
        c.execute(
            text("update task_assignees set upload_folder_id = :f where task_id = :t and model_id = :m"),
            {"f": folder_id, "t": task_id, "m": model_id},
        )


def submit_assignee(task_id: str, model_id: str) -> None:
    """Creator submits their work for review."""
    with engine().begin() as c:
        c.execute(
            text("update task_assignees set status = 'submitted', submitted_at = now() "
                 "where task_id = :t and model_id = :m"),
            {"t": task_id, "m": model_id},
        )


def review_assignee(task_id: str, model_id: str, status: str, review: dict) -> None:
    """Manager approves or requests changes, with per-slot review notes."""
    with engine().begin() as c:
        c.execute(
            text("update task_assignees set status = :s, reviewed_at = now(), review = cast(:r as jsonb) "
                 "where task_id = :t and model_id = :m"),
            {"s": status, "r": _json(review or {}), "t": task_id, "m": model_id},
        )


def delete_task(task_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from tasks where id = :id"), {"id": task_id})


def _json(v):
    import json as _j
    return _j.dumps(v)


def ping() -> bool:
    try:
        with engine().connect() as c:
            c.execute(text("select 1"))
        return True
    except Exception as e:
        print("DB ping failed:", e)
        return False
