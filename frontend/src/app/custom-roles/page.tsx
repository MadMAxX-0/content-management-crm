"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Role = {
  id: string;
  name: string;
  description: string;
  base: string;          // base role it was derived from
  system: boolean;
  protected: boolean;
  locked: boolean;
  features: string[];
  members: number;
};

const SEED: Role[] = [
  { id: "r1", name: "Default Employee", description: "Default role for employees with basic access", base: "Employee", system: true, protected: true, locked: true, features: [], members: 0 },
  { id: "r2", name: "Default Manager", description: "Default role for managers with comprehensive access", base: "Manager", system: true, protected: true, locked: true, features: [], members: 0 },
  { id: "r3", name: "Default Admin", description: "Default role for administrators with full access", base: "Admin", system: true, protected: true, locked: true, features: [], members: 0 },
];

const BASE_ROLES = ["Employee", "Manager", "Admin", "Chatter", "Editor"];

type TypeF = "all" | "system" | "custom";
type AssignF = "all" | "inuse" | "unassigned";
type SortKey = "members" | "name" | "features";

const blank = (): Role => ({ id: "", name: "", description: "", base: "Employee", system: false, protected: false, locked: false, features: [], members: 0 });

export default function CustomRolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>(SEED);
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState<TypeF>("all");
  const [assignF, setAssignF] = useState<AssignF>("all");
  const [sortKey, setSortKey] = useState<SortKey>("members");
  const [asc, setAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState<Role | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<Role | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  // KPIs
  const total = roles.length;
  const inUse = roles.filter((r) => r.members > 0).length;
  const inUsePct = total ? Math.round((inUse / total) * 100) : 0;
  const protectedN = roles.filter((r) => r.protected).length;
  const systemN = roles.filter((r) => r.system).length;
  const avgFeatures = total ? Math.round(roles.reduce((s, r) => s + r.features.length, 0) / total) : 0;

  const rows = useMemo(() => {
    let r = roles.slice();
    const term = q.trim().toLowerCase();
    if (term) r = r.filter((x) =>
      x.name.toLowerCase().includes(term) || x.description.toLowerCase().includes(term) ||
      x.features.some((f) => f.toLowerCase().includes(term)));
    if (typeF === "system") r = r.filter((x) => x.system);
    if (typeF === "custom") r = r.filter((x) => !x.system);
    if (assignF === "inuse") r = r.filter((x) => x.members > 0);
    if (assignF === "unassigned") r = r.filter((x) => x.members === 0);
    r.sort((a, b) => {
      let c = 0;
      if (sortKey === "members") c = a.members - b.members;
      else if (sortKey === "name") c = a.name.localeCompare(b.name);
      else c = a.features.length - b.features.length;
      return asc ? c : -c;
    });
    return r;
  }, [roles, q, typeF, assignF, sortKey, asc]);

  const refresh = () => { setRefreshing(true); setQ(""); setTypeF("all"); setAssignF("all"); setTimeout(() => setRefreshing(false), 500); };
  const openCreate = () => { setIsNew(true); setEditing(blank()); };
  const openEdit = (r: Role) => { setMenu(null); setIsNew(false); setEditing(r); };

  const save = (r: Role) => {
    if (isNew) setRoles((s) => [{ ...r, id: "r" + (s.length + 1) + "_" + Math.floor(Math.random() * 9999) }, ...s]);
    else setRoles((s) => s.map((x) => (x.id === r.id ? r : x)));
    setEditing(null);
  };
  const duplicate = (r: Role) => {
    setMenu(null);
    setRoles((s) => [{ ...r, id: "r_" + Math.floor(Math.random() * 99999), name: `${r.name} (copy)`, system: false, protected: false, locked: false, members: 0 }, ...s]);
  };
  const remove = (r: Role) => {
    setMenu(null);
    if (r.protected) { alert("Protected system roles can't be deleted."); return; }
    if (!confirm(`Delete role "${r.name}"?`)) return;
    setRoles((s) => s.filter((x) => x.id !== r.id));
  };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <span className="badge b-todo" style={{ marginBottom: 8 }}>Access control</span>
          <h1><Icon name="user" /> Custom Roles</h1>
          <p>Build lean, reusable roles that match how your team actually works. Start from a base role, add only the abilities you need, and keep risk contained.</p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => router.push("/users")}><Icon name="users" /> View users</button>
        </div>
      </div>

      <div className="card pad">
        <div className="panel-h">
          <div>
            <div className="panel-title"><Icon name="user" /> All Roles ({roles.length}) <span className="badge b-todo">Catalog</span></div>
            <div className="panel-sub">Search, filter, and keep a predictable list of reusable access profiles.</div>
          </div>
          <div className="btn-row">
            <button className="btn" onClick={refresh}><Icon name="refresh" className={refreshing ? "spin" : ""} /> Refresh</button>
            <button className="btn brand" onClick={openCreate}><Icon name="plus" /> New role</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid" style={{ margin: "6px 0 18px" }}>
          <div className="kpi"><div className="kpi-top">Total roles</div><div className="kpi-val">{total}</div></div>
          <div className="kpi"><div className="kpi-top">In use</div><div className="kpi-val">{inUse} <span className="badge b-soft" style={{ verticalAlign: "middle" }}>{inUsePct}%</span></div></div>
          <div className="kpi"><div className="kpi-top">Protected / system</div><div className="kpi-val" style={{ fontSize: 18, marginTop: 14 }}>{protectedN} protected · {systemN} system</div></div>
          <div className="kpi"><div className="kpi-top">Avg. features per role</div><div className="kpi-val">{avgFeatures}</div></div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div className="search-bar"><Icon name="search" /><input placeholder="Search by name, description, or feature" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="inp" style={{ width: "auto" }} value={typeF} onChange={(e) => setTypeF(e.target.value as TypeF)}>
            <option value="all">All roles</option><option value="system">System</option><option value="custom">Custom</option>
          </select>
          <select className="inp" style={{ width: "auto" }} value={assignF} onChange={(e) => setAssignF(e.target.value as AssignF)}>
            <option value="all">All assignments</option><option value="inuse">In use</option><option value="unassigned">Unassigned</option>
          </select>
          <select className="inp" style={{ width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="members">Members</option><option value="name">Name</option><option value="features">Features</option>
          </select>
          <button className="btn icon" title={asc ? "Ascending" : "Descending"} onClick={() => setAsc((v) => !v)}><Icon name={asc ? "chevu" : "chevd"} /></button>
        </div>

        {rows.length === 0 ? (
          <div className="empty"><Icon name="user" /><div className="sub">No roles match your filters.</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Role</th><th>Access</th><th>Members</th><th>Flags</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="u-name">{r.name}</span>
                      {r.system && <span className="badge b-todo">System</span>}
                      {r.protected && <span className="badge b-soft">Protected</span>}
                    </div>
                    <div className="sub" style={{ marginTop: 3 }}>{r.description}</div>
                  </td>
                  <td>
                    <div className="u-name" style={{ fontSize: 13 }}>{r.features.length ? `${r.features.length} feature${r.features.length === 1 ? "" : "s"}` : "No features selected"}</div>
                    <div className="sub">{r.features.length} permission{r.features.length === 1 ? "" : "s"} bundled</div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <Icon name="users" style={{ width: 15, height: 15, color: "var(--muted2)" }} />
                      <span className="u-name">{r.members}</span>
                      <span className={`badge ${r.members ? "b-green" : "b-todo"}`}>{r.members ? "Assigned" : "Unassigned"}</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                      {r.locked && <span className="badge b-todo">Locked</span>}
                      <span className="badge b-todo">Base</span>
                      {r.members === 0 && <span className="badge b-todo">No members</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", gap: 6, position: "relative" }}>
                      <button className="btn sm" onClick={() => setViewing(r)}><Icon name="eye" /> Quick view</button>
                      <button className="btn icon sm" title="More" onClick={() => setMenu(menu === r.id ? null : r.id)}><Icon name="dots" /></button>
                      {menu === r.id && (
                        <>
                          <div className="backdrop" onClick={() => setMenu(null)} />
                          <div className="menu">
                            <button onClick={() => openEdit(r)}><Icon name="edit" /> Edit role</button>
                            <button onClick={() => duplicate(r)}><Icon name="copy" /> Duplicate</button>
                            <div className="sep" />
                            <button className="danger" onClick={() => remove(r)}><Icon name="trash" /> Delete</button>
                          </div>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && <RoleModal role={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />}
      {viewing && <ViewModal role={viewing} onClose={() => setViewing(null)} onEdit={() => { const r = viewing; setViewing(null); openEdit(r); }} />}
    </div>
  );
}

function RoleModal({ role, isNew, onClose, onSave }: { role: Role; isNew: boolean; onClose: () => void; onSave: (r: Role) => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [base, setBase] = useState(role.base);
  const [features, setFeatures] = useState(role.features.join(", "));
  const locked = role.protected;

  const submit = () => {
    if (!name.trim()) return;
    onSave({ ...role, name: name.trim(), description: description.trim(), base, features: features.split(",").map((f) => f.trim()).filter(Boolean) });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "New role" : "Edit role"}</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>{locked ? "This is a protected system role — fields are read-only." : "Start from a base role and add only the abilities you need."}</p>

        <label className="cr-l">Role name</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} disabled={locked} placeholder="e.g. Senior Chatter" autoFocus />

        <label className="cr-l" style={{ marginTop: 14 }}>Description</label>
        <input className="inp" value={description} onChange={(e) => setDescription(e.target.value)} disabled={locked} placeholder="What is this role for?" />

        <label className="cr-l" style={{ marginTop: 14 }}>Base role</label>
        <select className="inp" value={base} onChange={(e) => setBase(e.target.value)} disabled={locked}>
          {BASE_ROLES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <label className="cr-l" style={{ marginTop: 14 }}>Features <span className="sub">(comma-separated abilities)</span></label>
        <input className="inp" value={features} onChange={(e) => setFeatures(e.target.value)} disabled={locked} placeholder="e.g. view_tasks, upload_media, review" />

        <div className="actions">
          <button className="btn" onClick={onClose}>{locked ? "Close" : "Cancel"}</button>
          {!locked && <button className="btn brand" onClick={submit}><Icon name="check" /> {isNew ? "Create role" : "Save changes"}</button>}
        </div>
      </div>
      <style>{`.modal .cr-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
    </div>
  );
}

function ViewModal({ role, onClose, onEdit }: { role: Role; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {role.name}
          {role.system && <span className="badge b-todo">System</span>}
          {role.protected && <span className="badge b-soft">Protected</span>}
        </h3>
        <p className="sub" style={{ margin: "4px 0 16px" }}>{role.description}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="card pad" style={{ borderRadius: 12 }}><div className="sub">Base role</div><div className="u-name">{role.base}</div></div>
          <div className="card pad" style={{ borderRadius: 12 }}><div className="sub">Members</div><div className="u-name">{role.members}</div></div>
        </div>

        <div className="sub" style={{ marginBottom: 6 }}>Features ({role.features.length})</div>
        {role.features.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {role.features.map((f) => <span className="badge b-soft" key={f}>{f}</span>)}
          </div>
        ) : <div className="empty-row">No features selected — 0 permissions bundled.</div>}

        <div className="actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn brand" onClick={onEdit}><Icon name="edit" /> Edit</button>
        </div>
      </div>
    </div>
  );
}
