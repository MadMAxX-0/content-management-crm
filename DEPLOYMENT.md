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

## 1. Get the code onto your own GitHub

You need the code in a GitHub repo **you own**, because Vercel and Railway deploy
straight from GitHub. Pick whichever path fits.

### Path A — Fork (easiest, if you can see the repo)

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Ask the owner to make the repo **public**, or to add you as a **collaborator**
   (repo → **Settings → Collaborators → Add people**).
3. Open the repo page → click **Fork** (top-right) → **Create fork**.
   You now own a copy at `github.com/YOUR-NAME/content-management-crm`.

### Path B — Copy via ZIP (works even if the repo stays private)

1. **Owner:** open the repo → green **Code** button → **Download ZIP**, send it to you.
2. **You:** unzip it, then create a **new empty repo** on your GitHub (no README/.gitignore).
3. In a terminal inside the unzipped folder:
   ```bash
   rm -rf .git
   git init
   git add -A
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```

Either way, you end up with the full project in **your** GitHub account, with two
folders that get deployed separately: `frontend/` (to Vercel) and `backend/` (to Railway).

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

## 3. Google Drive setup (file storage) — step by step

All uploaded content lives in **one Google account's Drive** — your "agency" account.
The app connects to it via Google OAuth. Do this carefully; it's the fiddliest part.

> **Chicken-and-egg note:** the OAuth setup needs your backend's public URL (for the
> redirect URI), but you don't have that until step 4 (Railway). That's fine — you can
> **edit the redirect URIs in Google Cloud anytime**. Easiest order: do 3a–3e now using a
> placeholder, deploy the backend (step 4), then come back and paste the real Railway URL.

**3a. Choose the agency Google account.** Decide which Google account will hold all the
content (ideally a dedicated agency Gmail, not a personal one). You'll *connect* this
account's Drive inside the app later (step 6).

**3b. Create a Google Cloud project.**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) (sign in with any Google account).
2. Top bar → project dropdown → **New Project** → name it (e.g. `MyCRM`) → **Create**.
3. Make sure the new project is selected in the top bar.

**3c. Enable the Drive API.**
1. Left menu → **APIs & Services → Library**.
2. Search **Google Drive API** → open it → **Enable**.

**3d. Configure the OAuth consent screen.**
1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. Fill **App name**, **User support email**, **Developer contact email** → **Save and Continue**.
4. **Scopes:** skip (click **Save and Continue**) — the app requests what it needs.
5. **Test users:** click **Add Users** and add the **agency Google account** email from 3a → **Save and Continue**.
6. Leave it in **Testing** mode (only your test users can connect — that's fine). You can
   later **Publish app** if you want any Google account to be able to connect.

**3e. Create the OAuth client ID.**
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**. Name it (e.g. `CRM backend`).
3. Under **Authorized redirect URIs → + Add URI**, add (you can add the real one after step 4):
   - `https://YOUR-BACKEND.up.railway.app/auth/google/callback` ← production (paste real URL after Railway)
   - `http://localhost:8000/auth/google/callback` ← only if you'll run it locally
4. **Create.** A popup shows **Client ID** and **Client secret** — copy both:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client secret → `GOOGLE_CLIENT_SECRET`
5. Whatever exact URL you put as the redirect URI must **also** be your `GOOGLE_REDIRECT_URI`
   env var on Railway — they have to match character-for-character.

**3f. (Optional) Use a Shared Drive.** If content should live in a Google **Shared Drive**
(Team Drive) instead of My Drive: open it in Drive, copy the ID from the URL
`drive.google.com/drive/folders/<THIS_ID>` → set `SHARED_DRIVE_ID`. Make sure the agency
account is a member. Otherwise leave `SHARED_DRIVE_ID` blank (files go in My Drive).

**3g. Connect Drive in the app (after deploying — see step 6).** Once the app is live and
you're logged in as admin, use **Connect Google Drive** → Google's consent screen opens →
sign in with the **agency Google account** (3a) → approve. The app creates a
`<COMPANY_NAME>_crm/` folder in that Drive and stores everything there from then on.

> If connecting fails with `redirect_uri_mismatch`, the URL in `GOOGLE_REDIRECT_URI` and the
> one in Google Cloud → Credentials don't match exactly (check http vs https, trailing slash).

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
