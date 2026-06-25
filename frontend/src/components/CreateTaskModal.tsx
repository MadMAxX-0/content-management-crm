"use client";
import { useState } from "react";
import Icon from "./Icon";
import FolderSelect from "./FolderSelect";
import { api, ModelRow, TaskRow } from "@/lib/api";

const TYPE_ICONS: Record<string, string> = {
  detailed: "image", video: "video", ppv_sequence: "image",
  ppv_long: "video", images_videos: "image", swipe: "heart",
};

const TASK_TYPES = [
  { key: "detailed", label: "Detailed - Per-Media Instructions", hint: "Detailed per-media instructions", extras: ["media"] },
  { key: "video", label: "Video - Video Content Only", hint: "Video content for TikTok, Instagram Reels", extras: ["outfit", "location", "gallery"] },
  { key: "ppv_sequence", label: "PPV Sequence", hint: "Teasing base + up to 10 PPV parts", extras: ["teasing", "outfit", "location"] },
  { key: "ppv_long", label: "PPV Long Video", hint: "Long-form PPV video", extras: ["outfit", "location", "gallery"] },
  { key: "images_videos", label: "Media Gallery - Images & Videos", hint: "Multiple images and videos for social media content", extras: ["outfit", "location", "gallery"] },
  { key: "swipe", label: "Swipe - Multi Photos", hint: "Multiple photos to swipe", extras: ["swipe"] },
];

const SECTION_META: Record<string, { label: string; icon: string }> = {
  core: { label: "Core Information", icon: "doc" },
  assignment: { label: "Assignment & Scheduling", icon: "users" },
  upload: { label: "File Upload Settings", icon: "database" },
  notes: { label: "Manager's Notes", icon: "info" },
  media: { label: "Media Details", icon: "image" },
  teasing: { label: "Teasing & Parts", icon: "image" },
  outfit: { label: "Outfit Suggestions", icon: "shirt" },
  location: { label: "Shooting Location", icon: "camera" },
  gallery: { label: "Task Gallery", icon: "image" },
  swipe: { label: "Images to Swipe", icon: "image" },
  tips: { label: "Extra Tips", icon: "bulb" },
  captions: { label: "Captions", icon: "clip" },
};

function sectionsFor(type: string, isTemplate: boolean) {
  const t = TASK_TYPES.find((x) => x.key === type);
  // Templates are reusable blueprints — they aren't assigned, scheduled, or folder-bound,
  // so Assignment, File Upload, and Recurring settings don't apply.
  const lead = isTemplate ? ["core"] : ["core", "assignment", "upload"];
  return [...lead, "notes", ...(t?.extras || []), "tips", "captions"];
}

export default function CreateTaskModal({
  models, onClose, onCreated, editing,
}: { models: ModelRow[]; onClose: () => void; onCreated: () => void; editing?: TaskRow }) {
  const isEdit = !!editing;
  const [type, setType] = useState(editing?.type || "detailed");
  const [form, setForm] = useState({
    title: editing?.title || "", description: editing?.description || "",
    priority: editing?.priority || "medium", due_date: editing?.due_date || "",
    status: editing?.status || "todo",
    is_template: editing?.is_template ?? false,
    manager_notes: editing?.manager_notes || "", extra_tips: editing?.extra_tips || "",
    captions: editing?.captions || "",
  });
  const [assignees, setAssignees] = useState<string[]>(editing?.assignees?.map((a) => a.id) || []);
  const [tags, setTags] = useState<string[]>(editing?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [data, setData] = useState<any>(() => {
    const base = { outfit: [""], location: "", media: [], teasing: "", parts: [], swipe: "", targetFolders: {} };
    const d = { ...base, ...(editing?.data || {}) };
    if (!Array.isArray(d.outfit) || d.outfit.length === 0) d.outfit = [""];
    return d;
  });
  const [active, setActive] = useState("core");
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({ core: true, assignment: true, upload: true });
  const [modelQuery, setModelQuery] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sections = sectionsFor(type, form.is_template);
  const set = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));
  const setD = (k: string, v: any) => setData((s: any) => ({ ...s, [k]: v }));

  const compl = (id: string): number => {
    switch (id) {
      case "core": return (form.title ? 40 : 0) + 30 + (form.description ? 30 : 0);
      case "assignment": return (assignees.length ? 60 : 0) + (form.due_date ? 40 : 0);
      case "upload": return 100;
      case "notes": return form.manager_notes ? 100 : 0;
      case "tips": return form.extra_tips ? 100 : 0;
      case "captions": return form.captions ? 100 : 0;
      case "outfit": return data.outfit?.some((o: string) => o.trim()) ? 100 : 0;
      case "location": return data.location ? 100 : 0;
      case "media": return data.media?.length ? 100 : 0;
      case "teasing": return (data.teasing?.trim() || data.parts?.length) ? 100 : 0;
      case "swipe": return data.swipe ? 100 : 0;
      default: return 0;
    }
  };

  const openAndScroll = (id: string) => {
    setActive(id);
    setOpenSec((s) => ({ ...s, [id]: true }));
    setTimeout(() => document.getElementById("sec-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };
  const toggleSec = (id: string) => setOpenSec((s) => ({ ...s, [id]: !s[id] }));
  const nextSection = () => {
    const i = sections.indexOf(active);
    if (i < sections.length - 1) openAndScroll(sections[i + 1]);
  };
  const addTag = () => { const t = tagInput.trim(); if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); } };
  const toggleModel = (id: string) => setAssignees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const submit = async () => {
    if (!form.title.trim()) { setErr("Title is required"); openAndScroll("core"); return; }
    setBusy(true); setErr(null);
    try {
      const payload = { ...form, type, tags, assignees, data };
      if (isEdit) await api.updateTask(editing!.id, payload);
      else await api.createTask(payload);
      onCreated();
    }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const typeDef = TASK_TYPES.find((t) => t.key === type);
  const shownModels = models.filter((m) => m.name.toLowerCase().includes(modelQuery.toLowerCase()));

  // Reusable "Reference Images" block: description lives in the parent; this is the
  // example-media attachment (From Gallery / Upload New) the manager adds to guide the shoot.
  const refBlock = (emptyText: string) => (
    <div className="refbox">
      <div className="ref-l">Reference Images</div>
      <div className="dropzone"><Icon name="image" /> {emptyText}</div>
      <div className="mini-btns split">
        <button className="btn sm" type="button"><Icon name="gallery" /> From Gallery</button>
        <button className="btn sm" type="button"><Icon name="upload" /> Upload New</button>
      </div>
    </div>
  );

  const sec = (id: string, children: React.ReactNode) => {
    const meta = SECTION_META[id];
    const open = openSec[id] ?? false;
    return (
      <div className="tm-section" id={"sec-" + id}>
        <button className="tm-sec-head" onClick={() => toggleSec(id)}>
          <h4><Icon name={meta.icon} /> {meta.label}</h4>
          <span className="tm-sec-r"><span className="pct">{compl(id)}%</span><Icon name={open ? "chevu" : "chevd"} className="chv" /></span>
        </button>
        {open && <div className="tm-sec-body">{children}</div>}
      </div>
    );
  };

  return (
    <div className="overlay">
      <div className="task-modal">
        <div className="tm-head">
          <h3>{isEdit ? (form.is_template ? "Edit Template" : "Edit Task") : "Create New Task or Template"}</h3>
          <p>{isEdit ? "Update the details and save your changes." : "Fill in the details to create a new task or template."}</p>
          <button className="x" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="tm-body">
          <div className="tm-nav">
            <div className="lab">Navigation</div>
            {sections.map((id) => (
              <button key={id} className={`sec ${openSec[id] ? "open" : ""}`} onClick={() => openAndScroll(id)}>
                <Icon name={SECTION_META[id].icon} /> {SECTION_META[id].label}
                <span className="pct">{compl(id)}%</span>
              </button>
            ))}
            <button className="next-sec" onClick={nextSection}><Icon name="chevr" /> Next Section</button>
            <div className="tm-foot">
              <button className="btn brand" style={{ width: "100%", justifyContent: "center" }} onClick={submit} disabled={busy}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name={isEdit ? "check" : "plus"} />}
                {isEdit ? "Save Changes" : form.is_template ? "Create Template" : "Create Task"}
              </button>
            </div>
          </div>

          <div className="tm-main">
            {err && <div className="note">{err}</div>}

            {sec("core", <>
              <div className="sd">Define the main purpose and type of this task or template.</div>
              <div className="grp"><label className="fld-l">Title *</label>
                <input className="inp" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g., Weekly Content Batch, Special Promo Shoot" /></div>
              <div className="grp"><label className="fld-l">Task Type *</label>
                <div className="typesel">
                  <button className="inp typesel-btn" onClick={() => setTypeOpen((v) => !v)}>
                    <Icon name={TYPE_ICONS[type]} /> <span style={{ flex: 1 }}>{typeDef?.label}</span> <Icon name="chevd" className="ch" />
                  </button>
                  {typeOpen && (
                    <>
                      <div className="backdrop" onClick={() => setTypeOpen(false)} />
                      <div className="typesel-menu">
                        {TASK_TYPES.map((t) => (
                          <button key={t.key} className={type === t.key ? "sel" : ""} onClick={() => { setType(t.key); setTypeOpen(false); }}>
                            <Icon name={TYPE_ICONS[t.key]} /> {t.label}
                            {type === t.key && <Icon name="check" className="ck" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="sub" style={{ marginTop: 5 }}>{typeDef?.hint}</div></div>
              <div className="grp"><label className="fld-l">Description</label>
                <textarea className="inp" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detailed explanation of the task requirements…" /></div>
              <div className="grp"><label className="fld-l">Tags</label>
                <input className="inp" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag and press enter or comma" />
                {tags.length > 0 && <div className="tags-wrap">{tags.map((t) => (
                  <span className="tag" key={t}>{t}<button onClick={() => setTags(tags.filter((x) => x !== t))}><Icon name="x" /></button></span>
                ))}</div>}</div>
              <label className="chk"><input type="checkbox" checked={form.is_template} onChange={(e) => set("is_template", e.target.checked)} /> Save as Reusable Template</label>
            </>)}

            {sections.includes("assignment") && sec("assignment", <>
              <div className="sd">Assign to one or more models and set scheduling details for this task.</div>
              <div className="form-grid">
                <div>
                  <label className="fld-l">Assign to Models *</label>
                  <div className="search-bar" style={{ marginBottom: 0 }}><Icon name="search" /><input placeholder="Search models by name…" value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} /></div>
                  <div className="modellist">
                    {shownModels.length === 0 ? <div className="modelrow"><span className="sub">No models</span></div> :
                      shownModels.map((m) => (
                        <label className="modelrow" key={m.id}>
                          <input type="checkbox" checked={assignees.includes(m.id)} onChange={() => toggleModel(m.id)} />
                          <span className="av fav">{m.name.charAt(0).toUpperCase()}</span>
                          <span style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span><div className="me">{m.email || ""}</div></span>
                        </label>
                      ))}
                  </div>
                </div>
                <div>
                  <label className="fld-l">Status</label>
                  <select className="inp" value={form.status} onChange={(e) => set("status", e.target.value)}>
                    <option value="todo">Todo</option><option value="in_progress">In Progress</option><option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div><label className="fld-l">Due Date</label><input className="inp" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
                <div><label className="fld-l">Priority</label>
                  <select className="inp" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select></div>
              </div>
            </>)}

            {sections.includes("upload") && sec("upload", <>
              <div className="sd">Choose how files will be uploaded and where they'll be stored.</div>
              <label className="fld-l">Upload Type *</label>
              <select className="inp" defaultValue="google_drive"><option value="google_drive">Google Drive</option></select>
              <div className="sub" style={{ marginTop: 6 }}>Files will be uploaded to the company Google Drive folder.</div>
              {assignees.length === 0 ? (
                <div className="connected-box">Select models first to configure target folders.</div>
              ) : (
                <div className="grp" style={{ marginTop: 14 }}>
                  <label className="fld-l"><Icon name="folder" style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> Target Folders (per model) *</label>
                  <div className="sub">Browse and select a target folder for each model. The upload folder <b>"{form.title || "<task>"}"</b> is created inside it.</div>
                  {assignees.map((mid) => {
                    const m = models.find((x) => x.id === mid);
                    if (!m) return null;
                    return (
                      <FolderSelect
                        key={mid}
                        model={m}
                        value={data.targetFolders?.[mid]}
                        onChange={(fid) => setD("targetFolders", { ...(data.targetFolders || {}), [mid]: fid })}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 10 }}><span className="badge b-green"><Icon name="check" /> Company Google Drive connected</span></div>
            </>)}

            {sec("notes", <>
              <div className="sd">Internal notes or specific instructions for the model regarding this task.</div>
              <textarea className="inp" value={form.manager_notes} onChange={(e) => set("manager_notes", e.target.value)} placeholder="e.g., Focus on the morning light for this shoot…" />
            </>)}

            {sections.includes("outfit") && sec("outfit", <>
              <div className="sd">Guide the model on what to wear. Add multiple options if needed.</div>
              {data.outfit.map((o: string, i: number) => (
                <div className="repeat-item" key={i}>
                  {data.outfit.length > 1 && <button className="rm" onClick={() => setD("outfit", data.outfit.filter((_: any, j: number) => j !== i))}><Icon name="x" /></button>}
                  <label className="fld-l">Outfit Option {i + 1}</label>
                  <textarea className="inp" value={o} placeholder="e.g., 'A stylish black dress with high heels…'"
                    onChange={(e) => setD("outfit", data.outfit.map((x: string, j: number) => (j === i ? e.target.value : x)))} />
                  {refBlock("No outfit media added yet")}
                </div>
              ))}
              <button className="btn sm" onClick={() => setD("outfit", [...data.outfit, ""])}><Icon name="plus" /> Add another outfit</button>
            </>)}

            {sections.includes("location") && sec("location", <>
              <div className="sd">Provide details about where the content should be created.</div>
              <label className="fld-l">Location Details</label>
              <textarea className="inp" value={data.location} onChange={(e) => setD("location", e.target.value)} placeholder="e.g., 'A modern apartment with good natural light…'" />
              {refBlock("No location media added yet")}
            </>)}

            {sections.includes("media") && sec("media", <>
              <div className="sd">Add individual photos or videos with their own description and notes.</div>
              {data.media.length === 0 && <div className="connected-box" style={{ marginBottom: 12 }}>No media yet — click “Add Media” to add per-media instructions.</div>}
              {data.media.map((md: any, i: number) => {
                const upd = (field: string, val: any) => setD("media", data.media.map((x: any, j: number) => (j === i ? { ...x, [field]: val } : x)));
                return (
                  <div className="media-card" key={i}>
                    <button className="rm" onClick={() => setD("media", data.media.filter((_: any, j: number) => j !== i))}><Icon name="x" /></button>
                    <div className="mc-title">Media {i + 1}</div>
                    <div className="media-top">
                      <div className="media-thumb">No media</div>
                      <div className="media-actions">
                        <div className="mini-btns">
                          <button className="btn sm"><Icon name="upload" /> Upload</button>
                          <button className="btn sm"><Icon name="gallery" /> Gallery</button>
                        </div>
                        <label className="fld-l">Description for this media</label>
                        <textarea className="inp" value={md.description || ""} placeholder="Describe what this specific photo or video should contain…"
                          onChange={(e) => upd("description", e.target.value)} />
                      </div>
                    </div>
                    <div className="media-sub">
                      <div className="sl"><Icon name="shirt" /> Outfit Suggestions</div>
                      <textarea className="inp" value={md.outfit || ""} placeholder="Outfit suggestion 1…" onChange={(e) => upd("outfit", e.target.value)} />
                      <div className="dropzone"><Icon name="image" /> No outfit media added yet</div>
                      <div className="mini-btns"><button className="btn sm"><Icon name="gallery" /> Gallery</button><button className="btn sm"><Icon name="upload" /> Upload</button></div>
                    </div>
                    <div className="media-sub">
                      <div className="sl"><Icon name="camera" /> Shooting Location</div>
                      <textarea className="inp" value={md.location || ""} placeholder="Location details for this photo…" onChange={(e) => upd("location", e.target.value)} />
                      <div className="dropzone"><Icon name="image" /> No location media added yet</div>
                      <div className="mini-btns"><button className="btn sm"><Icon name="gallery" /> Gallery</button><button className="btn sm"><Icon name="upload" /> Upload</button></div>
                    </div>
                  </div>
                );
              })}
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setD("media", [...data.media, { description: "", outfit: "", location: "" }])}><Icon name="plus" /> Add Media</button>
            </>)}

            {sections.includes("teasing") && sec("teasing", <>
              <div className="sd">Teasing is the base set. Add PPV parts below (up to 10) — each with its own description and reference content.</div>

              <div className="repeat-item">
                <label className="fld-l">Teasing</label>
                <textarea className="inp" value={data.teasing} placeholder="Describe the teasing set (free teasers)…"
                  onChange={(e) => setD("teasing", e.target.value)} />
                {refBlock("No teasing media added yet")}
              </div>

              {data.parts.map((p: any, i: number) => (
                <div className="repeat-item" key={i}>
                  <button className="rm" onClick={() => setD("parts", data.parts.filter((_: any, j: number) => j !== i))}><Icon name="x" /></button>
                  <label className="fld-l">Part {i + 1}</label>
                  <textarea className="inp" value={p.desc || ""} placeholder={`Describe part ${i + 1}…`}
                    onChange={(e) => setD("parts", data.parts.map((x: any, j: number) => (j === i ? { ...x, desc: e.target.value } : x)))} />
                  {refBlock("No media added yet")}
                </div>
              ))}

              {data.parts.length < 10
                ? <button className="btn sm" onClick={() => setD("parts", [...data.parts, { desc: "" }])}><Icon name="plus" /> Add part {data.parts.length + 1}</button>
                : <div className="sub">Maximum of 10 parts reached.</div>}
            </>)}

            {sections.includes("gallery") && sec("gallery", <>
              <div className="sd">Preview all media associated with this task in a swipeable gallery.</div>
              <div className="connected-box">Media uploads come in the next pass — this gallery will preview them.</div>
            </>)}

            {sections.includes("swipe") && sec("swipe", <>
              <div className="sd">Upload the images for the model to swipe through. Describe the set and attach reference shots.</div>
              <label className="fld-l">Swipe Set</label>
              <textarea className="inp" value={data.swipe} onChange={(e) => setD("swipe", e.target.value)} placeholder="Describe the swipe set…" />
              {refBlock("No swipe images added yet")}
            </>)}

            {sec("tips", <>
              <div className="sd">Any other specific instructions or creative ideas for the model.</div>
              <textarea className="inp" value={form.extra_tips} onChange={(e) => set("extra_tips", e.target.value)} placeholder="Creative ideas, do's and don'ts…" />
            </>)}

            {sec("captions", <>
              <div className="sd">Pre-written captions for the model to use.</div>
              <textarea className="inp" value={form.captions} onChange={(e) => set("captions", e.target.value)} placeholder="Caption ideas…" />
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}
