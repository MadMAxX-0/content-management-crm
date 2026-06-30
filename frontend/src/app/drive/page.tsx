// ─────────────────────────────────────────────────────────────────────────────
// MOCK Drive Manager (visual redesign, no backend).
// The REAL backend-connected Drive Manager is archived at:
//   frontend/src/archive/drive-manager-real/DriveManagerReal.tsx  (+ NOTES.md)
// Restore it to re-enable live Google Drive browsing.
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type FsNode = { id: string; name: string; type: "folder" | "file"; kind?: "image" | "video" | "doc"; children?: FsNode[] };
type Model = { id: string; name: string; template: string; color: string; tree: FsNode };

const files = (prefix: string, n: number, kind: "image" | "video" | "doc", ext: string): FsNode[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${i}`, name: `${prefix}_${i + 1}.${ext}`, type: "file" as const, kind }));

const MODELS: Model[] = [
  {
    id: "m-sw", name: "sw", template: "Jasmine", color: "#d98324",
    tree: { id: "r1", name: "Root folder", type: "folder", children: [
      { id: "f1", name: "Verification", type: "folder", children: [
        { id: "v1", name: "id_front.jpg", type: "file", kind: "image" },
        { id: "v2", name: "contract.pdf", type: "file", kind: "doc" },
      ] },
    ] },
  },
  {
    id: "m-um", name: "Unnamed Model", template: "Test", color: "#2a9d8f",
    tree: { id: "r2", name: "Root folder", type: "folder", children: [
      { id: "vid", name: "Videos", type: "folder", children: files("clip", 6, "video", "mp4") },
      { id: "pho", name: "Photos", type: "folder", children: files("shot", 9, "image", "jpg") },
      { id: "leg", name: "Legal", type: "folder", children: files("doc", 3, "doc", "pdf") },
    ] },
  },
];

const countFiles = (n: FsNode): number =>
  n.type === "file" ? 1 : (n.children || []).reduce((s, c) => s + countFiles(c), 0);

const kindIcon = (n: FsNode) => n.type === "folder" ? "folder" : n.kind === "video" ? "video" : n.kind === "doc" ? "note" : "image";

export default function DriveManagerPage() {
  const [provider, setProvider] = useState<"gdrive" | "dropbox">("gdrive");
  const [models, setModels] = useState<Model[]>(MODELS);
  const [selId, setSelId] = useState<string>("");
  const [q, setQ] = useState("");
  const [asc, setAsc] = useState(true);
  const [filter, setFilter] = useState<"all" | "withfiles" | "empty">("all");
  const [menu, setMenu] = useState<string | null>(null);
  const [reqModal, setReqModal] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reqs, setReqs] = useState<Record<string, string>>({});

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const rows = useMemo(() => {
    let r = models.slice();
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((m) => m.name.toLowerCase().includes(t) || m.template.toLowerCase().includes(t));
    if (filter === "withfiles") r = r.filter((m) => countFiles(m.tree) > 0);
    if (filter === "empty") r = r.filter((m) => countFiles(m.tree) === 0);
    r.sort((a, b) => (asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return r;
  }, [models, q, asc, filter]);

  const selected = models.find((m) => m.id === selId) || null;

  const removeModel = (id: string) => {
    setMenu(null);
    if (!confirm("Remove this model from Drive Manager?")) return;
    setModels((s) => s.filter((m) => m.id !== id));
    if (selId === id) setSelId("");
  };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Drive Manager
            <span className="seg" style={{ marginLeft: 4 }}>
              <button className={provider === "gdrive" ? "active" : ""} onClick={() => setProvider("gdrive")}><Icon name="folder" /> Google Drive</button>
              <button className={provider === "dropbox" ? "active" : ""} onClick={() => setProvider("dropbox")}><Icon name="database" /> Dropbox</button>
            </span>
          </h1>
          <p>Browse and manage model drive folders and files.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => setReqModal(true)}><Icon name="target" /> Set requirement</button>
          <button className="btn" onClick={() => setMoveModal(true)}><Icon name="transfer" /> Move transfer</button>
        </div>
      </div>

      {provider === "dropbox" ? (
        <div className="card pad"><div className="empty" style={{ padding: "70px 16px" }}>
          <Icon name="database" /><div style={{ fontWeight: 600, color: "#3f3f46" }}>Dropbox not connected</div>
          <div className="sub">Connect a Dropbox account to browse model folders here.</div>
          <button className="btn brand" style={{ marginTop: 8 }} onClick={() => flash("Dropbox connect is mocked.")}><Icon name="link" /> Connect Dropbox</button>
        </div></div>
      ) : (
        <div className="grid2">
          {/* LEFT: models */}
          <div className="card pad">
            <div className="panel-title"><Icon name="user" /> Models <span className="badge b-todo">{rows.length}</span></div>
            <div className="panel-sub">Select a model to view their drive structure.</div>
            <div className="search-bar" style={{ margin: "4px 0 10px" }}><Icon name="search" /><input placeholder="Search models…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button className="btn sm" onClick={() => setAsc((v) => !v)}><Icon name={asc ? "chevu" : "chevd"} /> A–Z</button>
              <select className="inp" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                <option value="all">All</option><option value="withfiles">With files</option><option value="empty">Empty</option>
              </select>
            </div>

            {rows.length === 0 ? (
              <div className="empty"><Icon name="user" /><div className="sub">No models match.</div></div>
            ) : rows.map((m) => {
              const fc = countFiles(m.tree);
              return (
                <div key={m.id} className={`dm-row ${selId === m.id ? "on" : ""}`} onClick={() => setSelId(m.id)}>
                  <span className="dm-av" style={{ background: m.color }}>{m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                  <div className="dm-main">
                    <div className="u-name">{m.name}</div>
                    <span className="badge b-todo"><Icon name="folders" /> {m.template}</span>
                  </div>
                  <span className="badge b-soft">{fc} files</span>
                  <div style={{ position: "relative" }}>
                    <button className="btn icon sm" onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }}><Icon name="dots" /></button>
                    {menu === m.id && (
                      <>
                        <div className="backdrop" onClick={(e) => { e.stopPropagation(); setMenu(null); }} />
                        <div className="menu">
                          <button onClick={(e) => { e.stopPropagation(); setSelId(m.id); setMenu(null); }}><Icon name="eye" /> View structure</button>
                          <button onClick={(e) => { e.stopPropagation(); setMenu(null); flash("Open in Drive is mocked."); }}><Icon name="external" /> Open in Drive</button>
                          <div className="sep" />
                          <button className="danger" onClick={(e) => { e.stopPropagation(); removeModel(m.id); }}><Icon name="trash" /> Remove</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: drive structure */}
          <div className="card pad">
            <div className="panel-title"><Icon name="folders" /> Drive Structure</div>
            {!selected ? (
              <>
                <div className="panel-sub">Select a model to view their drive structure.</div>
                <div className="empty" style={{ padding: "80px 16px" }}><Icon name="folders" /><div>Select a model from the list to view their drive structure</div></div>
              </>
            ) : (
              <>
                <div className="panel-sub">
                  Folders and files for <b style={{ color: "var(--ink)" }}>{selected.name}</b>
                  {reqs[selected.id] && <span className="badge b-amber" style={{ marginLeft: 8 }}><Icon name="target" /> {reqs[selected.id]}</span>}
                </div>
                <div style={{ marginTop: 8 }}>
                  <TreeNode node={selected.tree} depth={0} defaultOpen onFile={(f) => flash(`Preview "${f.name}" is mocked.`)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {reqModal && (
        <RequirementModal models={models} onClose={() => setReqModal(false)} onSave={(id, label) => { setReqs((r) => ({ ...r, [id]: label })); setReqModal(false); flash("Requirement saved."); }} />
      )}
      {moveModal && (
        <MoveModal models={models} onClose={() => setMoveModal(false)} onMove={(from, to) => { setMoveModal(false); flash(`Transfer from ${from} → ${to} queued (mock).`); }} />
      )}
      {toast && <div className="dm-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .dm-row{display:flex;align-items:center;gap:11px;padding:11px;border-radius:11px;border:1px solid transparent;cursor:pointer}
        .dm-row:hover{background:#fafafb}
        .dm-row.on{border-color:var(--brand-softln);background:var(--brand-soft)}
        .dm-av{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;color:#fff;font-size:12px;font-weight:700;flex:none}
        .dm-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
        .dm-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .dm-toast svg{width:15px;height:15px;color:#7ee2a8}
        .tn{user-select:none}
        .tn-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:13.5px}
        .tn-row:hover{background:#f4f4f6}
        .tn-row svg{width:16px;height:16px;color:var(--muted2)}
        .tn-row .tn-fold{color:#3b6fd4}
        .tn-count{margin-left:auto;font-size:11px;color:var(--muted2)}
        .tn-kids{margin-left:16px;border-left:1px solid var(--line2);padding-left:6px}
      `}</style>
    </div>
  );
}

function TreeNode({ node, depth, defaultOpen, onFile }: { node: FsNode; depth: number; defaultOpen?: boolean; onFile: (f: FsNode) => void }) {
  const [open, setOpen] = useState(!!defaultOpen || depth === 0);
  const isFolder = node.type === "folder";
  const fc = isFolder ? countFiles(node) : 0;
  return (
    <div className="tn">
      <div className="tn-row" onClick={() => (isFolder ? setOpen((v) => !v) : onFile(node))}>
        {isFolder && <Icon name={open ? "chevd" : "chevr"} />}
        <Icon name={kindIcon(node)} className={isFolder ? "tn-fold" : ""} />
        <span>{node.name}</span>
        {isFolder && <span className="tn-count">{fc} file{fc === 1 ? "" : "s"}</span>}
      </div>
      {isFolder && open && (
        <div className="tn-kids">
          {(node.children || []).map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} onFile={onFile} />)}
        </div>
      )}
    </div>
  );
}

function RequirementModal({ models, onClose, onSave }: { models: Model[]; onClose: () => void; onSave: (id: string, label: string) => void }) {
  const [model, setModel] = useState(models[0]?.id || "");
  const [type, setType] = useState("Minimum files");
  const [value, setValue] = useState("10");
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Set requirement</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Define a content requirement for a model's drive.</p>
        <label className="dm-l">Model</label>
        <select className="inp" value={model} onChange={(e) => setModel(e.target.value)}>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <label className="dm-l" style={{ marginTop: 14 }}>Requirement</label>
        <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>
          <option>Minimum files</option><option>Content rating</option><option>Weekly uploads</option>
        </select>
        <label className="dm-l" style={{ marginTop: 14 }}>Value</label>
        <input className="inp" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={() => onSave(model, `${type}: ${value}`)}><Icon name="check" /> Save</button>
        </div>
        <style>{`.modal .dm-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
      </div>
    </div>
  );
}

function MoveModal({ models, onClose, onMove }: { models: Model[]; onClose: () => void; onMove: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(models[0]?.name || "");
  const [to, setTo] = useState(models[1]?.name || models[0]?.name || "");
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Move transfer</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Move files from one model's drive to another.</p>
        <label className="dm-l">From</label>
        <select className="inp" value={from} onChange={(e) => setFrom(e.target.value)}>{models.map((m) => <option key={m.id}>{m.name}</option>)}</select>
        <label className="dm-l" style={{ marginTop: 14 }}>To</label>
        <select className="inp" value={to} onChange={(e) => setTo(e.target.value)}>{models.map((m) => <option key={m.id}>{m.name}</option>)}</select>
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={() => onMove(from, to)}><Icon name="transfer" /> Move</button>
        </div>
        <style>{`.modal .dm-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
      </div>
    </div>
  );
}
