# Archived: real Drive Manager

`DriveManagerReal.tsx` here is the **original, production, backend-connected** Drive
Manager. It was the file `frontend/src/app/drive/page.tsx` before that route was
replaced by a mock/visual redesign (screenshot-driven, no backend).

It lives outside `app/` so Next.js does **not** route to it. It is kept here so a
future developer / AI can find and restore the real implementation quickly.

## Restore it
Copy the component back to `frontend/src/app/drive/page.tsx` and rename the export
to `export default function DrivePage()`. That's it — all the imports
(`@/lib/api`, `FolderTree`, `PreviewModal`, `FolderPicker`) still exist.

## Real connections it uses
Frontend client = `frontend/src/lib/api.ts`; backend routes = `backend/main.py`.

| Frontend call            | Backend endpoint                  | Purpose                          |
|--------------------------|-----------------------------------|----------------------------------|
| `api.status()`           | `GET /api/status`                 | Drive connection state           |
| `api.listModels()`       | `GET /api/models`                 | Models (Supabase Postgres)       |
| `api.createModel()`      | `POST /api/models`                | Create model + Drive folder      |
| `api.setupModelFolder()` | `POST /api/models/{id}/setup-folder` | Create the model's Drive folder |
| `api.moveFile()`         | `POST /api/file/{id}/move`        | Move a Drive file                |
| `api.copyFile()`         | `POST /api/file/{id}/copy`        | Copy a Drive file                |
| `api.disconnect()`       | `POST /api/disconnect`            | Drop the Google OAuth token      |
| `api.loginUrl`           | `/auth/google/login`              | Start Google OAuth               |
| `<FolderTree>`           | `GET /api/folder/{id}`            | Live Google Drive folder listing |
| `<PreviewModal>`         | `GET /api/file/{id}/content`      | Stream a Drive file through backend |
| `<FolderPicker>`         | (uses `/api/folder/{id}`)         | Destination chooser for move/copy |

Backend Drive logic: `backend/drive.py`. Storage conventions: `ARCHITECTURE.md` §6.

> Note: locally the app runs with `NEXT_PUBLIC_USE_MOCK=1`, which intercepts all of
> the above and returns fake data — so even the real page shows nothing real unless
> you set `NEXT_PUBLIC_USE_MOCK=0` and run the FastAPI backend.
