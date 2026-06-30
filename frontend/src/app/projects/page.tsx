"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type TStatus = "todo" | "in_progress" | "done";
type Priority = "low" | "medium" | "high" | "urgent";
type Task = { id: string; title: string; status: TStatus; priority: Priority };
type Project = { id: string; name: string; department: string; description: string; status: "active" | "on_hold" | "completed"; priority: Priority; tasks: Task[] };
type Tpl = { id: string; name: string; department: string };

const DEPTS = ["Marketing", "Model Managers", "Operations", "Editors", "AI editors", "IG management", "Onlyfans management", "HR department", "Executive team"];

const SEED: Project[] = [
  { id: "p1", name: "Spring Campaign", department: "Marketing", description: "Q2 cross-platform promo push.", status: "active", priority: "high",
    tasks: [
      { id: "p1t1", title: "Draft creatives", status: "done", priority: "high" },
      { id: "p1t2", title: "Schedule posts", status: "in_progress", priority: "medium" },
      { id: "p1t3", title: "Brief models", status: "todo", priority: "medium" },
    ] },
  { id: "p2", name: "Model Onboarding Revamp", department: "Model Managers", description: "Streamline the new-model onboarding flow.", status: "active", priority: "medium",
    tasks: [
      { id: "p2t1", title: "Update checklist", status: "done", priority: "medium" },
      { id: "p2t2", title: "Record walkthrough", status: "todo", priority: "low" },
    ] },
  { id: "p3", name: "Site Migration", department: "Operations", description: "Move legacy assets to the new bucket.", status: "on_hold", priority: "low",
    tasks: [{ id: "p3t1", title: "Inventory pages", status: "todo", priority: "low" }] },
];

const ST_BADGE: Record<Project["status"], string> = { active: "b-green", on_hold: "b-amber", completed: "b-soft" };
const ST_LABEL: Record<Project["status"], string> = { active: "Active", on_hold: "On hold", completed: "Completed" };
const PRIO_BADGE: Record<Priority, string> = { low: "b-todo", medium: "b-soft", high: "b-amber", urgent: "b-red" };
const TASK_BADGE: Record<TStatus, string> = { todo: "b-todo", in_progress: "b-soft", done: "b-green" };
const TASK_LABEL: Record<TStatus, string> = { todo: "Todo", in_progress: "In progress", done: "Done" };
const NEXT: Record<TStatus, TStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };

const progress = (p: Project) => p.tasks.length ? Math.round(p.tasks.filter((t) => t.status === "done").length / p.tasks.length * 100) : 0;
const blankProject = (): Project => ({ id: "", name: "", department: DEPTS[0], description: "", status: "active", priority: "medium", tasks: [] });

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [dept, setDept] = useState("all");
  const [sortKey, setSortKey] = useState<"name" | "priority" | "progress">("name");
  const [asc, setAsc] = useState(true);

  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [tplModal, setTplModal] = useState(false);

  const [tq, setTq] = useState("");
  const [tStatus, setTStatus] = useState<"all" | TStatus>("all");
  const [tPrio, setTPrio] = useState<"all" | Priority>("all");
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const rows = useMemo(() => {
    let r = projects.slice();
    if (dept !== "all") r = r.filter((p) => p.department === dept);
    const rank = { urgent: 3, high: 2, medium: 1, low: 0 };
    r.sort((a, b) => {
      let c = 0;
      if (sortKey === "name") c = a.name.localeCompare(b.name);
      else if (sortKey === "priority") c = rank[a.priority] - rank[b.priority];
      else c = progress(a) - progress(b);
      return asc ? c : -c;
    });
    return r;
  }, [projects, dept, sortKey, asc]);

  const allTasks = useMemo(() => {
    let t = projects.flatMap((p) => p.tasks.map((tk) => ({ ...tk, project: p.name, projectId: p.id })));
    const term = tq.trim().toLowerCase();
    if (term) t = t.filter((x) => x.title.toLowerCase().includes(term) || x.project.toLowerCase().includes(term));
    if (tStatus !== "all") t = t.filter((x) => x.status === tStatus);
    if (tPrio !== "all") t = t.filter((x) => x.priority === tPrio);
    return t;
  }, [projects, tq, tStatus, tPrio]);

  const openCreate = () => { setIsNew(true); setEditing(blankProject()); };
  const openEdit = (p: Project) => { setIsNew(false); setEditing(p); };
  const saveProject = (p: Project) => {
    if (isNew) setProjects((s) => [{ ...p, id: "p_" + Math.floor(Math.random() * 99999) }, ...s]);
    else setProjects((s) => s.map((x) => (x.id === p.id ? p : x)));
    setEditing(null);
  };
  const delProject = (p: Project) => { if (confirm(`Delete project "${p.name}"?`)) setProjects((s) => s.filter((x) => x.id !== p.id)); };
  const saveAsTemplate = (p: Project) => { setTemplates((s) => [...s, { id: "tpl_" + Math.floor(Math.random() * 99999), name: p.name, department: p.department }]); flash(`Saved "${p.name}" as template.`); };

  // task ops inside the view modal
  const viewed = projects.find((p) => p.id === viewing) || null;
  const cycleTask = (pid: string, tid: string) => setProjects((s) => s.map((p) => p.id === pid ? { ...p, tasks: p.tasks.map((t) => t.id === tid ? { ...t, status: NEXT[t.status] } : t) } : p));
  const addTask = (pid: string, title: string, priority: Priority) => setProjects((s) => s.map((p) => p.id === pid ? { ...p, tasks: [...p.tasks, { id: "t_" + Math.floor(Math.random() * 99999), title, status: "todo", priority }] } : p));
  const delTask = (pid: string, tid: string) => setProjects((s) => s.map((p) => p.id === pid ? { ...p, tasks: p.tasks.filter((t) => t.id !== tid) } : p));

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="folders" /> Project Management Center</h1>
          <p>Create projects, save templates, and manage your project portfolio efficiently.</p>
          <div className="sub" style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <span><Icon name="folders" style={{ width: 13, height: 13, verticalAlign: -2 }} /> {projects.length} projects</span>
            <span><Icon name="note" style={{ width: 13, height: 13, verticalAlign: -2 }} /> {templates.length} templates</span>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => flash("Tour is mocked — explore freely!")}><Icon name="info" /> Tour this page</button>
          <button className="btn" onClick={openCreate}><Icon name="plus" /> Create New Project</button>
          <button className="btn" onClick={() => setTplModal(true)}><Icon name="note" /> Create New Template</button>
        </div>
      </div>

      <div className="dash-grid">
        {/* LEFT: active projects */}
        <div className="card pad">
          <div className="panel-h">
            <div className="panel-title"><Icon name="folder" /> Active Projects <span className="badge b-todo">{rows.length}</span></div>
          </div>
          <div className="btn-row" style={{ marginBottom: 16 }}>
            <select className="inp" style={{ width: "auto" }} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All Departments</option>
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="inp" style={{ width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="name">Name</option><option value="priority">Priority</option><option value="progress">Progress</option>
            </select>
            <button className="btn icon" onClick={() => setAsc((v) => !v)} title={asc ? "Ascending" : "Descending"}><Icon name={asc ? "chevu" : "chevd"} /></button>
          </div>

          {rows.length === 0 ? (
            <div className="empty" style={{ padding: "60px 16px" }}>
              <Icon name="folder" />
              <div style={{ fontWeight: 600, color: "#3f3f46", fontSize: 16 }}>No projects yet</div>
              <div className="sub" style={{ maxWidth: 380 }}>Get started by creating your first project. Projects help you organize work, assign teams, and track progress.</div>
              <button className="btn brand" style={{ marginTop: 8 }} onClick={openCreate}><Icon name="plus" /> Create First Project</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rows.map((p) => {
                const pr = progress(p);
                return (
                  <div className="pj-card" key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div className="u-name" style={{ fontSize: 14.5 }}>{p.name}</div>
                        <div className="sub" style={{ margin: "3px 0 8px" }}>{p.description}</div>
                      </div>
                      <span className={`badge ${ST_BADGE[p.status]}`}>{ST_LABEL[p.status]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="badge b-type">{p.department}</span>
                      <span className={`badge ${PRIO_BADGE[p.priority]}`}>{p.priority}</span>
                      <span className="badge b-todo">{p.tasks.length} tasks</span>
                    </div>
                    <div className="pj-bar"><span style={{ width: `${pr}%` }} /></div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <span className="sub">{pr}% complete</span>
                      <span className="btn-row">
                        <button className="btn icon sm" title="View tasks" onClick={() => setViewing(p.id)}><Icon name="eye" /></button>
                        <button className="btn icon sm" title="Edit" onClick={() => openEdit(p)}><Icon name="edit" /></button>
                        <button className="btn icon sm" title="Save as template" onClick={() => saveAsTemplate(p)}><Icon name="note" /></button>
                        <button className="btn icon sm danger" title="Delete" onClick={() => delProject(p)}><Icon name="trash" /></button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div className="dash-side">
          <div className="card pad">
            <div className="panel-h"><h3><Icon name="note" /> Templates ({templates.length})</h3></div>
            <div className="panel-sub" style={{ marginTop: -8 }}>Reusable project templates</div>
            {templates.length === 0 ? (
              <div className="empty" style={{ padding: "40px 16px" }}>
                <Icon name="note" />
                <div style={{ fontWeight: 600, color: "#3f3f46" }}>No templates yet</div>
                <div className="sub">Use “Save as template” on a project to add one.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map((t) => (
                  <div className="pj-tpl" key={t.id}>
                    <div><div className="u-name" style={{ fontSize: 13.5 }}>{t.name}</div><div className="sub">{t.department}</div></div>
                    <button className="btn icon sm danger" title="Delete" onClick={() => setTemplates((s) => s.filter((x) => x.id !== t.id))}><Icon name="trash" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="panel-h"><h3><Icon name="clip" /> All Tasks</h3></div>
            <div className="panel-sub" style={{ marginTop: -8 }}>Tasks from all projects · {allTasks.length} total</div>
            <div className="search-bar" style={{ margin: "10px 0" }}><Icon name="search" /><input placeholder="Search tasks…" value={tq} onChange={(e) => setTq(e.target.value)} /></div>
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <select className="inp" style={{ width: "auto" }} value={tStatus} onChange={(e) => setTStatus(e.target.value as any)}>
                <option value="all">All Status</option><option value="todo">Todo</option><option value="in_progress">In progress</option><option value="done">Done</option>
              </select>
              <select className="inp" style={{ width: "auto" }} value={tPrio} onChange={(e) => setTPrio(e.target.value as any)}>
                <option value="all">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            {allTasks.length === 0 ? (
              <div className="empty" style={{ padding: "30px 16px" }}><Icon name="clip" /><div className="sub">No tasks match.</div></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {allTasks.map((t) => (
                  <div className="pj-task" key={t.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="u-name" style={{ fontSize: 13 }}>{t.title}</div>
                      <div className="sub">{t.project}</div>
                    </div>
                    <span className="btn-row">
                      <span className={`badge ${PRIO_BADGE[t.priority]}`}>{t.priority}</span>
                      <span className={`badge ${TASK_BADGE[t.status]}`}>{TASK_LABEL[t.status]}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && <ProjectModal project={editing} isNew={isNew} onClose={() => setEditing(null)} onSave={saveProject} />}
      {tplModal && <TemplateModal onClose={() => setTplModal(false)} onSave={(name, d) => { setTemplates((s) => [...s, { id: "tpl_" + Math.floor(Math.random() * 99999), name, department: d }]); setTplModal(false); flash("Template created."); }} />}
      {viewed && <ProjectView project={viewed} onClose={() => setViewing(null)} onCycle={cycleTask} onAdd={addTask} onDel={delTask} />}
      {toast && <div className="pj-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .pj-card{border:1px solid var(--line2);border-radius:13px;padding:14px}
        .pj-bar{height:7px;background:#eceef1;border-radius:20px;overflow:hidden}
        .pj-bar span{display:block;height:100%;background:linear-gradient(90deg,#6a6ae0,var(--brand));border-radius:20px}
        .pj-tpl,.pj-task{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line2);border-radius:10px;padding:9px 11px}
        .modal .pj-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
        .pj-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .pj-toast svg{width:15px;height:15px;color:#7ee2a8}
      `}</style>
    </div>
  );
}

function ProjectModal({ project, isNew, onClose, onSave }: { project: Project; isNew: boolean; onClose: () => void; onSave: (p: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [department, setDepartment] = useState(project.department);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority);
  const submit = () => { if (!name.trim()) return; onSave({ ...project, name: name.trim(), department, description: description.trim(), status, priority }); };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isNew ? "Create New Project" : "Edit Project"}</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Organize work, assign a department, and track progress.</p>
        <label className="pj-l">Project name</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring Campaign" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label className="pj-l">Department</label>
            <select className="inp" value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></div>
          <div><label className="pj-l">Priority</label>
            <select className="inp" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        </div>
        <label className="pj-l" style={{ marginTop: 14 }}>Status</label>
        <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select>
        <label className="pj-l" style={{ marginTop: 14 }}>Description</label>
        <input className="inp" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" />
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={submit}><Icon name="check" /> {isNew ? "Create" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function TemplateModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, dept: string) => void }) {
  const [name, setName] = useState("");
  const [dept, setDept] = useState(DEPTS[0]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create New Template</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>A reusable project blueprint.</p>
        <label className="pj-l">Template name</label>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Launch" autoFocus />
        <label className="pj-l" style={{ marginTop: 14 }}>Department</label>
        <select className="inp" value={dept} onChange={(e) => setDept(e.target.value)}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
        <div className="actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn brand" onClick={() => name.trim() && onSave(name.trim(), dept)}><Icon name="check" /> Create</button>
        </div>
        <style>{`.modal .pj-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}`}</style>
      </div>
    </div>
  );
}

function ProjectView({ project, onClose, onCycle, onAdd, onDel }: {
  project: Project; onClose: () => void; onCycle: (pid: string, tid: string) => void; onAdd: (pid: string, title: string, prio: Priority) => void; onDel: (pid: string, tid: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [prio, setPrio] = useState<Priority>("medium");
  const add = () => { if (title.trim()) { onAdd(project.id, title.trim(), prio); setTitle(""); } };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{project.name} <span className={`badge ${ST_BADGE[project.status]}`}>{ST_LABEL[project.status]}</span></h3>
        <p className="sub" style={{ margin: "4px 0 16px" }}>{project.description}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {project.tasks.length === 0 && <div className="empty-row">No tasks yet — add one below.</div>}
          {project.tasks.map((t) => (
            <div className="pj-task" key={t.id}>
              <div style={{ minWidth: 0 }}><div className="u-name" style={{ fontSize: 13 }}>{t.title}</div><div className="sub">{t.priority}</div></div>
              <span className="btn-row">
                <button className={`badge ${TASK_BADGE[t.status]}`} style={{ cursor: "pointer", border: 0 }} onClick={() => onCycle(project.id, t.id)} title="Click to advance">{TASK_LABEL[t.status]}</button>
                <button className="btn icon sm danger" onClick={() => onDel(project.id, t.id)}><Icon name="trash" /></button>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…" onKeyDown={(e) => e.key === "Enter" && add()} />
          <select className="inp" style={{ width: "auto" }} value={prio} onChange={(e) => setPrio(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
          <button className="btn brand" onClick={add}><Icon name="plus" /></button>
        </div>
        <div className="actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
