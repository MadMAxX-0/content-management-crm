"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, ModelRow, TaskRow, DriveItem, FOLDER_MIME, apiBase, fmtDate } from "@/lib/api";
import { slotsForTask, statusMeta, TYPE_LABEL, TYPE_ICON, Slot } from "@/lib/slots";
import { useAuth } from "@/components/auth-context";

const isImg = (m?: string) => !!m && m.startsWith("image/");

export default function CreatorApp() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Record<string, string>>({}); // folderName -> id
  const [loading, setLoading] = useState(false);
  const { me } = useAuth();
  const isCreator = me?.role === "creator";

  useEffect(() => {
    if (!me) return;
    if (isCreator && me.model_id) {
      // Creators are locked to their own model — no admin model list.
      setModels([{ id: me.model_id, name: me.name, status: "Approved", progress: 0 } as ModelRow]);
      setModelId(me.model_id);
    } else {
      api.listModels().then((m) => {
        setModels(m);
        if (m.length) setModelId((cur) => cur || m[0].id);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const loadTasks = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try { setTasks(await api.listModelTasks(id)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (modelId) { setOpenId(null); loadTasks(modelId); } }, [modelId, loadTasks]);

  const openTask = async (t: TaskRow) => {
    setOpenId(t.id); setFolders({});
    if (t.upload_folder_id) {
      try {
        const r = await api.folder(t.upload_folder_id);
        const map: Record<string, string> = {};
        (r.items || []).filter((x) => x.mimeType === FOLDER_MIME).forEach((f) => (map[f.name] = f.id));
        setFolders(map);
      } catch { /* folders resolve lazily on first upload */ }
    }
  };

  const model = models.find((m) => m.id === modelId);
  const open = tasks.find((t) => t.id === openId) || null;

  return (
    <div className="content creator">
      <div className="page-head">
        <div>
          <h1><Icon name="phone" /> Creator App</h1>
          <p>The creator's view — assigned requests and content upload.</p>
        </div>
        {!isCreator && (
          <div className="cv-as">
            <span className="sub">Viewing as</span>
            <select className="inp" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {models.length === 0 && <option value="">No models</option>}
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {!open ? (
        <TaskList tasks={tasks} loading={loading} model={model} onOpen={openTask} />
      ) : (
        <TaskDetail task={open} modelId={modelId} folders={folders} onBack={() => setOpenId(null)} onChanged={() => loadTasks(modelId)} />
      )}
    </div>
  );
}

function TaskList({ tasks, loading, model, onOpen }: {
  tasks: TaskRow[]; loading: boolean; model?: ModelRow; onOpen: (t: TaskRow) => void;
}) {
  if (loading) return <div className="cv-wrap"><div className="empty-row">Loading…</div></div>;
  if (!model) return <div className="cv-wrap"><div className="empty-row">No model selected.</div></div>;
  return (
    <div className="cv-wrap">
      <div className="cv-greet">
        <span className="fav lg">{model.name.charAt(0).toUpperCase()}</span>
        <div>
          <div className="cv-hi">Hi {model.name} 👋</div>
          <div className="sub">{tasks.length === 0 ? "No assigned tasks yet." : `${tasks.length} assigned ${tasks.length === 1 ? "task" : "tasks"}`}</div>
        </div>
      </div>
      {tasks.map((t) => {
        const sm = statusMeta(t.assignee_status);
        return (
          <button className="cv-task-card" key={t.id} onClick={() => onOpen(t)}>
            <span className="ct-ic"><Icon name={TYPE_ICON[t.type || ""] || "clip"} /></span>
            <span className="ct-main">
              <span className="ct-title">{t.title}</span>
              <span className="ct-sub">{TYPE_LABEL[t.type || ""] || "Task"}{t.due_date ? ` · due ${fmtDate(t.due_date)}` : ""}</span>
            </span>
            <span className={`badge ${sm.cls}`}>{sm.label}</span>
            <Icon name="chevr" className="ct-go" />
          </button>
        );
      })}
    </div>
  );
}

function TaskDetail({ task, modelId, folders, onBack, onChanged }: {
  task: TaskRow; modelId: string; folders: Record<string, string>; onBack: () => void; onChanged: () => void;
}) {
  const d = task.data || {};
  const slots = slotsForTask(task);
  const review = task.review || {};
  const st = task.assignee_status;
  const [busy, setBusy] = useState(false);
  const locked = st === "submitted" || st === "approved";

  const submit = async () => {
    setBusy(true);
    try { await api.submitTask(task.id, modelId); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <div className="cv-wrap">
      <button className="btn sm" onClick={onBack}><Icon name="chevr" style={{ transform: "rotate(180deg)" }} /> Back</button>

      <div className="cv-detail-head">
        <span className="ct-ic lg"><Icon name={TYPE_ICON[task.type || ""] || "clip"} /></span>
        <div>
          <h2>{task.title}</h2>
          <div className="sub">{TYPE_LABEL[task.type || ""] || "Task"}{task.due_date ? ` · due ${fmtDate(task.due_date)}` : ""}</div>
        </div>
      </div>

      {st === "approved" && <div className="cv-status ok"><Icon name="check" /> Approved — great work! 🎉</div>}
      {st === "submitted" && <div className="cv-status wait"><Icon name="check" /> Submitted — awaiting manager review.</div>}
      {st === "changes_requested" && (
        <div className="cv-status redo">
          <Icon name="info" /> Changes requested — please review the notes below and re-upload.
          {review._overall?.note && <div className="cs-note">{review._overall.note}</div>}
        </div>
      )}

      {task.description && <Brief icon="info" title="Brief" body={task.description} />}
      {task.manager_notes && <Brief icon="info" title="Manager's Notes" body={task.manager_notes} />}
      {Array.isArray(d.outfit) && d.outfit.some((o: string) => o?.trim()) &&
        <Brief icon="shirt" title="Outfit Suggestions" body={d.outfit.filter((o: string) => o?.trim()).join("\n\n")} />}
      {d.location && <Brief icon="camera" title="Shooting Location" body={d.location} />}

      <div className="cv-slots-h">Upload your content</div>
      {!task.upload_folder_id ? (
        <div className="empty-row">No upload folder yet — ask your manager to set it up.</div>
      ) : slots.length === 0 ? (
        <UploadSlot folderId={task.upload_folder_id} parentId={task.upload_folder_id} slot={{ label: task.title, folderName: "" }} review={review._overall} locked={locked} />
      ) : (
        slots.map((s) => (
          <UploadSlot key={s.label} folderId={folders[s.folderName]} parentId={task.upload_folder_id!} slot={s} review={review[s.folderName]} locked={locked} />
        ))
      )}

      {task.extra_tips && <Brief icon="bulb" title="Extra Tips" body={task.extra_tips} />}
      {task.captions && <Brief icon="clip" title="Captions" body={task.captions} />}

      {st !== "approved" && (
        <button className="cv-submit" onClick={submit} disabled={busy || st === "submitted"}>
          {busy ? <Icon name="refresh" className="spin" /> : <Icon name="send" />}
          {st === "submitted" ? "Submitted — awaiting review" : st === "changes_requested" ? "Re-submit for review" : "Submit for review"}
        </button>
      )}
    </div>
  );
}

function Brief({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="cv-brief">
      <div className="cb-h"><Icon name={icon} /> {title}</div>
      <div className="cb-b">{body}</div>
    </div>
  );
}

function UploadSlot({ folderId, parentId, slot, review, locked }: {
  folderId?: string; parentId: string; slot: Slot; review?: { state?: string; note?: string }; locked?: boolean;
}) {
  const [fid, setFid] = useState<string | undefined>(folderId);
  const [files, setFiles] = useState<DriveItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(0); // files uploaded in the last action
  useEffect(() => { setFid(folderId); }, [folderId]);

  const load = useCallback(async (id?: string) => {
    const target = id ?? fid;
    if (!target) { setFiles([]); return; }
    try {
      const r = await api.folder(target);
      setFiles((r.items || []).filter((f) => f.mimeType !== FOLDER_MIME));
    } catch { setFiles([]); }
  }, [fid]);
  useEffect(() => { load(); }, [load]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl?.length) return;
    setBusy(true); setErr(null); setJustAdded(0);
    try {
      let target = fid;
      if (!target) {
        target = slot.folderName ? (await api.createSubfolder(parentId, slot.folderName)).id : parentId;
        setFid(target);
      }
      if (!target) return;
      for (const f of Array.from(fl)) await api.uploadFile(target, f);
      await load(target);
      setJustAdded(fl.length);
    } catch (e: any) {
      setErr(e?.message?.includes("401") || e?.message?.includes("403")
        ? "Upload not allowed — please sign out and back in."
        : "Upload failed. Check your connection and try again.");
    } finally { setBusy(false); e.target.value = ""; }
  };

  const count = files?.length ?? 0;
  const redo = review?.state === "redo";
  const approved = review?.state === "approved";
  return (
    <div className={`cv-slot ${redo ? "redo" : ""} ${approved ? "ok" : ""}`}>
      <div className="cs-head">
        <div className="cs-label"><Icon name="folder" /> {slot.label}</div>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {approved && <span className="badge b-green"><Icon name="check" /> Approved</span>}
          {redo && <span className="badge b-amber">Redo</span>}
          {count > 0 && <span className="badge b-green"><Icon name="check" /> {count}</span>}
        </span>
      </div>
      {slot.instruction && <div className="cs-inst">{slot.instruction}</div>}
      {(slot.outfit || slot.location) && (
        <div className="cs-meta">
          {slot.outfit && <div><Icon name="shirt" /> {slot.outfit}</div>}
          {slot.location && <div><Icon name="camera" /> {slot.location}</div>}
        </div>
      )}
      {redo && review?.note && <div className="cs-note">{review.note}</div>}

      {files && files.length > 0 && (
        <div className="slot-files">
          {files.map((f) => (
            // Always open files THROUGH the backend (agency-served) — creators
            // have no direct Drive access, so never link to Drive's webViewLink.
            <a className="sf" key={f.id} href={apiBase + `/api/file/${f.id}/content`} target="_blank" rel="noreferrer" title={f.name}>
              {isImg(f.mimeType)
                ? <img src={apiBase + `/api/file/${f.id}/content`} alt={f.name} />
                : <span className="sf-file"><Icon name={f.mimeType?.startsWith("video/") ? "video" : "clip"} /></span>}
            </a>
          ))}
        </div>
      )}

      {err && <div className="cs-note" style={{ background: "#fff0f0", color: "#c0392b" }}>{err}</div>}

      {justAdded > 0 && !busy && (
        <div className="cs-ok"><Icon name="check" /> {justAdded} {justAdded === 1 ? "file" : "files"} uploaded to {slot.label}</div>
      )}

      {!locked && (
        <label className={`upload-tile ${busy ? "busy" : ""}`}>
          <input type="file" multiple accept="image/*,video/*" onChange={onPick} disabled={busy} hidden />
          {busy ? <><Icon name="refresh" className="spin" /> Uploading to {slot.label}…</>
            : <><Icon name="upload" /> {count > 0 ? `Add more to ${slot.label}` : `Upload to ${slot.label}`}</>}
        </label>
      )}
    </div>
  );
}
