# Deploying your own instance

This guide sets up a **completely independent** copy of the CRM — your own code,
database, auth, and Google Drive. Nothing is shared with the original instance.

## What it's made of

| Piece | Tech | Hosted on |
|-------|------|-----------|
| Frontend | Next.js (React) | **Vercel** |
| Backend API | FastAPI (Python) | **Railway** |
| Database | Postgres | **Supabase** (or any Postgres) |
| Login / Auth | Supabase Auth | **Supabase** |
| File storage | Google Drive (agency account) | **Google Cloud** OAuth |
| Translation (optional, off by default) | DeepL | DeepL API |

You'll need free accounts on: **GitHub, Vercel, Railway, Supabase, Google Cloud**.

---

## 1. Get the code

Fork (or clone into a new repo) so you have your own copy:

- On GitHub, **Fork** this repository into your account, **or**
- `git clone` it and push to a new repo you own.

Both Vercel and Railway deploy straight from your GitHub repo.

---

## 2. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API** — copy:
   - **Project URL** → `SUPABASE_URL` (and `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key → `SUPABASE_ANON_KEY` (and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** secret key → `SUPABASE_SERVICE_KEY` *(needed for in-app "Add User")*
3. **Settings → Database → Connection string → URI** — copy it → `DATABASE_URL`
   (use the connection-pooler URI; make sure the password is filled in).

> The database tables are **created automatically** on first backend startup — no manual SQL.

---

## 3. Google Cloud (Drive storage)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → set it up (External is fine; add your
   agency Google account as a test user).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**:
   - **Authorized redirect URI:** `https://YOUR-BACKEND-URL/auth/google/callback`
     (you'll get the backend URL from Railway in step 4 — come back and fill this in).
   - Copy **Client ID** → `GOOGLE_CLIENT_ID`, **Client secret** → `GOOGLE_CLIENT_SECRET`.
5. (Optional) If you use a **Shared Drive**, copy its ID → `SHARED_DRIVE_ID`. Otherwise leave it blank and files go in the connected account's My Drive.

---

## 4. Backend on Railway

1. At [railway.app](https://railway.app), **New Project → Deploy from GitHub repo** → pick your repo.
2. Set the **root directory** to `backend/`.
   (It runs `uvicorn main:app` via the included `Procfile`; Python 3.11.)
3. Add the **Variables** below, then deploy. Copy the public URL Railway gives you
   (e.g. `https://your-app.up.railway.app`) — that's `NEXT_PUBLIC_API_URL` for the frontend,
   and the base of your `GOOGLE_REDIRECT_URI`.
4. Go back to Google Cloud (step 3.4) and set the redirect URI to
   `https://your-app.up.railway.app/auth/google/callback`, and set `GOOGLE_REDIRECT_URI`
   on Railway to the same value.

### Backend environment variables (Railway → Variables)

| Variable | Required | What it is |
|----------|----------|------------|
| `DATABASE_URL` | ✅ | Supabase Postgres URI |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | ✅* | Supabase service_role key — needed for "Add User" |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ✅ | `https://YOUR-BACKEND/auth/google/callback` |
| `FRONTEND_URL` | ✅ | Your Vercel URL (for redirects + CORS) |
| `ADMIN_EMAILS` | ✅ | Comma-separated admin emails (your login) |
| `COMPANY_NAME` | ➖ | Names the Drive root folder `<name>_crm` (default `companyname`) |
| `SHARED_DRIVE_ID` | ➖ | Only if using a Google Shared Drive |
| `VA_EMAILS` | ➖ | Comma-separated VA emails (can also set roles in-app) |
| `DEEPL_API_KEY` | ➖ | Only to turn on task-content translation (off by default) |

\* Without `SUPABASE_SERVICE_KEY` the app still runs; you just create login accounts in
the Supabase dashboard instead of via the in-app "Add User" button.

---

## 5. Frontend on Vercel

1. At [vercel.com](https://vercel.com), **Add New → Project** → import your repo.
2. Set the **root directory** to `frontend/`.
3. Add the **Environment Variables** below and deploy.

### Frontend environment variables (Vercel)

| Variable | What it is |
|----------|------------|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |

> After the first deploy, set `FRONTEND_URL` on Railway to the Vercel URL and redeploy
> the backend so auth redirects and CORS line up.

---

## 6. First run

1. Open your Vercel URL. Sign up / log in with the email you put in `ADMIN_EMAILS`
   (create that user in **Supabase → Authentication → Add user**, Auto-confirm).
2. As admin, **connect Google Drive**: the app links your agency Google account via OAuth
   (this authorizes the Drive where all content is stored). The CRM root folder
   `<COMPANY_NAME>_crm/` is created automatically.
3. **Manage Users** → add your team:
   - **admin** — full access
   - **va** — Model Tasks only
   - **creator** — the phone app only; auto-matched when their login email equals a model's email
4. **Models** → add your creators (their email is what links their login to the app).

That's it — create tasks/content sets, models upload via the phone app, you review.

---

## Roles & permissions recap

- Roles resolve from **env allowlists** (`ADMIN_EMAILS`, `VA_EMAILS`) **merged with**
  per-user grants set in **Manage Users** (stored in the DB).
- Creators never get direct Drive access — files are streamed through the backend.

## Local development (optional)

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# put the vars above in backend/.env, then:
uvicorn main:app --reload

# frontend
cd frontend && npm install
# put NEXT_PUBLIC_* vars in frontend/.env.local, then:
npm run dev
```

## Notes

- DB schema auto-creates on backend startup; no migrations to run.
- Translation is **off** until `DEEPL_API_KEY` is set *and* `LANG_ENABLED` is flipped to
  `true` in `frontend/src/app/app/page.tsx`.
- Each deployment is fully isolated: its own Drive, DB, and users.
