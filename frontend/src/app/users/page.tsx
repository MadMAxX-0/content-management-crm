"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { api, UserRow, fmtDate } from "@/lib/api";

const ROLE_META: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "b-green" },
  va: { label: "VA", cls: "b-soft" },
  creator: { label: "Creator", cls: "b-pink" },
  none: { label: "No access", cls: "b-amber" },
};

const TABS: { key: string; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "users" },
  { key: "admin", label: "Admins", icon: "star" },
  { key: "va", label: "VAs", icon: "clip" },
  { key: "creator", label: "Creators", icon: "phone" },
  { key: "none", label: "Unassigned", icon: "user" },
];

const EMPTY = { email: "", password: "", role: "va" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setUsers(await api.listUsers()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const upd = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const create = async () => {
    if (!f.email.trim() || !f.password.trim()) { setErr("Email and password are required."); return; }
    setBusy(true); setErr(null);
    try {
      await api.createUser({ email: f.email.trim(), password: f.password, role: f.role });
      setShow(false); setF({ ...EMPTY }); await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const changeRole = async (u: UserRow, role: string) => {
    setErr(null);
    try { await api.setUserRole(u.email || "", role); await load(); } catch (e: any) { setErr(e.message); }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`Delete the login for ${u.email}? They will lose access immediately.`)) return;
    setErr(null);
    try { await api.deleteUser(u.id, u.email || ""); await load(); } catch (e: any) { setErr(e.message); }
  };

  const counts = useMemo(
    () => users.reduce((a, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {} as Record<string, number>),
    [users]
  );
  const list = users.filter(
    (u) => (tab === "all" || u.role === tab) && (u.email || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="users" /> Manage Users <span className="count" style={{ verticalAlign: "middle" }}>{users.length} total</span></h1>
          <p>Login accounts, roles, and what each person can access.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={load}><Icon name="refresh" className={loading ? "spin" : ""} /> Refresh</button>
          <button className="btn brand" onClick={() => { setF({ ...EMPTY }); setErr(null); setShow(true); }}><Icon name="uplus" /> Add User</button>
        </div>
      </div>

      <div className="utabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} /> {t.label}
            <span className="ut-count">{t.key === "all" ? users.length : counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      {err && <div className="note">{err}</div>}

      <div className="card pad">
        <div className="users-bar">
          <div className="search-inp"><Icon name="search" /><input placeholder="Search by email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="role-key">
            <span><b className="badge b-green">Admin</b> Full access</span>
            <span><b className="badge b-soft">VA</b> Model Tasks</span>
            <span><b className="badge b-pink">Creator</b> Own tasks</span>
          </div>
        </div>

        {loading ? (
          <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
        ) : list.length === 0 ? (
          <div className="empty">{users.length === 0 ? "No login accounts yet. Add one to grant access." : "No users match."}</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>User</th><th>Role</th><th>Linked model</th><th>Last sign-in</th><th style={{ width: 60 }}></th></tr></thead>
              <tbody>
                {list.map((u) => {
                  const rm = ROLE_META[u.role] || ROLE_META.none;
                  const initial = (u.model || u.email || "?").charAt(0).toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="u-cell">
                          <span className={`u-av r-${u.role}`}>{initial}</span>
                          <span className="u-meta">
                            <b>{u.email}</b>{u.is_self && <span className="sub"> (you)</span>}
                          </span>
                        </div>
                      </td>
                      <td>
                        {u.locked ? (
                          <span className={`badge ${rm.cls}`}><Icon name="power" /> {rm.label}</span>
                        ) : u.role === "creator" ? (
                          <span className={`badge ${rm.cls}`}>{rm.label}</span>
                        ) : (
                          <select className="inp sm" value={u.role === "admin" || u.role === "va" ? u.role : "none"}
                            onChange={(e) => changeRole(u, e.target.value)}>
                            <option value="admin">Admin</option>
                            <option value="va">VA</option>
                            <option value="none">No access</option>
                          </select>
                        )}
                      </td>
                      <td>{u.model || <span className="sub">—</span>}</td>
                      <td className="sub">{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "never"}</td>
                      <td>
                        {!u.locked && !u.is_self && (
                          <button className="icon-btn danger" title="Delete login" onClick={() => remove(u)}><Icon name="trash" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-sub" style={{ marginTop: 12 }}>
          <Icon name="info" /> Accounts with a power icon are set on the server (Railway) and can't be changed here.
          Creators are linked automatically when their email matches a model.
        </div>
      </div>

      {show && (
        <div className="overlay" onClick={() => setShow(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add User</h3>
            <p className="sub" style={{ margin: "2px 0 0" }}>Creates a login account and grants the chosen access.</p>
            <div className="form-grid">
              <div className="full"><label className="lbl-f">Email *</label><input className="inp" type="email" value={f.email} onChange={(e) => upd("email", e.target.value)} placeholder="person@email.com" /></div>
              <div className="full"><label className="lbl-f">Temporary password *</label><input className="inp" value={f.password} onChange={(e) => upd("password", e.target.value)} placeholder="at least 6 characters" /></div>
              <div className="full"><label className="lbl-f">Role</label>
                <select className="inp" value={f.role} onChange={(e) => upd("role", e.target.value)}>
                  <option value="va">VA — Model Tasks only</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn brand" onClick={create} disabled={busy}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name="plus" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
