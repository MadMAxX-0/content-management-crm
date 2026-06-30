"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Status = "active" | "inactive" | "suspended";
type Account = { id: string; username: string; status: Status; subscribers: number; subPrice: number; balance: number; earnings: number };

const ST_BADGE: Record<Status, string> = { active: "b-green", inactive: "b-todo", suspended: "b-red" };
const TABS = [
  { key: "accounts", label: "Accounts", icon: "users" },
  { key: "earnings", label: "Earnings", icon: "dollar" },
  { key: "analytics", label: "Analytics", icon: "trendup" },
  { key: "subscribers", label: "Subscribers", icon: "heart" },
] as const;
const money = (n: number) => `$${n.toFixed(2)}`;

export default function OnlyFansStatsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("accounts");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [sort, setSort] = useState<"username" | "subscribers" | "balance">("username");
  const [asc, setAsc] = useState(true);
  const [add, setAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const totalSubs = accounts.reduce((s, a) => s + a.subscribers, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalEarnings = accounts.reduce((s, a) => s + a.earnings, 0);
  const avgPrice = accounts.length ? accounts.reduce((s, a) => s + a.subPrice, 0) / accounts.length : 0;
  const activeN = accounts.filter((a) => a.status === "active").length;

  const KPIS = [
    { label: "Total Accounts", icon: "users", val: String(accounts.length), sub: `${activeN} active` },
    { label: "Total Subscribers", icon: "heart", val: String(totalSubs), sub: "Across all accounts" },
    { label: "Current Balance", icon: "dollar", val: money(totalBalance), sub: "Ready to withdraw" },
    { label: "Avg. Sub Price", icon: "trendup", val: money(avgPrice), sub: "Average subscription" },
  ];

  const rows = useMemo(() => {
    let r = accounts.slice();
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((a) => a.username.toLowerCase().includes(t));
    if (status !== "all") r = r.filter((a) => a.status === status);
    r.sort((a, b) => {
      let c = 0;
      if (sort === "username") c = a.username.localeCompare(b.username);
      else if (sort === "subscribers") c = a.subscribers - b.subscribers;
      else c = a.balance - b.balance;
      return asc ? c : -c;
    });
    return r;
  }, [accounts, q, status, sort, asc]);

  const refresh = () => { setRefreshing(true); setTimeout(() => { setRefreshing(false); flash("All accounts refreshed."); }, 600); };
  const addAccount = (a: Omit<Account, "id">) => { setAccounts((s) => [{ ...a, id: "of_" + Math.floor(Math.random() * 99999) }, ...s]); flash("Account added."); };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>OnlyFans Manager <span className="badge b-soft">Beta</span></h1>
          <p>Manage OnlyFans accounts, track earnings, monitor campaigns, and view subscribers.</p>
        </div>
      </div>

      <div className="seg" style={{ marginBottom: 18 }}>
        {TABS.map((t) => <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}><Icon name={t.icon} /> {t.label}</button>)}
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

      <div className="card pad">
        <div className="panel-h">
          <div><div className="panel-title"><Icon name="users" /> OnlyFans Accounts</div><div className="panel-sub">Manage and monitor your OnlyFans accounts</div></div>
          <div className="btn-row">
            <button className="btn" onClick={refresh}><Icon name="refresh" className={refreshing ? "spin" : ""} /> Refresh All</button>
            <button className="btn brand" onClick={() => setAdd(true)}><Icon name="plus" /> Add Account</button>
          </div>
        </div>

        {tab === "accounts" && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "8px 0 16px" }}>
              <div className="search-bar"><Icon name="search" /><input placeholder="Search accounts…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select className="inp" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value as any)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
              <select className="inp" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="username">Username</option><option value="subscribers">Subscribers</option><option value="balance">Balance</option></select>
              <button className="btn icon" onClick={() => setAsc((v) => !v)} title={asc ? "Ascending" : "Descending"}><Icon name={asc ? "chevu" : "chevd"} /></button>
            </div>
            {rows.length === 0 ? (
              <div className="empty" style={{ padding: "60px 16px" }}>
                <Icon name="users" /><div style={{ fontWeight: 600, color: "#3f3f46" }}>No accounts found</div>
                <button className="btn brand" style={{ marginTop: 6 }} onClick={() => setAdd(true)}><Icon name="plus" /> Add Your First Account</button>
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Username</th><th>Status</th><th>Subscribers</th><th>Sub price</th><th>Balance</th><th></th></tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="u-name">{a.username}</td>
                      <td><span className={`badge ${ST_BADGE[a.status]}`} style={{ textTransform: "capitalize" }}>{a.status}</span></td>
                      <td>{a.subscribers}</td><td>{money(a.subPrice)}</td><td>{money(a.balance)}</td>
                      <td style={{ textAlign: "right" }}><button className="btn icon sm danger" onClick={() => setAccounts((s) => s.filter((x) => x.id !== a.id))}><Icon name="trash" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === "earnings" && (
          <div style={{ marginTop: 8 }}>
            <div className="of-summary">
              <div><span className="sub">Current balance</span><b>{money(totalBalance)}</b></div>
              <div><span className="sub">Total earnings</span><b>{money(totalEarnings)}</b></div>
              <div><span className="sub">Accounts</span><b>{accounts.length}</b></div>
            </div>
            {accounts.length === 0 ? <div className="empty-row">No earnings yet — add an account.</div> : (
              <table className="tbl" style={{ marginTop: 12 }}>
                <thead><tr><th>Username</th><th>Earnings</th><th>Balance</th></tr></thead>
                <tbody>{accounts.map((a) => <tr key={a.id}><td className="u-name">{a.username}</td><td>{money(a.earnings)}</td><td>{money(a.balance)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {tab === "analytics" && (
          <div className="of-summary" style={{ marginTop: 8 }}>
            <div><span className="sub">Total subscribers</span><b>{totalSubs}</b></div>
            <div><span className="sub">Avg. sub price</span><b>{money(avgPrice)}</b></div>
            <div><span className="sub">Est. monthly</span><b>{money(totalSubs * avgPrice)}</b></div>
          </div>
        )}

        {tab === "subscribers" && (
          accounts.length === 0 ? <div className="empty-row" style={{ marginTop: 8 }}>No subscribers yet — add an account.</div> : (
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead><tr><th>Username</th><th>Subscribers</th><th>Sub price</th></tr></thead>
              <tbody>{accounts.map((a) => <tr key={a.id}><td className="u-name">{a.username}</td><td>{a.subscribers}</td><td>{money(a.subPrice)}</td></tr>)}</tbody>
            </table>
          )
        )}
      </div>

      {add && <AddModal onClose={() => setAdd(false)} onSave={(a) => { addAccount(a); setAdd(false); }} />}
      {toast && <div className="of-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .of-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .of-summary > div{border:1px solid var(--line2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px}
        .of-summary b{font-size:22px;font-weight:700}
        .of-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .of-toast svg{width:15px;height:15px;color:#7ee2a8}
        .modal .of-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

function AddModal({ onClose, onSave }: { onClose: () => void; onSave: (a: Omit<Account, "id">) => void }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [subscribers, setSubscribers] = useState("0");
  const [subPrice, setSubPrice] = useState("9.99");
  const [balance, setBalance] = useState("0");
  const [earnings, setEarnings] = useState("0");
  const submit = () => {
    if (!username.trim()) return;
    onSave({ username: username.trim().startsWith("@") ? username.trim() : "@" + username.trim(), status,
      subscribers: +subscribers || 0, subPrice: +subPrice || 0, balance: +balance || 0, earnings: +earnings || 0 });
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add OnlyFans Account</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Track an account's subscribers and earnings.</p>
        <label className="of-l">Username</label>
        <input className="inp" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label className="of-l">Subscribers</label><input className="inp" type="number" value={subscribers} onChange={(e) => setSubscribers(e.target.value)} /></div>
          <div><label className="of-l">Sub price ($)</label><input className="inp" type="number" step="0.01" value={subPrice} onChange={(e) => setSubPrice(e.target.value)} /></div>
          <div><label className="of-l">Balance ($)</label><input className="inp" type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} /></div>
          <div><label className="of-l">Earnings ($)</label><input className="inp" type="number" step="0.01" value={earnings} onChange={(e) => setEarnings(e.target.value)} /></div>
        </div>
        <label className="of-l" style={{ marginTop: 14 }}>Status</label>
        <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
        <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Add Account</button></div>
      </div>
    </div>
  );
}
