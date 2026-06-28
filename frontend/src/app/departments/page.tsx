"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Dept = {
  id: string;
  name: string;
  managers: string[];
  telegram: string;
  employees: number;
};

const SEED: Dept[] = [
  { id: "a13263", name: "AI editors", managers: [], telegram: "", employees: 0 },
  { id: "a13275", name: "Cupid management", managers: [], telegram: "", employees: 0 },
  { id: "a13260", name: "Editors", managers: [], telegram: "", employees: 0 },
  { id: "a13284", name: "Executive team", managers: ["Alex Mercer"], telegram: "", employees: 4 },
  { id: "a13281", name: "HR department", managers: [], telegram: "", employees: 0 },
  { id: "a13266", name: "Marketing", managers: ["Dana Lee"], telegram: "@yt_marketing", employees: 6 },
  { id: "a13270", name: "Sales", managers: [], telegram: "", employees: 3 },
  { id: "a13272", name: "Chatters", managers: ["Sam Cole", "Priya Nair"], telegram: "@yt_chat", employees: 12 },
  { id: "a13277", name: "Onboarding", managers: [], telegram: "", employees: 0 },
  { id: "a13288", name: "Finance", managers: ["Jordan Pike"], telegram: "", employees: 2 },
  { id: "a13290", name: "Design", managers: [], telegram: "", employees: 5 },
  { id: "a13293", name: "Operations", managers: [], telegram: "@yt_ops", employees: 8 },
  { id: "a13295", name: "Support", managers: [], telegram: "", employees: 0 },
];

type SortKey = "name" | "id" | "team";
type Filter = "all" | "configured" | "needs";

const blank = (): Dept => ({ id: "", name: "", managers: [], telegram: "", employees: 0 });

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>(SEED);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const [editing, setEditing] = useState<Dept | null>(null); // edit/create modal
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<Dept | null>(null); // detail modal

  const rows = useMemo(() => {
    let r = depts.slice();
    if (filter === "configured") r = r.filter((d) => d.managers.length > 0 || d.telegram || d.employees > 0);
    if (filter === "needs") r = r.filter((d) => d.managers.length === 0 && !d.telegram && d.employees === 0);
    r.sort((a, b) => {
      let c = 0;
      if (sortKey === "name") c = a.name.localeCompare(b.name);
      else if (sortKey === "id") c = a.id.localeCompare(b.id);
      else c = a.employees - b.employees;
      return asc ? c : -c;
    });
    return r;
  }, [depts, filter, sortKey, asc]);

  const openCreate = () => { setIsNew(true); setEditing(blank()); };
  const openEdit = (d: Dept) => { setIsNew(false); setEditing(d); };

  const save = (d: Dept) => {
    if (isNew) {
      const id = "a" + Math.floor(13300 + Math.random() * 600);
      setDepts((s) => [{ ...d, id }, ...s]);
    } else {
      setDepts((s) => s.map((x) => (x.id === d.id ? d : x)));
    }
    setEditing(null);
  };

  const remove = (d: Dept) => {
    if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return;
    setDepts((s) => s.filter((x) => x.id !== d.id));
  };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="building" /> Manage Departments</h1>
          <p>Create and manage departments and assign managers.</p>
        </div>
        <div className="btn-row">
          <select className="inp" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">All Departments</option>
            <option value="configured">Configured</option>
            <option value="needs">Needs setup</option>
          </select>
          <select className="inp" style={{ width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="name">Name</option>
            <option value="id">ID</option>
            <option value="team">Team Size</option>
          </select>
          <button className="btn icon" title={asc ? "Ascending" : "Descending"} onClick={() => setAsc((v) => !v)}>
            <Icon name={asc ? "chevu" : "chevd"} />
          </button>
          <button className="btn brand" onClick={openCreate}><Icon name="plus" /> Create Department</button>
        </div>
      </div>

      <div className="card pad">
        <div className="panel-h">
          <div>
            <div className="panel-title"><Icon name="building" /> Department List</div>
            <div className="panel-sub">{rows.length} departments found</div>
          </div>
          <span className="badge b-todo">{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty"><Icon name="building" /><div className="sub">No departments match this filter.</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th><th>Managers</th><th>Communication</th>
                <th>Team Size</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <span className="dept-ic"><Icon name="building" /></span>
                      <div>
                        <div className="u-name">{d.name}</div>
                        <div className="sub">ID: {d.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <button className="dept-cell" onClick={() => openEdit(d)} title="Assign managers">
                      <Icon name="uplus" />
                      <span>
                        <span className="dc-main">{d.managers.length} manager{d.managers.length === 1 ? "" : "s"}</span>
                        <span className="sub">{d.managers.length ? d.managers.join(", ") : "No managers assigned"}</span>
                      </span>
                      <Icon name="chevr" className="dc-go" />
                    </button>
                  </td>
                  <td>
                    <button className="dept-cell" onClick={() => openEdit(d)} title="Set Telegram group">
                      <Icon name="send" />
                      <span>
                        <span className="dc-main">{d.telegram ? "Configured" : "Not configured"}</span>
                        <span className="sub">{d.telegram || "No Telegram group set"}</span>
                      </span>
                      <Icon name="chevr" className="dc-go" />
                    </button>
                  </td>
                  <td>
                    <button className="dept-cell" onClick={() => openEdit(d)} title="Manage team size">
                      <Icon name="users" />
                      <span>
                        <span className="dc-main">{d.employees} employee{d.employees === 1 ? "" : "s"}</span>
                        <span className="sub">{d.employees ? `${d.employees} assigned` : "No employees assigned"}</span>
                      </span>
                      <Icon name="chevr" className="dc-go" />
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      <button className="btn icon sm" title="View" onClick={() => setViewing(d)}><Icon name="eye" /></button>
                      <button className="btn icon sm" title="Settings" onClick={() => openEdit(d)}><Icon name="gear" /></button>
                      <button className="btn icon sm danger" title="Delete" onClick={() => remove(d)}><Icon name="trash" /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <DeptModal dept={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={save} />
      )}
      {viewing && (
        <ViewModal dept={viewing} onClose={() => setViewing(null)} onEdit={() => { const d = viewing; setViewing(null); openEdit(d); }} />
      )}

      <style>{`
        .dept-ic{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:#f3f4f6;color:#52525b;flex:none}
        .dept-ic svg{width:18px;height:18px}
        .dept-cell{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;cursor:pointer;padding:4px;border-radius:9px;text-align:left;color:inherit}
        .dept-cell:hover{background:#fafafb}
        .dept-cell > svg:first-child{width:16px;height:16px;color:var(--muted2);flex:none}
        .dept-cell span{display:flex;flex-direction:column;min-width:0}
        .dept-cell .dc-main{font-weight:600;font-size:13px;letter-spacing:-.01em}
        .dept-cell .dc-go{width:15px;height:15px;color:var(--muted2);margin-left:auto;flex:none}
        .modal .fld-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

// ── Create / edit modal ───────────────────────────────────────────────────────
function DeptModal({ dept, isNew, onClose, onSave }: {
  dept: Dept; isNew: boolean; onClose: () => void; onSave: (d: Dept) => void;
}) {
  const [name, setName] = useState(dept.name);
  const [managers, setManagers] = useState(dept.managers.join(", "));
  const [telegram, setTelegram] = useState(dept.telegram);
  const [employees, setEmployees] = useState(String(dept.employees));

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      ...dept,
      name: name.trim(),
      managers: managers.split(",").map((m) => m.trim()).filter(Boolean),
      telegram: telegram.trim(),
      employees: Math.max(0, parseInt(employees, 10) || 0),
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Create Department" : "Edit Department"}</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>{isNew ? "Add a new department to your organization." : `ID: ${dept.id}`}</p>

        <label className="fld-l">Department name</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI editors" autoFocus />

        <label className="fld-l" style={{ marginTop: 14 }}>Managers <span className="sub">(comma-separated)</span></label>
        <input className="inp" value={managers} onChange={(e) => setManagers(e.target.value)} placeholder="e.g. Alex Mercer, Dana Lee" />

        <label className="fld-l" style={{ marginTop: 14 }}>Telegram group</label>
        <input className="inp" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="e.g. @yt_editors" />

        <label className="fld-l" style={{ marginTop: 14 }}>Team size (employees)</label>
        <input className="inp" type="number" min={0} value={employees} onChange={(e) => setEmployees(e.target.value)} />

        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={submit}><Icon name="check" /> {isNew ? "Create" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── View modal ────────────────────────────────────────────────────────────────
function ViewModal({ dept, onClose, onEdit }: { dept: Dept; onClose: () => void; onEdit: () => void }) {
  const Row = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderTop: "1px solid var(--line2)" }}>
      <Icon name={icon} />
      <div style={{ flex: 1 }}><div className="sub">{label}</div><div className="u-name" style={{ fontSize: 14 }}>{value}</div></div>
    </div>
  );
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span className="dept-ic"><Icon name="building" /></span>
          <div><h3 style={{ margin: 0 }}>{dept.name}</h3><div className="sub">ID: {dept.id}</div></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Row icon="uplus" label="Managers" value={dept.managers.length ? dept.managers.join(", ") : "No managers assigned"} />
          <Row icon="send" label="Communication" value={dept.telegram || "No Telegram group set"} />
          <Row icon="users" label="Team size" value={dept.employees ? `${dept.employees} employees` : "No employees assigned"} />
        </div>
        <div className="actions">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn brand" onClick={onEdit}><Icon name="gear" /> Edit</button>
        </div>
      </div>
    </div>
  );
}
