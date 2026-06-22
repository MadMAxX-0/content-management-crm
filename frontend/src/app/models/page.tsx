"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, ModelRow } from "@/lib/api";

const STATUSES = ["All", "Pending", "Approved", "Launched"];
const EMPTY = { name: "", legal_name: "", username: "", email: "", location: "" };

function StatusBadge({ s }: { s: string }) {
  if (s === "Approved") return <span className="badge b-green"><Icon name="check" /> Approved</span>;
  if (s === "Launched") return <span className="badge b-soft"><Icon name="spark" /> Launched</span>;
  return <span className="badge b-amber">Pending</span>;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<ModelRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    setLoading(true);
    try { setModels(await api.listModels()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setF({ ...EMPTY }); setErr(null); setShow(true); };
  const openEdit = (m: ModelRow) => {
    setEditing(m);
    setF({ name: m.name || "", legal_name: m.legal_name || "", username: m.username || "", email: m.email || "", location: m.location || "" });
    setErr(null); setShow(true);
  };

  const save = async () => {
    if (!f.name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr(null);
    try {
      if (editing) await api.updateModel(editing.id, f);
      else await api.createModel(f);
      setShow(false); setEditing(null); setF({ ...EMPTY });
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const approve = async (id: string) => { try { await api.approveModel(id); await load(); } catch (e: any) { setErr(e.message); } };
  const setupFolder = async (id: string) => { try { await api.setupModelFolder(id); await load(); } catch (e: any) { setErr(e.message); } };
  const del = async (id: string, name: string) => {
    if (!confirm(`Remove model "${name}"? (Drive folder is kept.)`)) return;
    try { await api.deleteModel(id); await load(); } catch (e: any) { setErr(e.message); }
  };

  const list = models.filter((m) => filter === "All" || m.status === filter);
  const upd = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Manage Models <span className="count" style={{ verticalAlign: "middle" }}>{models.length} total</span></h1>
          <p>Register and manage all model accounts</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={load}><Icon name="refresh" /> Refresh</button>
          <button className="btn brand" onClick={openCreate}><Icon name="uplus" /> Register Model</button>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span className="sub" style={{ fontWeight: 600 }}>Status</span>
        <div className="seg">
          {STATUSES.map((s) => (
            <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s} ({s === "All" ? models.length : models.filter((m) => m.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {err && <div className="note">{err}</div>}

      <div className="card pad">
        <div className="panel-title">Model List ({list.length})</div>
        <div className="panel-sub">All registered models. Creating one auto-builds its Drive folder.</div>
        {loading ? (
          <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">
            <Icon name="star" />
            <div style={{ fontWeight: 600, color: "#3f3f46" }}>No models yet</div>
            <div className="sub">Click “Register Model” to add one manually.</div>
          </div>
        ) : (
          <table className="tbl">
            <thead><tr>
              <th>Model</th><th>Contact</th><th>Location</th><th>Status</th><th>Progress</th><th>Drive</th><th style={{ textAlign: "right" }}>Actions</th>
            </tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="fav">{m.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="u-name">{m.name}</div>
                        <div className="sub">{m.legal_name || "—"} {m.username ? `· @${m.username.replace(/^@/, "")}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td>{m.email ? <div className="cellrow"><Icon name="user" /> {m.email}</div> : <span className="sub">—</span>}</td>
                  <td>{m.location ? <div className="cellrow"><Icon name="folder" /> {m.location}</div> : <span className="sub">—</span>}</td>
                  <td><StatusBadge s={m.status} /></td>
                  <td><div className="prog"><i style={{ width: `${m.progress || 0}%` }} /></div><div className="sub tnum">{m.progress || 0}%</div></td>
                  <td>
                    {m.drive_folder_id
                      ? <span className="badge b-green"><Icon name="check" /> Folder</span>
                      : <button className="btn sm" onClick={() => setupFolder(m.id)}><Icon name="folderplus" /> Set up folder</button>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      {m.status === "Pending" && <button className="btn brand sm" onClick={() => approve(m.id)}><Icon name="check" /> Approve</button>}
                      <button className="btn sm" onClick={() => openEdit(m)}><Icon name="edit" /> Edit</button>
                      <button className="btn sm danger" onClick={() => del(m.id, m.name)}><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {show && (
        <div className="overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit Model" : "Register Model"}</h3>
            <p className="sub" style={{ margin: "2px 0 0" }}>
              {editing ? "Renaming also renames the model's Drive folder." : "Adds the model to Supabase and auto-creates their Drive folder."}
            </p>
            <div className="form-grid">
              <div className="full"><label className="lbl-f">Name *</label><input className="inp" value={f.name} onChange={(e) => upd("name", e.target.value)} placeholder="Display name" /></div>
              <div><label className="lbl-f">Legal name</label><input className="inp" value={f.legal_name} onChange={(e) => upd("legal_name", e.target.value)} /></div>
              <div><label className="lbl-f">Username</label><input className="inp" value={f.username} onChange={(e) => upd("username", e.target.value)} placeholder="handle" /></div>
              <div><label className="lbl-f">Email</label><input className="inp" value={f.email} onChange={(e) => upd("email", e.target.value)} /></div>
              <div><label className="lbl-f">Location</label><input className="inp" value={f.location} onChange={(e) => upd("location", e.target.value)} /></div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn brand" onClick={save} disabled={busy}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name={editing ? "check" : "plus"} />} {editing ? "Save" : "Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
