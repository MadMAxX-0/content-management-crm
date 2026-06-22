"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { api, TaskRow, DriveItem, FOLDER_MIME, apiBase } from "@/lib/api";
import { slotsForTask, statusMeta } from "@/lib/slots";

const isImg = (m?: string) => !!m && m.startsWith("image/");
type Assignee = NonNullable<TaskRow["assignees"]>[number];

export default function ReviewModal({
  task, onClose, onReviewed,
}: { task: TaskRow; onClose: () => void; onReviewed: () => void }) {
  const assignees = task.assignees || [];
  const firstSubmitted = assignees.find((a) => a.status === "submitted") || assignees[0];
  const [sel, setSel] = useState<Assignee | undefined>(firstSubmitted);
  const [folders, setFolders] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, { state: string; note: string }>>({});
  const [overall, setOverall] = useState("");
  const [busy, setBusy] = useState(false);

  const slots = slotsForTask(task);

  useEffect(() => {
    if (!sel) return;
    setMarks((sel.review && typeof sel.review === "object" ? sel.review : {}) as any);
    setOverall(sel.review?._overall?.note || "");
    setFolders({});
    if (sel.upload_folder_id) {
      api.folder(sel.upload_folder_id).then((r) => {
        const map: Record<string, string> = {};
        (r.items || []).filter((x) => x.mimeType === FOLDER_MIME).forEach((f) => (map[f.name] = f.id));
        setFolders(map);
      }).catch(() => {});
    }
  }, [sel]);

  const mark = (slot: string, state: string) =>
    setMarks((m) => ({ ...m, [slot]: { state, note: m[slot]?.note || "" } }));
  const note = (slot: string, note: string) =>
    setMarks((m) => ({ ...m, [slot]: { state: m[slot]?.state || "redo", note } }));

  const send = async (status: string) => {
    if (!sel) return;
    setBusy(true);
    try {
      const review: any = { ...marks, _overall: { note: overall } };
      if (status === "approved") slots.forEach((s) => { review[s.folderName] = { state: "approved", note: review[s.folderName]?.note || "" }; });
      await api.reviewTask(task.id, { model_id: sel.id, status, review });
      onReviewed();
    } finally { setBusy(false); }
  };

  const sm = statusMeta(sel?.status);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal review-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="eye" style={{ width: 18, height: 18, color: "var(--brand)" }} /> Review Submission
            </h3>
            <p className="sub" style={{ margin: "4px 0 0" }}>{task.title}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex" }}><Icon name="x" /></button>
        </div>

        {assignees.length > 1 && (
          <div className="rv-people">
            {assignees.map((a) => (
              <button key={a.id} className={`chip ${sel?.id === a.id ? "on" : ""}`} onClick={() => setSel(a)}>
                <span className="avmini">{a.name.charAt(0).toUpperCase()}</span>{a.name}
                <span className={`badge ${statusMeta(a.status).cls}`} style={{ marginLeft: 4 }}>{statusMeta(a.status).label}</span>
              </button>
            ))}
          </div>
        )}

        {!sel ? <div className="empty-row">No one assigned.</div> : (
          <>
            <div className="rv-status"><span className="sub">{sel.name}'s submission</span><span className={`badge ${sm.cls}`}>{sm.label}</span></div>

            {slots.length === 0 && <div className="empty-row">This task type has no review slots.</div>}
            {slots.map((s) => (
              <SlotReview
                key={s.label}
                label={s.label}
                instruction={s.instruction}
                folderId={folders[s.folderName]}
                mark={marks[s.folderName]}
                onApprove={() => mark(s.folderName, "approved")}
                onRedo={() => mark(s.folderName, "redo")}
                onNote={(v) => note(s.folderName, v)}
              />
            ))}

            <label className="fld-l" style={{ marginTop: 14 }}>Overall note (optional)</label>
            <textarea className="inp" value={overall} onChange={(e) => setOverall(e.target.value)} placeholder="Summary feedback for the creator…" />

            <div className="btn-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn danger" onClick={() => send("changes_requested")} disabled={busy}><Icon name="refresh" /> Request changes</button>
              <button className="btn brand" onClick={() => send("approved")} disabled={busy}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name="check" />} Approve
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SlotReview({ label, instruction, folderId, mark, onApprove, onRedo, onNote }: {
  label: string; instruction?: string; folderId?: string;
  mark?: { state: string; note: string }; onApprove: () => void; onRedo: () => void; onNote: (v: string) => void;
}) {
  const [files, setFiles] = useState<DriveItem[] | null>(null);
  const load = useCallback(async () => {
    if (!folderId) { setFiles([]); return; }
    try { const r = await api.folder(folderId); setFiles((r.items || []).filter((f) => f.mimeType !== FOLDER_MIME)); }
    catch { setFiles([]); }
  }, [folderId]);
  useEffect(() => { load(); }, [load]);

  const state = mark?.state;
  return (
    <div className={`rv-slot ${state === "approved" ? "ok" : state === "redo" ? "redo" : ""}`}>
      <div className="cs-head">
        <div className="cs-label"><Icon name="folder" /> {label}</div>
        <span style={{ display: "inline-flex", gap: 5 }}>
          <button className={`btn icon sm ${state === "approved" ? "on-ok" : ""}`} title="Approve" onClick={onApprove}><Icon name="check" /></button>
          <button className={`btn icon sm ${state === "redo" ? "on-redo" : ""}`} title="Needs redo" onClick={onRedo}><Icon name="refresh" /></button>
        </span>
      </div>
      {instruction && <div className="cs-inst" style={{ color: "var(--muted)" }}>{instruction}</div>}
      {files && files.length > 0 ? (
        <div className="slot-files">
          {files.map((f) => (
            <a className="sf" key={f.id} href={f.webViewLink || apiBase + `/api/file/${f.id}/content`} target="_blank" rel="noreferrer" title={f.name}>
              {isImg(f.mimeType) ? <img src={apiBase + `/api/file/${f.id}/content`} alt={f.name} /> : <span className="sf-file"><Icon name={f.mimeType?.startsWith("video/") ? "video" : "clip"} /></span>}
            </a>
          ))}
        </div>
      ) : <div className="rv-empty">No content uploaded for this slot.</div>}
      {state === "redo" && (
        <input className="inp" style={{ marginTop: 8 }} value={mark?.note || ""} onChange={(e) => onNote(e.target.value)} placeholder="What needs to change?" />
      )}
    </div>
  );
}
