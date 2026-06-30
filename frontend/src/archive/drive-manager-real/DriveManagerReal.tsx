// ─────────────────────────────────────────────────────────────────────────────
// REAL, BACKEND-CONNECTED Drive Manager  (ARCHIVED — not routed)
//
// This is the ORIGINAL frontend/src/app/drive/page.tsx. It was replaced by a
// mock/visual redesign at that route. This file is the production implementation
// that actually talks to the FastAPI backend + Google Drive. It lives OUTSIDE the
// app/ directory on purpose, so Next.js does NOT route to it.
//
// HOW TO RESTORE:
//   Copy this file's component back to frontend/src/app/drive/page.tsx
//   (rename the export back to `export default function DrivePage()`).
//
// REAL CONNECTIONS THIS PAGE USES (see frontend/src/lib/api.ts → backend/main.py):
//   api.status()            -> GET  /api/status                       (Drive connection state)
//   api.listModels()        -> GET  /api/models                       (models from Supabase)
//   api.createModel()       -> POST /api/models                       (+ auto-creates Drive folder)
//   api.setupModelFolder()  -> POST /api/models/{id}/setup-folder     (create model Drive folder)
//   api.moveFile()          -> POST /api/file/{id}/move
//   api.copyFile()          -> POST /api/file/{id}/copy
//   api.disconnect()        -> POST /api/disconnect                   (drop Google OAuth token)
//   api.loginUrl            ->      /auth/google/login                (start Google OAuth)
//   <FolderTree>            -> GET  /api/folder/{id}                  (live Drive folder listing)
//   <PreviewModal>          -> GET  /api/file/{id}/content            (stream a Drive file)
//   <FolderPicker>          -> destination chooser for move/copy
//
// See ARCHITECTURE.md §6 (Storage conventions) and backend/drive.py.
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import FolderTree from "@/components/FolderTree";
import PreviewModal from "@/components/PreviewModal";
import FolderPicker from "@/components/FolderPicker";
import { api, DriveItem, DriveStatus, FOLDER_MIME, ModelRow } from "@/lib/api";

export default function DriveManagerReal() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selected, setSelected] = useState<ModelRow | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<DriveItem | null>(null);
  const [picker, setPicker] = useState<{ mode: "move" | "copy"; file: DriveItem } | null>(null);
  const [treeKey, setTreeKey] = useState(0);

  const loadStatus = useCallback(async () => {
    try { setStatus(await api.status()); } catch (e: any) { setErr(e.message); }
  }, []);
  const loadModels = useCallback(async () => {
    try {
      const list = await api.listModels();
      setModels(list);
      setSelected((sel) => (sel ? list.find((m) => m.id === sel.id) ?? null : null));
    } catch (e: any) { setErr(e.message); }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status?.connected) loadModels(); }, [status?.connected, loadModels]);

  const createModel = async () => {
    if (!newName.trim()) return;
    setBusy(true); setErr(null);
    try { await api.createModel({ name: newName.trim() }); setNewName(""); setShowNew(false); await loadModels(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const setupFolder = async (m: ModelRow) => {
    try { const updated = await api.setupModelFolder(m.id); setSelected(updated); await loadModels(); }
    catch (e: any) { setErr(e.message); }
  };
  const doPick = async (dest: string) => {
    if (!picker) return;
    const { mode, file } = picker;
    setPicker(null);
    try {
      if (mode === "move") await api.moveFile(file.id, dest);
      else await api.copyFile(file.id, dest);
      setTreeKey((k) => k + 1);
    } catch (e: any) { setErr(e.message); }
  };
  const disconnect = async () => { await api.disconnect(); setStatus(null); await loadStatus(); };

  const filtered = models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  if (status && !status.configured)
    return <Shell><div className="note">Backend not configured. Set <b>GOOGLE_CLIENT_ID</b> / <b>SECRET</b> in <code>backend/.env</code>.</div></Shell>;

  if (status && !status.connected)
    return (
      <Shell>
        <div className="card pad" style={{ maxWidth: 540 }}>
          <div className="fav" style={{ width: 48, height: 48, borderRadius: 13, marginBottom: 14 }}><Icon name="database" /></div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Connect Google Drive</div>
          <p className="sub" style={{ margin: "4px 0 18px" }}>Link the agency Google account. The CRM auto-creates the folder structure.</p>
          <a className="btn brand" href={api.loginUrl}><Icon name="link" /> Connect Google Drive</a>
        </div>
      </Shell>
    );

  if (!status) return <Shell><div className="empty"><Icon name="refresh" className="spin" /> Loading…</div></Shell>;

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Drive Manager</h1><p>Browse and manage model drive folders and files</p></div>
        <div className="btn-row">
          <button className="btn" onClick={() => setShowNew((v) => !v)}><Icon name="uplus" /> New model</button>
          <button className="btn" onClick={loadModels}><Icon name="refresh" /> Refresh</button>
          <button className="btn ghost danger" onClick={disconnect}><Icon name="power" /> Disconnect</button>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="statusbar">
          <span className="badge b-green"><Icon name="check" /> Connected</span>
          <span className="kv"><Icon name="user" style={{ width: 14, height: 14 }} /> <b>{status.email}</b></span>
          <span className="badge b-grey"><Icon name="database" /> {status.shared_drive ? "Shared Drive" : "My Drive"}</span>
          <span className="kv">Root: <b>{status.root_folder}</b></span>
          {status.db != null && <span className="badge b-soft">Supabase {status.db ? "live" : "error"}</span>}
          {status.root?.webViewLink && (
            <a className="btn sm" href={status.root.webViewLink} target="_blank" rel="noreferrer"><Icon name="external" /> Open in Drive</a>
          )}
        </div>
      </div>

      {showNew && (
        <div className="card pad" style={{ marginBottom: 18 }}>
          <div className="panel-title"><Icon name="uplus" /> Quick add model</div>
          <div className="panel-sub">Registers the model + auto-creates its Drive folder. (Full registration on <b>Manage Models</b>.)</div>
          <div className="field">
            <input placeholder="Model name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn brand sm" onClick={createModel} disabled={busy}>
              {busy ? <Icon name="refresh" className="spin" /> : <Icon name="plus" />} Create
            </button>
          </div>
        </div>
      )}

      {err && <div className="note">{err}</div>}

      <div className="grid2">
        {/* LEFT: models from DB */}
        <div className="card pad">
          <div className="panel-title"><Icon name="user" /> Models <span className="count">{models.length}</span></div>
          <div className="panel-sub">{selected ? <>Selected: <b style={{ color: "var(--ink)" }}>{selected.name}</b></> : "Select a model to view their drive structure"}</div>
          <div className="field" style={{ marginTop: 0 }}>
            <input placeholder="Search models…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ marginTop: 12 }}>
            {filtered.length === 0 ? (
              <div className="empty">
                <Icon name="user" />
                <div style={{ fontWeight: 600, color: "#3f3f46" }}>No models yet</div>
                <div className="sub">Use “New model” or register on Manage Models.</div>
              </div>
            ) : (
              filtered.map((m) => (
                <div key={m.id} className={`rowitem ${selected?.id === m.id ? "active" : ""}`} onClick={() => setSelected(m)}>
                  <div className="fav">{m.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{m.name}</div>
                    <div className="sub">{m.drive_folder_id ? m.status : "No folder yet"}</div>
                  </div>
                  <Icon name="chevr" style={{ width: 16, height: 16, color: "var(--muted2)" }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: drive structure */}
        <div className="card pad">
          <div className="panel-title"><Icon name="folders" /> Drive Structure</div>
          {!selected ? (
            <>
              <div className="panel-sub">Select a model to view their drive structure</div>
              <div className="empty"><Icon name="folders" /><div>Select a model from the list to view their drive structure</div></div>
            </>
          ) : !selected.drive_folder_id ? (
            <>
              <div className="panel-sub">No drive folder for <b style={{ color: "var(--ink)" }}>{selected.name}</b> yet.</div>
              <div className="empty">
                <Icon name="folder" />
                <div>This model has no Drive folder.</div>
                <button className="btn brand sm" onClick={() => setupFolder(selected)}><Icon name="folderplus" /> Set up folder</button>
              </div>
            </>
          ) : (
            <>
              <div className="panel-sub">Folders and files for <b style={{ color: "var(--ink)" }}>{selected.name}</b></div>
              <div style={{ marginTop: 6 }}>
                <FolderTree
                  key={`${selected.id}-${treeKey}`}
                  root={{ id: selected.drive_folder_id, name: selected.name, mimeType: FOLDER_MIME }}
                  label={selected.name}
                  onErr={setErr}
                  reloadParent={loadModels}
                  onPreview={setPreview}
                  onPick={(mode, file) => setPicker({ mode, file })}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      {picker && selected?.drive_folder_id && (
        <FolderPicker
          root={{ id: selected.drive_folder_id, name: selected.name, mimeType: FOLDER_MIME }}
          rootLabel={selected.name}
          mode={picker.mode}
          fileName={picker.file.name}
          onCancel={() => setPicker(null)}
          onPick={doPick}
        />
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="content">
      <div className="page-head"><div><h1>Drive Manager</h1><p>Browse and manage model drive folders and files</p></div></div>
      {children}
    </div>
  );
}
