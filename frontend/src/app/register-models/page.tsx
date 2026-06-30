"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type RegLink = { id: string; token: string; maxUses: number; used: number; expiry: string | null };
type Registration = { id: string; name: string; email: string; status: "Approved" | "Pending" | "Rejected"; date: string };

const SEED_LINKS: RegLink[] = [
  { id: "l1", token: "2a9f5a8d78c7a1b2c3d4e5f6", maxUses: 1, used: 1, expiry: null },
  { id: "l2", token: "7851661ad77d9e8f7a6b5c4d", maxUses: 1, used: 1, expiry: "2026-06-16" },
];
const SEED_REGS: Registration[] = [
  { id: "r1", name: "Mous Kyle", email: "mouskyl@gmail.com", status: "Approved", date: "2026-06-17" },
  { id: "r2", name: "sw", email: "jasminstarling2@gmail.com", status: "Approved", date: "2026-06-16" },
];

const TODAY = "2026-06-29";
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US");
const linkStatus = (l: RegLink): "active" | "used" | "expired" => {
  if (l.expiry && l.expiry < TODAY) return "expired";
  if (l.used >= l.maxUses) return "used";
  return "active";
};
const ST_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "b-green" }, used: { label: "Used Up", cls: "b-red" }, expired: { label: "Expired", cls: "b-amber" },
};
const genToken = () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

export default function RegisterModelsPage() {
  const [links, setLinks] = useState<RegLink[]>(SEED_LINKS);
  const [regs, setRegs] = useState<Registration[]>(SEED_REGS);
  const [manage, setManage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  // KPIs
  const totalModels = regs.length;
  const pending = regs.filter((r) => r.status === "Pending").length;
  const activeLinks = links.filter((l) => linkStatus(l) === "active").length;
  const thisWeek = regs.filter((r) => r.date >= "2026-06-23").length;

  const copyLink = async (l: RegLink) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://luminacrm.app"}/register?token=${l.token}`;
    try { await navigator.clipboard.writeText(url); flash("Registration link copied."); }
    catch { flash("Copy failed — select & copy manually."); }
  };
  const refresh = () => { setRefreshing(true); setRegs((r) => r.slice().sort((a, b) => b.date.localeCompare(a.date))); setTimeout(() => setRefreshing(false), 500); };

  const recent = useMemo(() => regs.slice().sort((a, b) => b.date.localeCompare(a.date)), [regs]);

  const generate = (maxUses: number, days: number | null) => {
    const expiry = days ? new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) : null;
    setLinks((s) => [{ id: "l_" + Math.floor(Math.random() * 99999), token: genToken(), maxUses, used: 0, expiry }, ...s]);
    flash("New registration link generated.");
  };
  const revoke = (id: string) => setLinks((s) => s.filter((l) => l.id !== id));

  const KPIS = [
    { label: "Total Models", icon: "star", val: String(totalModels), sub: "Registered" },
    { label: "Pending", icon: "clock", val: String(pending), sub: "Awaiting review" },
    { label: "Active Links", icon: "link", val: String(activeLinks), sub: "Available" },
    { label: "This Week", icon: "trendup", val: `+${thisWeek}`, sub: "New" },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="uplus" /> Model Registration</h1>
          <p>Generate and manage registration links for new models.</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-top">{k.label}<Icon name={k.icon} /></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Registration Links */}
        <div className="card pad">
          <div className="panel-h">
            <div>
              <div className="panel-title"><Icon name="link" style={{ color: "var(--brand)" }} /> Registration Links</div>
              <div className="panel-sub">Manage invitation links</div>
            </div>
            <button className="btn" onClick={() => setManage(true)}><Icon name="uplus" /> Manage Links</button>
          </div>

          {links.length === 0 ? (
            <div className="empty"><Icon name="link" /><div className="sub">No links yet — generate one.</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {links.map((l) => {
                const st = ST_META[linkStatus(l)];
                return (
                  <div className="rl-card" key={l.id}>
                    <div className="rl-top">
                      <span className="rl-token">{l.token.slice(0, 12)}…</span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="rl-meta">
                      <span><Icon name="users" /> {l.used}/{l.maxUses} uses</span>
                      <span><Icon name="cal" /> Exp: {l.expiry ? fmt(l.expiry) : "Never"}</span>
                    </div>
                    <div className="rl-actions">
                      <button className="btn" onClick={() => copyLink(l)}><Icon name="copy" /> Copy Link</button>
                      <button className="btn icon" title="Open" onClick={() => flash("Opening the registration page is mocked.")}><Icon name="external" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Registrations */}
        <div className="card pad">
          <div className="panel-h">
            <div>
              <div className="panel-title"><Icon name="clock" style={{ color: "var(--brand)" }} /> Recent Registrations</div>
              <div className="panel-sub">Latest model registrations</div>
            </div>
            <button className="btn icon" title="Refresh" onClick={refresh}><Icon name="refresh" className={refreshing ? "spin" : ""} /></button>
          </div>

          {recent.length === 0 ? (
            <div className="empty"><Icon name="user" /><div className="sub">No registrations yet.</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Model</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td><div className="u-name">{r.name}</div><div className="sub">{r.email}</div></td>
                    <td><span className={`badge ${r.status === "Approved" ? "b-green" : r.status === "Pending" ? "b-amber" : "b-red"}`}><Icon name="check" /> {r.status}</span></td>
                    <td className="sub">{fmt(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {manage && <ManageLinksModal links={links} onClose={() => setManage(false)} onGenerate={generate} onRevoke={revoke} />}
      {toast && <div className="rm-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .rl-card{border:1px solid var(--line2);border-radius:13px;padding:14px}
        .rl-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .rl-token{font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;color:var(--ink)}
        .rl-meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:12.5px;margin-bottom:12px}
        .rl-meta span{display:inline-flex;align-items:center;gap:6px}
        .rl-meta svg{width:13px;height:13px}
        .rl-actions{display:flex;gap:8px}
        .rl-actions .btn:first-child{flex:1;justify-content:center}
        .rm-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .rm-toast svg{width:15px;height:15px;color:#7ee2a8}
      `}</style>
    </div>
  );
}

function ManageLinksModal({ links, onClose, onGenerate, onRevoke }: {
  links: RegLink[]; onClose: () => void; onGenerate: (maxUses: number, days: number | null) => void; onRevoke: (id: string) => void;
}) {
  const [maxUses, setMaxUses] = useState("1");
  const [exp, setExp] = useState("never");
  const submit = () => onGenerate(Math.max(1, parseInt(maxUses, 10) || 1), exp === "never" ? null : parseInt(exp, 10));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Manage Registration Links</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Generate single-use or multi-use invitation links for new models.</p>

        <div className="card pad" style={{ borderRadius: 12, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="rm-l">Max uses</label><input className="inp" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></div>
            <div><label className="rm-l">Expiry</label>
              <select className="inp" value={exp} onChange={(e) => setExp(e.target.value)}>
                <option value="never">Never</option><option value="7">7 days</option><option value="30">30 days</option>
              </select>
            </div>
          </div>
          <button className="btn brand" style={{ marginTop: 12, width: "100%", justifyContent: "center" }} onClick={submit}><Icon name="plus" /> Generate link</button>
        </div>

        <div className="rm-l" style={{ marginBottom: 8 }}>Existing links ({links.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflow: "auto" }}>
          {links.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid var(--line2)", borderRadius: 9, padding: "9px 11px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5 }}>{l.token.slice(0, 16)}…</div>
                <div className="sub">{l.used}/{l.maxUses} uses · Exp: {l.expiry ? fmt(l.expiry) : "Never"}</div>
              </div>
              <button className="btn icon sm danger" title="Revoke" onClick={() => onRevoke(l.id)}><Icon name="trash" /></button>
            </div>
          ))}
        </div>

        <div className="actions"><button className="btn" onClick={onClose}>Done</button></div>
        <style>{`.modal .rm-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
      </div>
    </div>
  );
}
