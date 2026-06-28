"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Status = "active" | "draft" | "archived";
type Sop = {
  id: string;
  title: string;
  department: string;
  status: Status;
  summary: string;
  steps: number;
  updated: string; // ISO
};

const DEPTS = [
  "Editors", "AI editors", "Model Managers", "IG management", "Twitter",
  "Threads", "Mass DMs", "Cupid management", "Onlyfans management", "Meta ads management",
];

const SEED: Sop[] = [
  { id: "s1", title: "Daily content review checklist", department: "Editors", status: "active", summary: "How editors triage, review and approve daily deliverables.", steps: 7, updated: "2026-06-20" },
  { id: "s2", title: "AI upscaling pipeline", department: "AI editors", status: "active", summary: "Standard pipeline for upscaling and cleaning AI-generated media.", steps: 5, updated: "2026-06-18" },
  { id: "s3", title: "New model onboarding", department: "Model Managers", status: "active", summary: "End-to-end onboarding flow for a newly signed model.", steps: 12, updated: "2026-06-12" },
  { id: "s4", title: "Instagram growth playbook", department: "IG management", status: "draft", summary: "Posting cadence, hashtags and engagement loops for IG.", steps: 9, updated: "2026-06-22" },
  { id: "s5", title: "Mass DM compliance rules", department: "Mass DMs", status: "draft", summary: "Do's and don'ts to keep mass DM campaigns within platform rules.", steps: 6, updated: "2026-06-25" },
  { id: "s6", title: "Legacy Twitter cross-post", department: "Twitter", status: "archived", summary: "Deprecated cross-posting flow kept for reference.", steps: 4, updated: "2026-03-02" },
];

const STATUS_TABS: { key: "all" | Status; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "note" },
  { key: "active", label: "Active", icon: "check" },
  { key: "draft", label: "Draft", icon: "edit" },
  { key: "archived", label: "Archived", icon: "folder" },
];

const STATUS_BADGE: Record<Status, string> = { active: "b-green", draft: "b-amber", archived: "b-todo" };
const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const blank = (): Sop => ({ id: "", title: "", department: DEPTS[0], status: "draft", summary: "", steps: 1, updated: "2026-06-28" });

type SortKey = "updated" | "title" | "steps";

export default function SopManagerPage() {
  const [sops, setSops] = useState<Sop[]>(SEED);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [dept, setDept] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortOpen, setSortOpen] = useState(false);

  const [editing, setEditing] = useState<Sop | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<Sop | null>(null);

  const rows = useMemo(() => {
    let r = sops.slice();
    const term = q.trim().toLowerCase();
    if (term) r = r.filter((s) => s.title.toLowerCase().includes(term) || s.summary.toLowerCase().includes(term));
    if (status !== "all") r = r.filter((s) => s.status === status);
    if (dept !== "all") r = r.filter((s) => s.department === dept);
    r.sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "steps") return b.steps - a.steps;
      return b.updated.localeCompare(a.updated);
    });
    return r;
  }, [sops, q, status, dept, sortKey]);

  const openCreate = () => { setIsNew(true); setEditing(blank()); };
  const openEdit = (s: Sop) => { setIsNew(false); setEditing(s); };
  const save = (s: Sop) => {
    if (isNew) setSops((arr) => [{ ...s, id: "s_" + Math.floor(Math.random() * 99999) }, ...arr]);
    else setSops((arr) => arr.map((x) => (x.id === s.id ? s : x)));
    setEditing(null);
  };
  const archive = (s: Sop) => setSops((arr) => arr.map((x) => (x.id === s.id ? { ...x, status: x.status === "archived" ? "active" : "archived" } : x)));
  const remove = (s: Sop) => { if (confirm(`Delete SOP "${s.title}"?`)) setSops((arr) => arr.filter((x) => x.id !== s.id)); };

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "updated", label: "Recently updated" }, { key: "title", label: "Title A–Z" }, { key: "steps", label: "Most steps" },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="sop-ic"><Icon name="note" /></span>
          <div>
            <h1 style={{ margin: 0 }}>SOP Manager</h1>
            <p>Standard Operating Procedures for agency scale.</p>
          </div>
        </div>
      </div>

      <div className="panel-h">
        <div className="panel-title"><Icon name="note" /> Procedures ({rows.length})</div>
        <button className="btn brand" onClick={openCreate}><Icon name="plus" /> Create SOP</button>
      </div>

      {/* Search + status tabs + sort */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "14px 0" }}>
        <div className="search-bar"><Icon name="search" /><input placeholder="Search procedures…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {STATUS_TABS.map((t) => (
          <button key={t.key} className={`pill-btn ${status === t.key ? "active" : ""}`} onClick={() => setStatus(t.key)}>
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
        <div style={{ position: "relative" }}>
          <button className="pill-btn" onClick={() => setSortOpen((v) => !v)}><Icon name="filter" /> Sort</button>
          {sortOpen && (
            <>
              <div className="backdrop" onClick={() => setSortOpen(false)} />
              <div className="menu">
                {SORTS.map((s) => (
                  <button key={s.key} onClick={() => { setSortKey(s.key); setSortOpen(false); }}>
                    {sortKey === s.key ? <Icon name="check" /> : <span style={{ width: 16 }} />} {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Department chips */}
      <div className="sop-chips">
        <button className={`tchip ${dept === "all" ? "on" : ""}`} onClick={() => setDept("all")}>All Depts</button>
        {DEPTS.map((d) => (
          <button key={d} className={`tchip ${dept === d ? "on" : ""}`} onClick={() => setDept(d)}>{d}</button>
        ))}
      </div>

      {/* List / empty */}
      {rows.length === 0 ? (
        <div className="card pad" style={{ marginTop: 14 }}>
          <div className="empty" style={{ padding: "70px 16px" }}>
            <Icon name="note" />
            <div style={{ fontWeight: 600, color: "#3f3f46" }}>No procedures found</div>
            <div className="sub">Try changing your search or create a new SOP.</div>
            <button className="btn" style={{ marginTop: 8 }} onClick={openCreate}><Icon name="plus" /> Create One Now</button>
          </div>
        </div>
      ) : (
        <div className="sop-grid">
          {rows.map((s) => (
            <div className="card pad sop-card" key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <span className="sop-ic sm"><Icon name="note" /></span>
                <span className={`badge ${STATUS_BADGE[s.status]}`} style={{ textTransform: "capitalize" }}>{s.status}</span>
              </div>
              <div className="u-name" style={{ marginTop: 10, fontSize: 15 }}>{s.title}</div>
              <div className="sub" style={{ margin: "4px 0 10px" }}>{s.summary}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span className="badge b-type">{s.department}</span>
                <span className="badge b-todo">{s.steps} steps</span>
                <span className="badge b-todo">Updated {fmt(s.updated)}</span>
              </div>
              <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                <button className="btn icon sm" title="View" onClick={() => setViewing(s)}><Icon name="eye" /></button>
                <button className="btn icon sm" title="Edit" onClick={() => openEdit(s)}><Icon name="edit" /></button>
                <button className="btn icon sm" title={s.status === "archived" ? "Unarchive" : "Archive"} onClick={() => archive(s)}><Icon name="folder" /></button>
                <button className="btn icon sm danger" title="Delete" onClick={() => remove(s)}><Icon name="trash" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <SopModal sop={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />}
      {viewing && <ViewModal sop={viewing} onClose={() => setViewing(null)} onEdit={() => { const s = viewing; setViewing(null); openEdit(s); }} />}

      <style>{`
        .sop-ic{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#f3f4f6;color:#52525b;flex:none}
        .sop-ic.sm{width:36px;height:36px;border-radius:10px}
        .sop-ic svg{width:22px;height:22px}.sop-ic.sm svg{width:18px;height:18px}
        .sop-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
        .sop-chips .tchip{white-space:nowrap;flex:none}
        .sop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
        .sop-card{display:flex;flex-direction:column}
        .modal .sop-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

function SopModal({ sop, isNew, onClose, onSave }: { sop: Sop; isNew: boolean; onClose: () => void; onSave: (s: Sop) => void }) {
  const [title, setTitle] = useState(sop.title);
  const [department, setDepartment] = useState(sop.department);
  const [status, setStatus] = useState<Status>(sop.status);
  const [summary, setSummary] = useState(sop.summary);
  const [steps, setSteps] = useState(String(sop.steps));

  const submit = () => {
    if (!title.trim()) return;
    onSave({ ...sop, title: title.trim(), department, status, summary: summary.trim(), steps: Math.max(1, parseInt(steps, 10) || 1), updated: "2026-06-28" });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Create SOP" : "Edit SOP"}</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>A clear, repeatable procedure your team can follow.</p>

        <label className="sop-l">Title</label>
        <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily content review checklist" autoFocus />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <label className="sop-l">Department</label>
            <select className="inp" value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="sop-l">Status</label>
            <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <label className="sop-l" style={{ marginTop: 14 }}>Summary</label>
        <input className="inp" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line on what this procedure covers" />

        <label className="sop-l" style={{ marginTop: 14 }}>Number of steps</label>
        <input className="inp" type="number" min={1} value={steps} onChange={(e) => setSteps(e.target.value)} />

        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={submit}><Icon name="check" /> {isNew ? "Create SOP" : "Save changes"}</button>
        </div>
        <style>{`.modal .sop-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
      </div>
    </div>
  );
}

function ViewModal({ sop, onClose, onEdit }: { sop: Sop; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {sop.title}
          <span className={`badge ${STATUS_BADGE[sop.status]}`} style={{ textTransform: "capitalize" }}>{sop.status}</span>
        </h3>
        <p className="sub" style={{ margin: "4px 0 16px" }}>{sop.summary}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge b-type">{sop.department}</span>
          <span className="badge b-todo">{sop.steps} steps</span>
          <span className="badge b-todo">Updated {fmt(sop.updated)}</span>
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn brand" onClick={onEdit}><Icon name="edit" /> Edit</button>
        </div>
      </div>
    </div>
  );
}
