"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Status = "active" | "inactive" | "pending" | "error";
type Account = { id: string; platform: string; handle: string; model: string; status: Status; followers: number; posts: number; engagement: number; tags: string[] };

const PLATFORMS = ["Instagram", "TikTok", "Twitter / X", "Threads", "YouTube"];
const PLAT_ICON: Record<string, string> = { Instagram: "camera", TikTok: "video", "Twitter / X": "share", Threads: "share", YouTube: "video" };
const MODELS = ["Ava Stone", "Mia Rivers", "Lena Frost", "Nora Vale"];
const ST_BADGE: Record<Status, string> = { active: "b-green", inactive: "b-todo", pending: "b-amber", error: "b-red" };
const TABS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All Accounts" }, { key: "active", label: "Active" }, { key: "inactive", label: "Inactive" }, { key: "pending", label: "Pending" }, { key: "error", label: "Errors" },
];
const fmtN = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function SocialMediaTrackerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tab, setTab] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");
  const [model, setModel] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "followers">("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [add, setAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalPosts = accounts.reduce((s, a) => s + a.posts, 0);
  const activeN = accounts.filter((a) => a.status === "active").length;
  const avgEng = accounts.length ? (accounts.reduce((s, a) => s + a.engagement, 0) / accounts.length).toFixed(1) : "Na" + "N";

  const KPIS = [
    { label: "Total Accounts", icon: "users", val: String(accounts.length), sub: `${activeN} active`, tone: "#1f8f53" },
    { label: "Total Followers", icon: "heart", val: fmtN(totalFollowers), sub: "+2.5% this week", tone: "#1f8f53" },
    { label: "Avg. Engagement", icon: "activity", val: `${avgEng}%`, sub: "-0.3% from last week", tone: "#c0392b" },
    { label: "Total Posts", icon: "grid", val: String(totalPosts), sub: "+125 this week", tone: "#1f8f53" },
    { label: "Avg. Growth", icon: "trendup", val: "+3.2%", sub: "Increasing", tone: "#1f8f53" },
  ];

  const rows = useMemo(() => {
    let r = accounts.slice();
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((a) => a.handle.toLowerCase().includes(t) || a.tags.some((tg) => tg.toLowerCase().includes(t)));
    if (tab !== "all") r = r.filter((a) => a.status === tab);
    if (model !== "all") r = r.filter((a) => a.model === model);
    if (sort === "followers") r.sort((a, b) => b.followers - a.followers);
    else if (sort === "oldest") r.reverse();
    return r;
  }, [accounts, q, tab, model, sort]);

  const addAccount = (a: Omit<Account, "id">) => { setAccounts((s) => [{ ...a, id: "a_" + Math.floor(Math.random() * 99999) }, ...s]); flash("Account added."); };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="camera" /> Social Media Tracker <span className="smt-health"><span className="dot" /> API Healthy</span></h1>
          <p>Monitor and analyze social media accounts.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => flash("Import is mocked.")}><Icon name="upload" /> Import</button>
          <button className="btn" onClick={() => flash("Export is mocked.")}><Icon name="download" /> Export</button>
          <button className="btn brand" onClick={() => setAdd(true)}><Icon name="plus" /> Add Account</button>
        </div>
      </div>

      <div className="kpi-grid smt-kpis" style={{ marginBottom: 18 }}>
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-top">{k.label}<Icon name={k.icon} /></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-sub" style={{ color: k.tone }}><Icon name="trendup" style={{ width: 12, height: 12 }} /> {k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="btn-row">
          {TABS.map((t) => <button key={t.key} className={`pill-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </div>
        <div className="btn-row">
          <button className="btn icon" title="Refresh" onClick={() => flash("Refreshed.")}><Icon name="refresh" /></button>
          <button className={`btn icon ${view === "grid" ? "brand" : ""}`} title="Grid" onClick={() => setView("grid")}><Icon name="grid" /></button>
          <button className={`btn icon ${view === "list" ? "brand" : ""}`} title="List" onClick={() => setView("list")}><Icon name="listcheck" /></button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="search-bar"><Icon name="search" /><input placeholder="Search accounts, tags…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="inp" style={{ width: "auto" }} value={model} onChange={(e) => setModel(e.target.value)}><option value="all">All Models</option>{MODELS.map((m) => <option key={m}>{m}</option>)}</select>
        <select className="inp" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="followers">Followers</option></select>
        <button className="btn" onClick={() => flash("Advanced filters are mocked.")}><Icon name="filter" /> Advanced Filters</button>
      </div>

      <div className="card pad">
        {rows.length === 0 ? (
          <div className="empty" style={{ padding: "70px 16px" }}>
            <Icon name="users" />
            <div style={{ fontWeight: 600, color: "#3f3f46", fontSize: 16 }}>No accounts added yet</div>
            <div className="sub" style={{ maxWidth: 380 }}>Start tracking your social media accounts by clicking the “Add Account” button above.</div>
            <button className="btn brand" style={{ marginTop: 8 }} onClick={() => setAdd(true)}><Icon name="plus" /> Add Your First Account</button>
          </div>
        ) : view === "grid" ? (
          <div className="smt-grid">
            {rows.map((a) => (
              <div className="smt-card" key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="smt-plat"><Icon name={PLAT_ICON[a.platform] || "globe"} /></span>
                  <span className={`badge ${ST_BADGE[a.status]}`} style={{ textTransform: "capitalize" }}>{a.status}</span>
                </div>
                <div className="u-name" style={{ marginTop: 10 }}>{a.handle}</div>
                <div className="sub">{a.platform} · {a.model}</div>
                <div className="smt-stats">
                  <div><b>{fmtN(a.followers)}</b><span>Followers</span></div>
                  <div><b>{a.posts}</b><span>Posts</span></div>
                  <div><b>{a.engagement}%</b><span>Engage</span></div>
                </div>
                <button className="btn icon sm danger" style={{ marginTop: 8 }} onClick={() => setAccounts((s) => s.filter((x) => x.id !== a.id))}><Icon name="trash" /></button>
              </div>
            ))}
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Account</th><th>Model</th><th>Followers</th><th>Posts</th><th>Engagement</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="smt-plat sm"><Icon name={PLAT_ICON[a.platform] || "globe"} /></span><div><div className="u-name">{a.handle}</div><div className="sub">{a.platform}</div></div></div></td>
                  <td className="sub">{a.model}</td><td>{fmtN(a.followers)}</td><td>{a.posts}</td><td>{a.engagement}%</td>
                  <td><span className={`badge ${ST_BADGE[a.status]}`} style={{ textTransform: "capitalize" }}>{a.status}</span></td>
                  <td style={{ textAlign: "right" }}><button className="btn icon sm danger" onClick={() => setAccounts((s) => s.filter((x) => x.id !== a.id))}><Icon name="trash" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {add && <AddModal onClose={() => setAdd(false)} onSave={(a) => { addAccount(a); setAdd(false); }} />}
      {toast && <div className="smt-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .smt-health{font-size:12px;font-weight:600;color:#1f8f53;display:inline-flex;align-items:center;gap:5px;margin-left:6px}
        .smt-health .dot{width:7px;height:7px;border-radius:50%;background:#37b46e}
        .smt-kpis{grid-template-columns:repeat(5,1fr)}
        @media(max-width:1100px){.smt-kpis{grid-template-columns:repeat(2,1fr)}}
        .smt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
        .smt-card{border:1px solid var(--line2);border-radius:13px;padding:14px}
        .smt-plat{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:var(--brand-soft);color:var(--brand-tx)}
        .smt-plat.sm{width:30px;height:30px}.smt-plat svg{width:18px;height:18px}
        .smt-stats{display:flex;gap:14px;margin-top:12px}
        .smt-stats div{display:flex;flex-direction:column}
        .smt-stats b{font-size:14px}.smt-stats span{font-size:11px;color:var(--muted2)}
        .smt-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .smt-toast svg{width:15px;height:15px;color:#7ee2a8}
        .modal .smt-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

function AddModal({ onClose, onSave }: { onClose: () => void; onSave: (a: Omit<Account, "id">) => void }) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [handle, setHandle] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [status, setStatus] = useState<Status>("active");
  const [followers, setFollowers] = useState("0");
  const [posts, setPosts] = useState("0");
  const [engagement, setEngagement] = useState("0");
  const [tags, setTags] = useState("");
  const submit = () => {
    if (!handle.trim()) return;
    onSave({ platform, handle: handle.trim().startsWith("@") ? handle.trim() : "@" + handle.trim(), model, status,
      followers: +followers || 0, posts: +posts || 0, engagement: +engagement || 0, tags: tags.split(",").map((s) => s.trim()).filter(Boolean) });
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Account</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Track a new social media account.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label className="smt-l">Platform</label><select className="inp" value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label className="smt-l">Model</label><select className="inp" value={model} onChange={(e) => setModel(e.target.value)}>{MODELS.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <label className="smt-l" style={{ marginTop: 14 }}>Handle</label>
        <input className="inp" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label className="smt-l">Followers</label><input className="inp" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} /></div>
          <div><label className="smt-l">Posts</label><input className="inp" type="number" value={posts} onChange={(e) => setPosts(e.target.value)} /></div>
          <div><label className="smt-l">Engage %</label><input className="inp" type="number" value={engagement} onChange={(e) => setEngagement(e.target.value)} /></div>
        </div>
        <label className="smt-l" style={{ marginTop: 14 }}>Status</label>
        <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option><option value="error">Error</option></select>
        <label className="smt-l" style={{ marginTop: 14 }}>Tags</label>
        <input className="inp" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated" />
        <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Add Account</button></div>
      </div>
    </div>
  );
}
