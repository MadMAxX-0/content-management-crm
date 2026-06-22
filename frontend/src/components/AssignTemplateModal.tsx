"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import FolderSelect from "./FolderSelect";
import { api, DriveStatus, ModelRow, TaskRow } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  detailed: "Detailed", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long", images_videos: "Media Gallery", swipe: "Swipe",
};

export default function AssignTemplateModal({
  template, models, onClose, onAssigned,
}: { template: TaskRow; models: ModelRow[]; onClose: () => void; onAssigned: () => void }) {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState(template.priority || "medium");
  const [notes, setNotes] = useState("");
  const [targetFolders, setTargetFolders] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.status().then(setStatus).catch(() => {}); }, []);

  const toggle = (id: string) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const shown = models.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const connected = !!status?.connected;
  const tags = Array.isArray(template.tags) ? template.tags : [];

  const assign = async () => {
    if (!assignees.length) { setErr("Pick at least one model"); return; }
    setBusy(true); setErr(null);
    try {
      const managerNotes = [template.manager_notes, notes].filter((s) => s && s.trim()).join("\n\n") || null;
      await api.createTask({
        title: template.title,
        description: template.description,
        type: template.type,
        priority,
        status: "todo",
        due_date: due,
        tags,
        manager_notes: managerNotes,
        extra_tips: template.extra_tips,
        captions: template.captions,
        is_template: false,
        data: { ...(template.data || {}), targetFolders },
        assignees,
      });
      onAssigned();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="send" style={{ width: 18, height: 18, color: "var(--brand)" }} /> Quick Assign Template
            </h3>
            <p className="sub" style={{ margin: "4px 0 0" }}>Assign “{template.title}” to one or more models.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex" }}><Icon name="x" /></button>
        </div>

        {err && <div className="note" style={{ marginBottom: 12 }}>{err}</div>}

        {/* template summary */}
        <div className="assign-summary">
          <div className="as-name">{template.title}</div>
          <div className="as-tags">
            {template.type && <span className="tagmini">{TYPE_LABELS[template.type] || template.type}</span>}
            {tags.map((t) => <span className="tagmini" key={t}>{t}</span>)}
            <span className="tagmini">{priority}</span>
          </div>
        </div>

        <label className="fld-l" style={{ marginTop: 14 }}><Icon name="users" style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> Assign to Models *</label>
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <Icon name="search" /><input placeholder="Search models by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="modellist" style={{ marginTop: 8 }}>
          {shown.length === 0 ? <div className="modelrow"><span className="sub">No models</span></div> :
            shown.map((m) => (
              <label className="modelrow" key={m.id}>
                <input type="checkbox" checked={assignees.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="av fav">{m.name.charAt(0).toUpperCase()}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                  <div className="me">{m.email || ""}</div>
                </span>
              </label>
            ))}
        </div>

        <div className="grp" style={{ marginTop: 14 }}>
          <label className="fld-l">Due Date (Optional)</label>
          <input className="inp" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <div className="grp" style={{ marginTop: 14 }}>
          <label className="fld-l"><Icon name="folder" style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> Google Drive — Target Folder</label>
          {status && !connected && (
            <div className="note" style={{ marginBottom: 8 }}><Icon name="info" style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> Company Google Drive is not connected. Please contact your administrator.</div>
          )}
          {assignees.length === 0 ? (
            <div className="connect-ok"><Icon name="check" /> Select models above to choose where their content lands on Drive.</div>
          ) : (
            <>
              <div className="sub" style={{ marginBottom: 4 }}>The upload folder “{template.title}” is created inside the folder you pick. Defaults to each model’s Root folder.</div>
              {assignees.map((mid) => {
                const m = models.find((x) => x.id === mid);
                if (!m) return null;
                return (
                  <FolderSelect
                    key={mid}
                    model={m}
                    value={targetFolders[mid]}
                    onChange={(fid) => setTargetFolders((s) => ({ ...s, [mid]: fid }))}
                  />
                );
              })}
            </>
          )}
        </div>

        <div className="grp" style={{ marginTop: 14 }}>
          <label className="fld-l">Priority</label>
          <select className="inp" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>

        <div className="grp">
          <label className="fld-l">Notes (Optional)</label>
          <input className="inp" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add assignment notes for the model" />
        </div>

        <div className="btn-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={assign} disabled={busy}>
            {busy ? <Icon name="refresh" className="spin" /> : <Icon name="send" />}
            Assign Template
          </button>
        </div>
      </div>
    </div>
  );
}
