"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { api, GalleryItem, apiBase, fmtDate } from "@/lib/api";

type View = "grid" | "list" | "masonry" | "table";
const isImg = (m?: string) => !!m && m.startsWith("image/");
const isVid = (m?: string) => !!m && m.startsWith("video/");
const thumb = (id: string) => `${apiBase}/api/file/${id}/content`;
const CATEGORIES = ["Profile", "Bottleneck", "ID", "Model Media (Image)", "Model Media (Video)", "Task Content (Image)", "Task Content (Video)", "Department", "Notes"];
const UPLOAD_CATS = ["Profile", "Bottleneck", "ID", "Department", "Notes"];

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [who, setWho] = useState("all");
  const [cat, setCat] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [upCat, setUpCat] = useState(UPLOAD_CATS[0]);
  const [upBusy, setUpBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null); setSel(new Set());
    try { setItems(await api.gallery()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const models = useMemo(() => Array.from(new Set(items.map((i) => i.model).filter(Boolean))) as string[], [items]);
  const list = items.filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase()) &&
    (type === "all" || (type === "image" && isImg(i.mimeType)) || (type === "video" && isVid(i.mimeType))) &&
    (who === "all" || i.model === who) &&
    (cat === "all" || i.category === cat));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUpBusy(true); setErr(null);
    try {
      for (const f of Array.from(files)) await api.galleryUpload(f, upCat);
      setShowUpload(false); await load();
    } catch (e: any) { setErr(e.message); } finally { setUpBusy(false); }
  };

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const download = () => list.filter((i) => sel.has(i.id)).forEach((i) => window.open(`${apiBase}/api/file/${i.id}/content?download=1`, "_blank"));
  const removeSel = async () => {
    if (!confirm(`Move ${sel.size} file(s) to Trash?`)) return;
    const ids = Array.from(sel);
    try { for (const id of ids) await api.trashFile(id); await load(); } catch (e: any) { setErr(e.message); }
  };

  const Thumb = ({ it }: { it: GalleryItem }) => (
    isImg(it.mimeType)
      ? <img className="gl-img" src={thumb(it.id)} alt={it.name} loading="lazy" />
      : <span className="gl-fallback"><Icon name={isVid(it.mimeType) ? "video" : "clip"} /></span>
  );

  const Check = ({ id }: { id: string }) => (
    <button className={`gl-check ${sel.has(id) ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); toggle(id); }} aria-label="Select">
      {sel.has(id) && <Icon name="check" />}
    </button>
  );

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="gallery" /> Gallery <span className="badge b-soft" style={{ verticalAlign: "middle" }}><Icon name="database" /> Drive</span></h1>
          <p>Manage and organize your media files — everything uploaded across the Drive.</p>
        </div>
        <button className="btn brand" onClick={() => setShowUpload(true)}><Icon name="upload" /> Upload</button>
      </div>

      <div className="gl-layout">
        <aside className="card pad gl-filters">
          <div className="gl-fhead"><b>Filters</b><button className="btn sm" onClick={load}><Icon name="refresh" className={loading ? "spin" : ""} /> Refresh</button></div>
          <div className="search-inp" style={{ width: "100%", marginBottom: 14 }}><Icon name="search" /><input placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="lbl-f">Media Type</label>
          <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All Types</option><option value="image">Images</option><option value="video">Videos</option>
          </select>
          <label className="lbl-f" style={{ marginTop: 12 }}>Uploaded By (model)</label>
          <select className="inp" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">All Models</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="lbl-f" style={{ marginTop: 12 }}>Category</label>
          <select className="inp" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </aside>

        <div className="gl-main">
          <div className="gl-views">
            {([["grid", "grid"], ["list", "dots"], ["masonry", "gallery"], ["table", "clip"]] as [View, string][]).map(([v, ic]) => (
              <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}><Icon name={ic} /> {v[0].toUpperCase() + v.slice(1)}</button>
            ))}
            <span className="sub" style={{ marginLeft: "auto" }}>{list.length} file{list.length === 1 ? "" : "s"}</span>
          </div>

          {err && <div className="note">{err}</div>}
          {loading ? (
            <div className="card pad"><div className="empty"><Icon name="refresh" className="spin" /> Loading…</div></div>
          ) : list.length === 0 ? (
            <div className="card pad"><div className="empty">No media found.</div></div>
          ) : view === "table" ? (
            <div className="card pad table-wrap">
              <table className="tbl">
                <thead><tr><th style={{ width: 34 }}></th><th>Name</th><th>Type</th><th>Source</th><th>Model</th><th>Date</th></tr></thead>
                <tbody>
                  {list.map((it) => (
                    <tr key={it.id} className={sel.has(it.id) ? "sel" : ""}>
                      <td><Check id={it.id} /></td>
                      <td><a href={thumb(it.id)} target="_blank" rel="noreferrer"><b>{it.name}</b></a></td>
                      <td className="sub">{isImg(it.mimeType) ? "Image" : isVid(it.mimeType) ? "Video" : "File"}</td>
                      <td><span className="badge b-soft"><Icon name="database" /> Drive</span></td>
                      <td>{it.model || <span className="sub">—</span>}</td>
                      <td className="sub">{it.modifiedTime ? fmtDate(it.modifiedTime) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : view === "list" ? (
            <div className="gl-list">
              {list.map((it) => (
                <div className={`gl-row ${sel.has(it.id) ? "sel" : ""}`} key={it.id}>
                  <Check id={it.id} />
                  <a className="gl-rthumb" href={thumb(it.id)} target="_blank" rel="noreferrer"><Thumb it={it} /></a>
                  <div className="gl-rmeta"><b>{it.name}</b><span className="sub">{it.model || "—"} · {it.modifiedTime ? fmtDate(it.modifiedTime) : ""}</span></div>
                  <span className="badge b-soft"><Icon name="database" /> Drive</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={view === "masonry" ? "gl-masonry" : "gl-grid"}>
              {list.map((it) => (
                <div className={`gl-card ${sel.has(it.id) ? "sel" : ""}`} key={it.id} onClick={() => toggle(it.id)}>
                  <div className="gl-thumb">
                    <span className="gl-src"><Icon name="database" /> Drive</span>
                    <Check id={it.id} />
                    <a href={thumb(it.id)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Thumb it={it} /></a>
                  </div>
                  <div className="gl-cmeta"><div className="gl-cname">{it.name}</div><div className="sub">{it.modifiedTime ? fmtDate(it.modifiedTime) : ""}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {sel.size > 0 && (
        <div className="gl-actionbar">
          <span className="gl-count">{sel.size} selected</span>
          <button className="btn" onClick={download}><Icon name="download" /> Download</button>
          <button className="btn danger" onClick={removeSel}><Icon name="trash" /> Delete</button>
          <button className="icon-btn" onClick={() => setSel(new Set())}><Icon name="x" /></button>
        </div>
      )}

      {showUpload && (
        <div className="overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3><Icon name="upload" /> Upload to Gallery</h3>
            <p className="sub" style={{ margin: "2px 0 0" }}>Add files and tag them with a category.</p>
            <div className="form-grid">
              <div className="full"><label className="lbl-f">Category</label>
                <select className="inp" value={upCat} onChange={(e) => setUpCat(e.target.value)}>
                  {UPLOAD_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="full">
                <label className={`upload-tile ${upBusy ? "busy" : ""}`}>
                  <input type="file" multiple hidden disabled={upBusy} onChange={(e) => upload(e.target.files)} />
                  {upBusy ? <><Icon name="refresh" className="spin" /> Uploading…</> : <><Icon name="upload" /> Choose files</>}
                </label>
              </div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setShowUpload(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
