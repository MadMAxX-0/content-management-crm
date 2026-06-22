# CRM Drive Backend

FastAPI backend that connects the CRM to **Google Drive** via OAuth and manages the
`companyname_crm` folder structure.

## What it does
- Connect the agency Google account (OAuth 2.0, full Drive scope).
- On connect, auto-creates the CRM root + top folders:
  `companyname_crm/` → `models/ templates/ tasks/ edit-review/ team-use/`
- Create a model's folder on registration: `models/<name>_<userID>/Root folder/`
- List / create / move / trash files (full control, deletes go to Trash for safety).

---

## 1. Get Google OAuth credentials (one-time)

1. Go to **https://console.cloud.google.com/** and create a project (e.g. *Content CRM*).
2. **Enable the Drive API:** APIs & Services → Library → search **Google Drive API** → **Enable**.
3. **OAuth consent screen:** APIs & Services → OAuth consent screen
   - User type: **External** → Create
   - App name, your email → Save
   - **Scopes:** add `.../auth/drive` (Google Drive API – full)
   - **Test users:** add the agency Google account email → Save
4. **Create credentials:** APIs & Services → Credentials → **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URI:** `http://localhost:8000/auth/google/callback`
   - Create → copy the **Client ID** and **Client secret**.

## 2. Configure

```bash
cd backend
cp .env.example .env
```
Edit `.env` and paste your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
Set `COMPANY_NAME` (the root folder becomes `<COMPANY_NAME>_crm`).
Leave `SHARED_DRIVE_ID` empty to use My Drive (simplest), or paste a Shared Drive ID.

## 3. Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** → click **Connect Google Drive** → approve.
The CRM folder structure is created automatically; the page shows it live.

## API
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/status` | connection + root info |
| GET  | `/auth/google/login` | start OAuth |
| POST | `/api/setup` | (re)create root structure |
| GET  | `/api/tree` | CRM root + top folders |
| GET  | `/api/folder/{id}` | folder contents |
| POST | `/api/model/folder?name=&user_id=` | create model folder |
| POST | `/api/file/{id}/move?dest=` | move file |
| POST | `/api/file/{id}/trash` | trash file |
| POST | `/api/disconnect` | remove stored token |
