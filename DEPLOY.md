# Deployment

**Architecture:** Next.js frontend → **Vercel** · FastAPI backend → **Railway** · Postgres → **Supabase** (already live).

Deploy the **backend first** (you need its URL for the frontend + Google OAuth).

---

## 1. Push to GitHub
```bash
# from the project root (already committed locally)
gh repo create content-management-crm --private --source=. --remote=origin --push
# or create the repo on github.com and:
#   git remote add origin git@github.com:<you>/content-management-crm.git
#   git push -u origin main
```
`.env` files with secrets are gitignored — only `.env.example` templates are committed.

## 2. Backend → Railway
1. railway.app → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Service **Settings → Root Directory** = `backend`  (so it finds `requirements.txt`, `Procfile`).
3. **Variables** tab — add (values from `backend/.env`):
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = `https://<your-railway-domain>/auth/google/callback`
   - `COMPANY_NAME=youtopia`
   - `SHARED_DRIVE_ID=0AM9fzgu-PZSTUk9PVA`
   - `FRONTEND_URL` = `https://<your-vercel-domain>/drive`
   - `DATABASE_URL` = your Supabase pooler string
4. Deploy. Railway gives you a domain → **Settings → Networking → Generate Domain**. Copy it.

## 3. Google Cloud Console
APIs & Services → Credentials → your OAuth client → **Authorized redirect URIs** → add:
```
https://<your-railway-domain>/auth/google/callback
```

## 4. Frontend → Vercel
1. vercel.com → **Add New Project** → import this repo.
2. **Root Directory** = `frontend` (Vercel auto-detects Next.js).
3. **Environment Variables** → `NEXT_PUBLIC_API_URL` = `https://<your-railway-domain>`
4. Deploy → you get `https://<your-vercel-domain>`.

## 5. Close the loop
- Make sure Railway's `FRONTEND_URL` matches the real Vercel domain, then redeploy the backend.
- Open the Vercel site → **Drive Manager → Connect** → authorize → you're live.

> Every `git push` to `main` now auto-deploys both Vercel and Railway.
