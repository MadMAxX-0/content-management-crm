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
create table if not exists kanban_boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz default now()
);
create table if not exists kanban_lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references kanban_boards(id) on delete cascade,
  title text not null,
  position int default 0,
  created_at timestamptz default now()
);
create table if not exists kanban_cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references kanban_lists(id) on delete cascade,
  title text not null,
  description text,
  position int default 0,
  created_at timestamptz default now()
);
create table if not exists todo_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  color text default '#2f6df6',
  created_at timestamptz default now()
);
create table if not exists todo_tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references todo_lists(id) on delete cascade,
  title text not null,
  done boolean default false,
  status text default 'todo',
  priority text default 'none',
  due_date date,
  description text,
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table todo_tasks add column if not exists status text default 'todo';
alter table todo_tasks add column if not exists priority text default 'none';
alter table todo_tasks add column if not exists due_date date;
alter table todo_tasks add column if not exists description text;
alter table todo_tasks add column if not exists updated_at timestamptz default now();
create table if not exists media (
  drive_file_id text primary key,
  category text,
  uploaded_by text,
  model_id uuid references models(id) on delete set null,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
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


def get_model_by_email(email: str) -> dict | None:
    """Match a creator login to their model by email (case-insensitive)."""
    with engine().connect() as c:
        row = c.execute(
            text(f"select {MODEL_COLS} from models where lower(email) = lower(:e) order by created_at limit 1"),
            {"e": email},
        ).mappings().first()
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


def update_task(task_id: str, d: dict) -> dict:
    """Edit a task/template's content fields. Assignees are managed separately."""
    sets = [
        "title=:title", "description=:description", "type=:type",
        "status=coalesce(:status, status)", "priority=coalesce(:priority, priority)",
        "due_date=:due_date", "manager_notes=:manager_notes",
        "extra_tips=:extra_tips", "captions=:captions",
        "tags=cast(:tags as jsonb)", "data=cast(:data as jsonb)",
    ]
    params = {
        "id": task_id, "title": d.get("title"), "description": d.get("description"),
        "type": d.get("type"), "status": d.get("status"), "priority": d.get("priority"),
        "due_date": d.get("due_date") or None, "manager_notes": d.get("manager_notes"),
        "extra_tips": d.get("extra_tips"), "captions": d.get("captions"),
        "tags": _json(d.get("tags") or []), "data": _json(d.get("data") or {}),
    }
    with engine().begin() as c:
        row = c.execute(
            text(f"update tasks set {', '.join(sets)} where id = :id returning {TASK_COLS}"),
            params,
        ).mappings().one()
        return dict(row)


def delete_task(task_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from tasks where id = :id"), {"id": task_id})


# ───────────────────── Roles (DB-backed grants) ─────────────────────
# Stored in app_settings under key 'roles' as {email: 'admin'|'va'}. Lets the
# Manage Users page grant roles without editing Railway env vars. Env allowlists
# (ADMIN_EMAILS / VA_EMAILS) still win as a bootstrap so the owner is never locked out.
def get_roles() -> dict:
    return get_setting("roles") or {}


def set_role(email: str, role: str | None) -> dict:
    roles = get_roles()
    email = (email or "").lower()
    if role in ("admin", "va"):
        roles[email] = role
    else:  # creator / none / revoke → drop any explicit grant
        roles.pop(email, None)
    set_setting("roles", roles)
    return roles


# ───────────────────── Statistics ─────────────────────
def stats() -> dict:
    with engine().connect() as c:
        def scalar(q, **p):
            return c.execute(text(q), p).scalar() or 0

        def pairs(q):
            return {(r[0] or "?"): r[1] for r in c.execute(text(q)).all()}

        models_total = scalar("select count(*) from models")
        models_by_status = pairs("select coalesce(status,'Pending'), count(*) from models group by 1")
        tasks_total = scalar("select count(*) from tasks where is_template = false")
        templates_total = scalar("select count(*) from tasks where is_template = true")
        tasks_by_type = pairs(
            "select coalesce(type,'other'), count(*) from tasks where is_template = false group by 1"
        )
        assignees_total = scalar("select count(*) from task_assignees")
        work_by_status = pairs("select coalesce(status,'todo'), count(*) from task_assignees group by 1")

        per_model = [
            dict(r) for r in c.execute(
                text(
                    "select m.id::text as id, m.name, m.status, m.created_at, "
                    "count(ta.*) as total, "
                    "count(*) filter (where ta.status = 'submitted') as submitted, "
                    "count(*) filter (where ta.status = 'approved') as approved, "
                    "count(*) filter (where ta.status = 'changes_requested') as changes "
                    "from models m left join task_assignees ta on ta.model_id = m.id "
                    "group by m.id, m.name, m.status, m.created_at order by total desc, m.name"
                )
            ).mappings().all()
        ]

        # Monthly time series (keyed YYYY-MM; the frontend builds the last-N-months axis)
        models_by_month = {
            r[0]: r[1] for r in c.execute(
                text("select to_char(date_trunc('month', created_at),'YYYY-MM'), count(*) "
                     "from models group by 1")
            ).all()
        }
        tasks_created_by_month = {
            r[0]: r[1] for r in c.execute(
                text("select to_char(date_trunc('month', created_at),'YYYY-MM'), count(*) "
                     "from tasks where is_template = false group by 1")
            ).all()
        }
        tasks_completed_by_month = {
            r[0]: r[1] for r in c.execute(
                text("select to_char(date_trunc('month', ta.reviewed_at),'YYYY-MM'), count(*) "
                     "from task_assignees ta where ta.status = 'approved' and ta.reviewed_at is not null "
                     "group by 1")
            ).all()
        }
        tasks_by_priority = pairs(
            "select coalesce(priority,'medium'), count(*) from tasks where is_template = false group by 1"
        )
        # Avg response time = hours from task creation to the model's submission
        avg_response_hours = c.execute(
            text("select avg(extract(epoch from (ta.submitted_at - t.created_at))/3600.0) "
                 "from task_assignees ta join tasks t on t.id = ta.task_id "
                 "where ta.submitted_at is not null")
        ).scalar()
        # Overdue = assigned, past due date, not yet approved
        overdue = c.execute(
            text("select count(*) from task_assignees ta join tasks t on t.id = ta.task_id "
                 "where t.due_date is not null and t.due_date < current_date "
                 "and ta.status <> 'approved'")
        ).scalar() or 0

        recent = [
            dict(r) for r in c.execute(
                text(
                    "select t.title, m.name as model, ta.status, ta.submitted_at, ta.reviewed_at "
                    "from task_assignees ta "
                    "join tasks t on t.id = ta.task_id "
                    "join models m on m.id = ta.model_id "
                    "where ta.submitted_at is not null or ta.reviewed_at is not null "
                    "order by greatest(coalesce(ta.reviewed_at, to_timestamp(0)), "
                    "coalesce(ta.submitted_at, to_timestamp(0))) desc limit 12"
                )
            ).mappings().all()
        ]

    approved = work_by_status.get("approved", 0)
    completion = round(approved / assignees_total * 100) if assignees_total else 0
    return {
        "models_total": models_total,
        "models_by_status": models_by_status,
        "tasks_total": tasks_total,
        "templates_total": templates_total,
        "tasks_by_type": tasks_by_type,
        "tasks_by_priority": tasks_by_priority,
        "assignees_total": assignees_total,
        "work_by_status": work_by_status,
        "completion_pct": completion,
        "pending_review": work_by_status.get("submitted", 0),
        "overdue": overdue,
        "avg_response_hours": round(float(avg_response_hours), 1) if avg_response_hours is not None else None,
        "models_by_month": models_by_month,
        "tasks_created_by_month": tasks_created_by_month,
        "tasks_completed_by_month": tasks_completed_by_month,
        "per_model": per_model,
        "recent": recent,
    }


# ───────────────────── Kanban (Office app) ─────────────────────
def list_boards() -> list[dict]:
    with engine().connect() as c:
        rows = c.execute(text(
            "select b.id::text, b.title, b.description, b.created_at, "
            "(select count(*) from kanban_lists l join kanban_cards cd on cd.list_id = l.id "
            " where l.board_id = b.id) as card_count "
            "from kanban_boards b order by b.created_at desc"
        )).mappings().all()
        return [dict(r) for r in rows]


def create_board(title: str, description: str | None) -> dict:
    with engine().begin() as c:
        row = c.execute(text(
            "insert into kanban_boards (title, description) values (:t, :d) "
            "returning id::text, title, description, created_at"
        ), {"t": title, "d": description}).mappings().one()
        return dict(row)


def delete_board(board_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from kanban_boards where id = :id"), {"id": board_id})


def get_board(board_id: str) -> dict | None:
    with engine().connect() as c:
        board = c.execute(text(
            "select id::text, title, description, created_at from kanban_boards where id = :id"
        ), {"id": board_id}).mappings().first()
        if not board:
            return None
        lists = [dict(r) for r in c.execute(text(
            "select id::text, title, position from kanban_lists where board_id = :b "
            "order by position, created_at"
        ), {"b": board_id}).mappings().all()]
        cards = [dict(r) for r in c.execute(text(
            "select cd.id::text, cd.list_id::text, cd.title, cd.description, cd.position "
            "from kanban_cards cd join kanban_lists l on l.id = cd.list_id "
            "where l.board_id = :b order by cd.position, cd.created_at"
        ), {"b": board_id}).mappings().all()]
        by_list: dict = {}
        for cd in cards:
            by_list.setdefault(cd["list_id"], []).append(cd)
        for l in lists:
            l["cards"] = by_list.get(l["id"], [])
        result = dict(board)
        result["lists"] = lists
        return result


def create_list(board_id: str, title: str) -> dict:
    with engine().begin() as c:
        pos = c.execute(text("select coalesce(max(position),-1)+1 from kanban_lists where board_id = :b"),
                        {"b": board_id}).scalar()
        row = c.execute(text(
            "insert into kanban_lists (board_id, title, position) values (:b, :t, :p) "
            "returning id::text, title, position"
        ), {"b": board_id, "t": title, "p": pos}).mappings().one()
        d = dict(row); d["cards"] = []
        return d


def delete_list(list_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from kanban_lists where id = :id"), {"id": list_id})


def create_card(list_id: str, title: str, description: str | None) -> dict:
    with engine().begin() as c:
        pos = c.execute(text("select coalesce(max(position),-1)+1 from kanban_cards where list_id = :l"),
                        {"l": list_id}).scalar()
        row = c.execute(text(
            "insert into kanban_cards (list_id, title, description, position) values (:l, :t, :d, :p) "
            "returning id::text, list_id::text, title, description, position"
        ), {"l": list_id, "t": title, "d": description, "p": pos}).mappings().one()
        return dict(row)


def delete_card(card_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from kanban_cards where id = :id"), {"id": card_id})


def move_card(card_id: str, list_id: str, position: int) -> None:
    with engine().begin() as c:
        c.execute(text("update kanban_cards set list_id = :l, position = :p where id = :id"),
                  {"l": list_id, "p": position, "id": card_id})


# ───────────────────── Todo (Office app) ─────────────────────
def list_todo_lists() -> list[dict]:
    with engine().connect() as c:
        rows = c.execute(text(
            "select tl.id::text, tl.title, tl.description, tl.color, tl.created_at, "
            "count(tt.*) as total, count(*) filter (where tt.status = 'done') as done "
            "from todo_lists tl left join todo_tasks tt on tt.list_id = tl.id "
            "group by tl.id order by tl.created_at desc"
        )).mappings().all()
        return [dict(r) for r in rows]


def create_todo_list(title: str, description: str | None, color: str | None) -> dict:
    with engine().begin() as c:
        row = c.execute(text(
            "insert into todo_lists (title, description, color) values (:t, :d, coalesce(:c,'#2f6df6')) "
            "returning id::text, title, description, color, created_at"
        ), {"t": title, "d": description, "c": color}).mappings().one()
        r = dict(row); r["total"] = 0; r["done"] = 0
        return r


def delete_todo_list(list_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from todo_lists where id = :id"), {"id": list_id})


def get_todo_list(list_id: str) -> dict | None:
    with engine().connect() as c:
        tl = c.execute(text(
            "select id::text, title, description, color, created_at from todo_lists where id = :id"
        ), {"id": list_id}).mappings().first()
        if not tl:
            return None
        tasks = [dict(r) for r in c.execute(text(
            "select id::text, title, status, priority, due_date::text as due_date, description, position "
            "from todo_tasks where list_id = :l order by position, created_at"
        ), {"l": list_id}).mappings().all()]
        r = dict(tl); r["tasks"] = tasks
        return r


def create_todo_task(list_id: str, title: str) -> dict:
    with engine().begin() as c:
        pos = c.execute(text("select coalesce(max(position),-1)+1 from todo_tasks where list_id = :l"),
                        {"l": list_id}).scalar()
        row = c.execute(text(
            "insert into todo_tasks (list_id, title, position) values (:l, :t, :p) "
            "returning id::text, title, status, priority, due_date::text as due_date, description, position"
        ), {"l": list_id, "t": title, "p": pos}).mappings().one()
        return dict(row)


def update_todo_task(task_id: str, fields: dict) -> None:
    sets, params = [], {"id": task_id}
    for col in ("title", "status", "priority", "description"):
        if col in fields:
            sets.append(f"{col} = :{col}"); params[col] = fields[col]
    if "due_date" in fields:
        sets.append("due_date = :due_date"); params["due_date"] = fields["due_date"] or None
    if not sets:
        return
    sets.append("updated_at = now()")
    with engine().begin() as c:
        c.execute(text(f"update todo_tasks set {', '.join(sets)} where id = :id"), params)


def delete_todo_task(task_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from todo_tasks where id = :id"), {"id": task_id})


# ───────────────────── Media metadata (Gallery categories) ─────────────────────
def media_map() -> dict:
    """{drive_file_id: {category, uploaded_by}} for category overrides."""
    with engine().connect() as c:
        rows = c.execute(text("select drive_file_id, category, uploaded_by from media")).mappings().all()
        return {r["drive_file_id"]: dict(r) for r in rows}


def set_media(file_id: str, category: str | None, uploaded_by: str | None) -> None:
    with engine().begin() as c:
        c.execute(text(
            "insert into media (drive_file_id, category, uploaded_by) values (:f, :c, :u) "
            "on conflict (drive_file_id) do update set category = excluded.category"
        ), {"f": file_id, "c": category, "u": uploaded_by})


def delete_media(file_id: str) -> None:
    with engine().begin() as c:
        c.execute(text("delete from media where drive_file_id = :f"), {"f": file_id})


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
