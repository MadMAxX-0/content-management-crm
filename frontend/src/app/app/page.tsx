"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, ModelRow, TaskRow, DriveItem, FOLDER_MIME, apiBase, fmtDate } from "@/lib/api";
import { slotsForTask, statusMeta, TYPE_ICON, Slot } from "@/lib/slots";
import { useAuth } from "@/components/auth-context";
import { useAppLang, LANGS, Lang, TFn, ST_KEY, TYPE_KEY } from "@/lib/appLang";

const isImg = (m?: string) => !!m && m.startsWith("image/");
const typeLabel = (t: TFn, type?: string | null) => t(TYPE_KEY[type || ""] || "typeTask");
const statusLabel = (t: TFn, s?: string) => t(ST_KEY[s || ""] || "stTodo");

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="cv-lang">
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

export default function CreatorApp() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Record<string, string>>({}); // folderName -> id
  const [loading, setLoading] = useState(false);
  const { me } = useAuth();
  const { lang, setLang, t } = useAppLang();
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

  const openTask = async (tk: TaskRow) => {
    setOpenId(tk.id); setFolders({});
    if (tk.upload_folder_id) {
      try {
        const r = await api.folder(tk.upload_folder_id);
        const map: Record<string, string> = {};
        (r.items || []).filter((x) => x.mimeType === FOLDER_MIME).forEach((f) => (map[f.name] = f.id));
        setFolders(map);
      } catch { /* folders resolve lazily on first upload */ }
    }
  };

  const model = models.find((m) => m.id === modelId);
  const open = tasks.find((tk) => tk.id === openId) || null;

  return (
    <div className="content creator">
      <div className="page-head">
        <div>
          <h1><Icon name="phone" /> {t("headTitle")}</h1>
          <p>{t("headSub")}</p>
        </div>
        <div className="cv-head-tools">
          <LangSwitch lang={lang} setLang={setLang} />
          {!isCreator && (
            <div className="cv-as">
              <span className="sub">{t("viewingAs")}</span>
              <select className="inp" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                {models.length === 0 && <option value="">No models</option>}
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="cv-phone">
        <div className="cv-island" />
        <div className="cv-statusbar">
          <span className="cv-time">9:41</span>
          <span className="cv-sys">
            <span className="cv-sig"><i /><i /><i /><i /></span>
            <span className="cv-5g">5G</span>
            <span className="cv-batt" />
          </span>
        </div>
        <div className="cv-screen">
          {!open ? (
            <TaskList tasks={tasks} loading={loading} model={model} onOpen={openTask} t={t} />
          ) : (
            <TaskDetail task={open} modelId={modelId} folders={folders} t={t} onBack={() => setOpenId(null)} onChanged={() => loadTasks(modelId)} />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskList({ tasks, loading, model, onOpen, t }: {
  tasks: TaskRow[]; loading: boolean; model?: ModelRow; onOpen: (t: TaskRow) => void; t: TFn;
}) {
  if (loading) return <div className="cv-wrap"><div className="empty-row">{t("loading")}</div></div>;
  if (!model) return <div className="cv-wrap"><div className="empty-row">{t("noModel")}</div></div>;
  return (
    <div className="cv-wrap">
      <div className="cv-greet">
        <span className="fav lg">{model.name.charAt(0).toUpperCase()}</span>
        <div>
          <div className="cv-hi">{t("greet", { name: model.name })}</div>
          <div className="sub">{tasks.length === 0 ? t("noTasks") : t(tasks.length === 1 ? "taskCount_one" : "taskCount_other", { n: tasks.length })}</div>
        </div>
      </div>
      {tasks.map((tk) => {
        const sm = statusMeta(tk.assignee_status);
        return (
          <button className={`cv-task-card st-${tk.assignee_status || "todo"}`} key={tk.id} onClick={() => onOpen(tk)}>
            <span className="ct-ic"><Icon name={TYPE_ICON[tk.type || ""] || "clip"} /></span>
            <span className="ct-main">
              <span className="ct-title">{tk.title}</span>
              <span className="ct-sub">{typeLabel(t, tk.type)}{tk.due_date ? ` · ${t("due", { date: fmtDate(tk.due_date) })}` : ""}</span>
            </span>
            <span className={`badge ${sm.cls}`}>{statusLabel(t, tk.assignee_status)}</span>
            <Icon name="chevr" className="ct-go" />
          </button>
        );
      })}
    </div>
  );
}

function TaskDetail({ task, modelId, folders, t, onBack, onChanged }: {
  task: TaskRow; modelId: string; folders: Record<string, string>; t: TFn; onBack: () => void; onChanged: () => void;
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
      <button className="btn sm" onClick={onBack}><Icon name="chevr" style={{ transform: "rotate(180deg)" }} /> {t("back")}</button>

      <div className="cv-detail-head">
        <span className="ct-ic lg"><Icon name={TYPE_ICON[task.type || ""] || "clip"} /></span>
        <div>
          <h2>{task.title}</h2>
          <div className="sub">{typeLabel(t, task.type)}{task.due_date ? ` · ${t("due", { date: fmtDate(task.due_date) })}` : ""}</div>
        </div>
      </div>

      {st === "approved" && <div className="cv-status ok"><Icon name="check" /> {t("statusApproved")}</div>}
      {st === "submitted" && <div className="cv-status wait"><Icon name="check" /> {t("statusSubmitted")}</div>}
      {st === "changes_requested" && (
        <div className="cv-status redo">
          <Icon name="info" /> {t("statusChanges")}
          {review._overall?.note && <div className="cs-note">{review._overall.note}</div>}
        </div>
      )}

      {task.description && <Brief icon="info" title={t("briefBrief")} body={task.description} />}
      {task.manager_notes && <Brief icon="info" title={t("briefNotes")} body={task.manager_notes} />}
      {Array.isArray(d.outfit) && d.outfit.some((o: string) => o?.trim()) &&
        <Brief icon="shirt" title={t("briefOutfit")} body={d.outfit.filter((o: string) => o?.trim()).join("\n\n")} />}
      {d.location && <Brief icon="camera" title={t("briefLocation")} body={d.location} />}

      <div className="cv-slots-h">{t("uploadHeader")}</div>
      {!task.upload_folder_id ? (
        <div className="empty-row">{t("noFolder")}</div>
      ) : slots.length === 0 ? (
        <UploadSlot folderId={task.upload_folder_id} parentId={task.upload_folder_id} slot={{ label: task.title, folderName: "" }} review={review._overall} locked={locked} t={t} />
      ) : (
        slots.map((s) => (
          <UploadSlot key={s.label} folderId={folders[s.folderName]} parentId={task.upload_folder_id!} slot={s} review={review[s.folderName]} locked={locked} t={t} />
        ))
      )}

      {task.extra_tips && <Brief icon="bulb" title={t("briefTips")} body={task.extra_tips} />}
      {task.captions && <Brief icon="clip" title={t("briefCaptions")} body={task.captions} />}

      {st !== "approved" && (
        <button className="cv-submit" onClick={submit} disabled={busy || st === "submitted"}>
          {busy ? <Icon name="refresh" className="spin" /> : <Icon name="send" />}
          {st === "submitted" ? t("submittedWait") : st === "changes_requested" ? t("resubmit") : t("submit")}
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

function UploadSlot({ folderId, parentId, slot, review, locked, t }: {
  folderId?: string; parentId: string; slot: Slot; review?: { state?: string; note?: string }; locked?: boolean; t: TFn;
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
        ? t("uploadErrAuth")
        : t("uploadErrFail"));
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
          {approved && <span className="badge b-green"><Icon name="check" /> {t("badgeApproved")}</span>}
          {redo && <span className="badge b-amber">{t("badgeRedo")}</span>}
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
        <div className="cs-ok"><Icon name="check" /> {t(justAdded === 1 ? "uploadedFiles_one" : "uploadedFiles_other", { n: justAdded, label: slot.label })}</div>
      )}

      {!locked && (
        <label className={`upload-tile ${busy ? "busy" : ""}`}>
          <input type="file" multiple accept="image/*,video/*" onChange={onPick} disabled={busy} hidden />
          {busy ? <><Icon name="refresh" className="spin" /> {t("uploadingTo", { label: slot.label })}</>
            : <><Icon name="upload" /> {count > 0 ? t("addMoreTo", { label: slot.label }) : t("uploadTo", { label: slot.label })}</>}
        </label>
      )}
    </div>
  );
}
