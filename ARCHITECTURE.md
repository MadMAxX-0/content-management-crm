# Architecture & developer handoff

Onboarding doc for a developer taking over this CRM. For *deploying* an instance, see
[DEPLOYMENT.md](DEPLOYMENT.md). This file explains how the code is organized, the data
model, the core domain concepts, the invariants you must not break, and what's still open.

---

## 1. Stack & topology

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | **Next.js (App Router)**, React, Tailwind, TypeScript | `frontend/` → Vercel |
| Backend | **FastAPI** (Python 3.11) | `backend/` → Railway (`Procfile`: `uvicorn main:app`) |
| Database | **Postgres** (Supabase) via SQLAlchemy Core | schema auto-creates on boot |
| Auth | **Supabase Auth** (JWT) | frontend signs in; backend verifies + resolves role |
| File storage | **Google Drive** (agency account, OAuth) | DB stores only metadata/IDs |
| Translation | **DeepL** | built but **parked** (off by default) |

Data flow: browser → Next.js → FastAPI (`NEXT_PUBLIC_API_URL`) → Postgres + Google Drive.
Media is **streamed through the backend** (`/api/file/{id}/content`); creators never get
direct Drive access.

> ⚠️ **`frontend/AGENTS.md`** claims this Next.js has breaking changes vs. stock — treat
> the App Router conventions in this repo as the source of truth; check
> `node_modules/next/dist/docs/` before introducing new Next APIs.

---

## 2. Repo map

```
backend/
  main.py        # ALL FastAPI routes (~57 endpoints)
  db.py          # SQLAlchemy: SCHEMA (auto-create), every DB function
  drive.py       # Google Drive: folders, upload, list_media, task_subfolders, build_task_structure
  auth.py        # role resolution (env allowlists + DB grants)
  supa_admin.py  # Supabase Admin API (create/list/delete login accounts)
  translate.py   # DeepL translation (parked)
frontend/src/
  app/           # pages: tasks, app (creator), gallery, stats, users, models, drive, login
  components/    # CreateTaskModal, ReviewModal, AssignTemplateModal, Sidebar, AuthGate,
                 # OfficePanel(+KanbanApp,TodoApp), Charts, Icon, Folder* , auth-context
  lib/
    api.ts       # typed API client + ALL shared TS types
    slots.ts     # task type → deliverable slots & Content Set layout (see §5)
    appLang.ts   # i18n dictionary (parked)
    supabase.ts  # Supabase client
```

---

## 3. Data model (Postgres)

Tables (all created by `db.SCHEMA` / `init_schema()` on startup — **no migration tool**):

- **models** — the creators/talent. `email` links a creator login to their model.
- **tasks** — tasks *and* templates (`is_template`). Type-specific structure is in the
  `data` JSONB column (outfit, media, parts, swipe, sections, media_refs, targetFolders…).
- **task_assignees** — M:N task↔model. Per-assignee workflow: `status`
  (todo→submitted→approved/changes_requested), `upload_folder_id` (Drive), `review` JSONB.
- **app_settings** — key/value. Holds the Google OAuth token (`google_token`) and the
  role-grant map (`roles`).
- **media** — metadata for Drive files surfaced in the Gallery (`drive_file_id`, category…).
- **task_translations** — cached DeepL output per (task, lang) (parked feature).
- **kanban_boards/lists/cards**, **todo_lists/tasks** — the Office mini-apps.
- **app_users** — (legacy/aux user rows; auth of record is Supabase + the `roles` setting).

The DB **never stores file bytes** — only Drive file IDs + metadata.

---

## 4. Auth & roles

- Frontend authenticates with Supabase; the JWT is sent as `Authorization: Bearer`.
- `auth.resolve(email)` returns the role, **merging** two sources:
  - env allowlists: `ADMIN_EMAILS`, `VA_EMAILS`
  - DB grants: `app_settings.roles` (`{email: 'admin'|'va'}`), editable in **Manage Users**.
- Roles: **admin** (everything) · **va** (Model Tasks only) · **creator** (the phone app,
  own tasks; matched when login email == a model's email) · **none** (logged in, unlinked).
- FastAPI dependencies enforce this: `current_user`, `require_admin`, `require_tasks`
  (admin **or** va).
- Creating login accounts from the app (**Manage Users → Add User**) needs
  `SUPABASE_SERVICE_KEY` (`supa_admin.py`). Without it, create accounts in the Supabase
  dashboard and only the role grant happens in-app.

---

## 5. Core domain: tasks, slots, Content Sets  ⚠️ critical invariant

A task **type** determines its **deliverable slots** (the folders a creator uploads into).
There are **two sides that must agree on folder names**:

- Frontend: `lib/slots.ts → slotsForTask(task)` → `[{ label, folderName }]`
- Backend: `drive.py → task_subfolders(type, data)` → `[folderName, …]`, created under the
  task folder by `build_task_structure()` at **assignment time**.

**If these two lists ever disagree on `folderName`, uploads/reviews break.** When you add
or change a task type, update **both** in lockstep.

Task types: `detailed`, `video`, `ppv_sequence`, `ppv_long`, `images_videos`, `swipe`,
`content_set`.

### Content Set (`content_set`)
A sectioned shoot brief: `data.sets` (count) → `data.sections[]` → `groups[]` (each
`{title, count, refs, ref_link}`). Folder naming scheme, **duplicated in both languages**:
```
Set {n} · {globalGroupIndex+1}. {group.title}
```
(`slots.ts → contentSetLayout()` and `drive.py → task_subfolders()` must produce identical
strings.) Creator UI: `app/app/page.tsx → ContentSetView` (set switcher, sections, group
cards, reference lightbox).

### Reference media
Manager-attached example shots, stored in `data.media_refs` keyed by slot string (or on
each Content Set group's `refs`). Uploaded via `POST /api/task-media/upload` →
Drive `gallery/Task Gallery/`. The picker (`/api/task-media`) lists the whole media library.
Shown to creators as thumbnails opening an in-page lightbox.

### Review flow
Creator uploads → submits → `task_assignees.status='submitted'`. Manager
(`ReviewModal`) approves/redoes **per slot** → writes `review` JSONB; creator sees
per-slot feedback.

---

## 6. Storage conventions (Drive)

- Root: `<COMPANY_NAME>_crm/` (auto-created on connect).
- Creator deliverables: `models/<Model>/Root folder/<Task>/<slot>/`.
- Gallery uploads: `gallery/<Category>/`. Task reference media: `gallery/Task Gallery/`.
- Files served via `/api/file/{id}/content` (backend proxies; creators have no Drive access).

---

## 7. Frontend notes

- **Creator app** (`/app`): rendered **without** the admin shell (see `AuthGate` — creators
  skip `<Shell>`). Full-screen, **installable PWA** (`public/manifest.webmanifest`,
  `layout.tsx` metadata/viewport). Admins see the same page wrapped in a phone-frame preview
  with a "Viewing as" model picker.
- **Charts** (`Charts.tsx`) are hand-rolled SVG — a chart library wouldn't `npm install`
  cleanly in this setup; keep them dependency-free.
- **Office** (`OfficePanel`): Kanban + Todo are built; other apps are "Soon".
- **i18n** (`appLang.ts`): EN/PT/ES dictionary exists but the switcher is hidden behind
  `LANG_ENABLED = false` in `app/app/page.tsx`.

---

## 8. Build & deploy

- **Backend:** push to `main` → Railway auto-builds `backend/`. Schema migrates itself on
  boot. (Watch the Railway Deployments tab — a stuck "queued/Not started" usually means a
  plan/credits issue; push an empty commit to re-trigger.)
- **Frontend:** `cd frontend && rm -rf .next && vercel deploy --prod` (or Vercel auto-deploy
  on push if the project is GitHub-connected). Always clean `.next` to avoid stale chunks.
- Env vars: see DEPLOYMENT.md + `backend/.env.example`, `frontend/.env.example`.

---

## 9. Status — done vs. open

**Working:** task CRUD + templates + assignment + review; Content Set type; creator PWA;
Gallery (upload, categories, views) on Drive; reference-media upload + picker + lightbox;
Manage Users + roles; Statistics; Office (Kanban, Todo).

**Open / known limitations (good first tickets):**
1. **Edit-time Drive sync:** subfolders are built at *assignment*. Editing an already-
   assigned task (e.g. adding a Content Set group/set) does **not** create the new Drive
   folders. Either rebuild on update or build folders lazily on first upload.
2. **Translation (DeepL)** is parked: set `DEEPL_API_KEY` and flip `LANG_ENABLED=true` to
   enable; verify explicit-content handling.
3. **Granular permissions** (departments / sub-roles like Chat/Reddit/IG Manager) — not
   built; only the 3 fixed roles exist.
4. **Template export/import** between instances — not built.
5. Some Office apps and a few secondary actions are still "Soon" placeholders.

---

## 10. Gotchas

- Keep `slots.ts` and `drive.py` folder names in sync (§5) — the #1 source of breakage.
- Creator file links must go through `/api/file/{id}/content`, never Drive `webViewLink`.
- `redirect_uri_mismatch` on Drive connect = `GOOGLE_REDIRECT_URI` ≠ Google Cloud entry.
- No DB migration tool: schema changes go in `db.SCHEMA` (use `create table if not exists`
  / `alter table … add column if not exists`) so boot is idempotent.
