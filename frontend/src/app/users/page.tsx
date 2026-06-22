"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, UserRow, fmtDate } from "@/lib/api";

const ROLE_META: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "b-green" },
  va: { label: "VA", cls: "b-soft" },
  creator: { label: "Creator", cls: "b-pink" },
  none: { label: "No access", cls: "b-amber" },
};

const EMPTY = { email: "", password: "", role: "va" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const counts = users.reduce((a, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {} as Record<string, number>);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="users" /> Manage Users <span className="count" style={{ verticalAlign: "middle" }}>{users.length} total</span></h1>
          <p>Login accounts and what each person can access.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={load}><Icon name="refresh" className={loading ? "spin" : ""} /> Refresh</button>
          <button className="btn brand" onClick={() => { setF({ ...EMPTY }); setErr(null); setShow(true); }}><Icon name="uplus" /> Add User</button>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="role-key">
          <span><b className="badge b-green">Admin</b> Full CRM access</span>
          <span><b className="badge b-soft">VA</b> Model Tasks only</span>
          <span><b className="badge b-pink">Creator</b> Their own task view (linked to a model)</span>
          <span><b className="badge b-amber">No access</b> Signed up but not assigned</span>
        </div>
      </div>

      {err && <div className="note">{err}</div>}

      <div className="card pad">
        <div className="panel-title">Users ({users.length})</div>
        <div className="panel-sub">
          {counts.admin || 0} admin · {counts.va || 0} VA · {counts.creator || 0} creator · {counts.none || 0} unassigned
        </div>
        {loading ? (
          <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
        ) : users.length === 0 ? (
          <div className="empty">No login accounts yet. Add one to grant access.</div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Email</th><th>Role</th><th>Linked model</th><th>Last sign-in</th><th style={{ width: 60 }}></th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const rm = ROLE_META[u.role] || ROLE_META.none;
                  return (
                    <tr key={u.id}>
                      <td><b>{u.email}</b>{u.is_self && <span className="sub"> (you)</span>}</td>
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
          <Icon name="info" /> Accounts marked with a power icon are set on the server (Railway) and can't be changed here.
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
