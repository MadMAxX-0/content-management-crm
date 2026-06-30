"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Priority = "low" | "medium" | "high" | "urgent";
type TStatus = "todo" | "in_progress" | "done";
type Task = { id: string; title: string; description: string; type: string; priority: Priority; status: TStatus; tags: string[]; notes: string; created: string };
type Tpl = { id: string; name: string; taskTitle: string; description: string; type: string; priority: Priority; notes: string };
type ProjTask = { id: string; title: string; project: string; status: TStatus; priority: Priority };

const TYPES = ["General", "Content", "Admin", "Review", "Outreach"];
const PRIO_BADGE: Record<Priority, string> = { low: "b-todo", medium: "b-soft", high: "b-amber", urgent: "b-red" };
const ST_BADGE: Record<TStatus, string> = { todo: "b-todo", in_progress: "b-soft", done: "b-green" };
const ST_LABEL: Record<TStatus, string> = { todo: "Todo", in_progress: "In progress", done: "Done" };

const PROJECT_TASKS: ProjTask[] = [
  { id: "pt1", title: "Review April analytics", project: "Spring Campaign", status: "in_progress", priority: "high" },
  { id: "pt2", title: "Approve onboarding script", project: "Model Onboarding Revamp", status: "todo", priority: "medium" },
  { id: "pt3", title: "Backup legacy bucket", project: "Site Migration", status: "todo", priority: "low" },
];

const today = () => new Date().toISOString();
const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function CreateTasksPage() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projTasks] = useState<ProjTask[]>(PROJECT_TASKS);

  const [drawer, setDrawer] = useState<null | "task" | "template">(null);

  // project tasks filters
  const [pq, setPq] = useState("");
  const [pStatus, setPStatus] = useState<"all" | TStatus>("all");
  const [pPrio, setPPrio] = useState<"all" | Priority>("all");

  // your tasks filters
  const [yq, setYq] = useState("");
  const [tagF, setTagF] = useState("all");
  const [sortKey, setSortKey] = useState<"created" | "title" | "priority">("created");
  const [asc, setAsc] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const projFiltered = useMemo(() => {
    let r = projTasks.slice();
    const t = pq.trim().toLowerCase();
    if (t) r = r.filter((x) => x.title.toLowerCase().includes(t) || x.project.toLowerCase().includes(t));
    if (pStatus !== "all") r = r.filter((x) => x.status === pStatus);
    if (pPrio !== "all") r = r.filter((x) => x.priority === pPrio);
    return r;
  }, [projTasks, pq, pStatus, pPrio]);

  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.tags))), [tasks]);
  const yourFiltered = useMemo(() => {
    let r = tasks.slice();
    const t = yq.trim().toLowerCase();
    if (t) r = r.filter((x) => x.title.toLowerCase().includes(t) || x.description.toLowerCase().includes(t));
    if (tagF !== "all") r = r.filter((x) => x.tags.includes(tagF));
    const rank = { urgent: 3, high: 2, medium: 1, low: 0 };
    r.sort((a, b) => {
      let c = 0;
      if (sortKey === "title") c = a.title.localeCompare(b.title);
      else if (sortKey === "priority") c = rank[a.priority] - rank[b.priority];
      else c = a.created.localeCompare(b.created);
      return asc ? c : -c;
    });
    return r;
  }, [tasks, yq, tagF, sortKey, asc]);

  const addTask = (t: Omit<Task, "id" | "created">) => { setTasks((s) => [{ ...t, id: "t_" + Math.floor(Math.random() * 99999), created: today() }, ...s]); };
  const useTemplate = (tpl: Tpl) => { addTask({ title: tpl.taskTitle || tpl.name, description: tpl.description, type: tpl.type, priority: tpl.priority, status: "todo", tags: [], notes: tpl.notes }); flash(`Task created from "${tpl.name}".`); };

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Task Management Center</h1>
          <p>Create and manage tasks for your team. Use templates for quick task creation.</p>
          <div className="sub" style={{ marginTop: 6 }}>← Drag templates to tasks area to create new tasks</div>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => flash("Tour is mocked — explore freely!")}><Icon name="info" /> Tour this page</button>
          <button className="btn" onClick={() => setDrawer("task")}><Icon name="plus" /> Create Task</button>
          <button className="btn" onClick={() => setDrawer("template")}><Icon name="gear" /> Create Template</button>
        </div>
      </div>

      {/* Task Templates */}
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="panel-h"><div><div className="panel-title"><Icon name="gear" /> Task Templates ({templates.length})</div><div className="panel-sub">Reusable templates for quick task creation</div></div></div>
        {templates.length === 0 ? (
          <div className="empty" style={{ padding: "50px 16px" }}><Icon name="gear" /><div className="sub">No templates yet</div></div>
        ) : (
          <div className="ct-tpls">
            {templates.map((tpl) => (
              <div className="ct-tpl" key={tpl.id}>
                <div className="u-name" style={{ fontSize: 13.5 }}>{tpl.name}</div>
                <div className="sub" style={{ margin: "2px 0 8px" }}>{tpl.taskTitle || "—"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="badge b-type">{tpl.type}</span><span className={`badge ${PRIO_BADGE[tpl.priority]}`}>{tpl.priority}</span>
                </div>
                <div className="btn-row">
                  <button className="btn sm brand" onClick={() => useTemplate(tpl)}><Icon name="plus" /> Use</button>
                  <button className="btn icon sm danger" onClick={() => setTemplates((s) => s.filter((x) => x.id !== tpl.id))}><Icon name="trash" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Tasks */}
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="panel-h"><div><div className="panel-title"><Icon name="folder" /> Project Tasks</div><div className="panel-sub">All tasks from your projects</div></div></div>
        <div className="search-bar" style={{ marginBottom: 10 }}><Icon name="search" /><input placeholder="Search project tasks…" value={pq} onChange={(e) => setPq(e.target.value)} /></div>
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <select className="inp" style={{ width: "auto" }} value={pStatus} onChange={(e) => setPStatus(e.target.value as any)}><option value="all">All Status</option><option value="todo">Todo</option><option value="in_progress">In progress</option><option value="done">Done</option></select>
          <select className="inp" style={{ width: "auto" }} value={pPrio} onChange={(e) => setPPrio(e.target.value as any)}><option value="all">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
        </div>
        {projFiltered.length === 0 ? (
          <div className="empty" style={{ padding: "44px 16px" }}><Icon name="folder" /><div className="sub">No project tasks found</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projFiltered.map((t) => (
              <div className="ct-row" key={t.id}>
                <div style={{ minWidth: 0 }}><div className="u-name" style={{ fontSize: 13 }}>{t.title}</div><div className="sub">{t.project}</div></div>
                <span className="btn-row"><span className={`badge ${PRIO_BADGE[t.priority]}`}>{t.priority}</span><span className={`badge ${ST_BADGE[t.status]}`}>{ST_LABEL[t.status]}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Tasks */}
      <div className="card pad">
        <div className="panel-h"><div><div className="panel-title"><Icon name="clip" /> Your Tasks ({tasks.length})</div><div className="panel-sub">Create, view, and manage tasks</div></div></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div className="search-bar"><Icon name="search" /><input placeholder="Search tasks…" value={yq} onChange={(e) => setYq(e.target.value)} /></div>
          <select className="inp" style={{ width: "auto" }} value={tagF} onChange={(e) => setTagF(e.target.value)}>
            <option value="all">Tag</option>{allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="inp" style={{ width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}><option value="created">Created</option><option value="title">Title</option><option value="priority">Priority</option></select>
          <button className="btn icon" onClick={() => setAsc((v) => !v)} title={asc ? "Ascending" : "Descending"}><Icon name={asc ? "chevu" : "chevd"} /></button>
        </div>
        {yourFiltered.length === 0 ? (
          <div className="empty" style={{ padding: "44px 16px" }}><div className="sub">No tasks found. Create your first task or use a template to get started!</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {yourFiltered.map((t) => (
              <div className="ct-row" key={t.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="u-name" style={{ fontSize: 13.5 }}>{t.title}</div>
                  <div className="sub">{t.description || "No description"} · {fmt(t.created)}</div>
                  {t.tags.length > 0 && <div style={{ display: "flex", gap: 5, marginTop: 4 }}>{t.tags.map((tg) => <span className="badge b-todo" key={tg}># {tg}</span>)}</div>}
                </div>
                <span className="btn-row">
                  <span className="badge b-type">{t.type}</span>
                  <span className={`badge ${PRIO_BADGE[t.priority]}`}>{t.priority}</span>
                  <span className={`badge ${ST_BADGE[t.status]}`}>{ST_LABEL[t.status]}</span>
                  <button className="btn icon sm danger" onClick={() => setTasks((s) => s.filter((x) => x.id !== t.id))}><Icon name="trash" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawer === "task" && <TaskDrawer onClose={() => setDrawer(null)} onSave={(t) => { addTask(t); setDrawer(null); flash("Task created."); }} />}
      {drawer === "template" && <TemplateDrawer onClose={() => setDrawer(null)} onSave={(tpl) => { setTemplates((s) => [{ ...tpl, id: "tpl_" + Math.floor(Math.random() * 99999) }, ...s]); setDrawer(null); flash("Template created."); }} />}
      {toast && <div className="ct-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .ct-tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
        .ct-tpl{border:1px solid var(--line2);border-radius:12px;padding:13px}
        .ct-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line2);border-radius:11px;padding:11px 13px}
        .ct-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .ct-toast svg{width:15px;height:15px;color:#7ee2a8}
        .dw-back{position:fixed;inset:0;background:rgba(15,16,20,.5);z-index:100}
        .dw{position:fixed;top:0;right:0;height:100vh;width:min(470px,96vw);background:#fff;z-index:101;box-shadow:-24px 0 70px -34px rgba(0,0,0,.5);display:flex;flex-direction:column}
        .dw-h{padding:18px 20px;border-bottom:1px solid var(--line2);position:relative}
        .dw-h h3{margin:0;font-size:17px;font-weight:650;display:flex;align-items:center;gap:8px}
        .dw-h h3 svg{width:18px;height:18px;color:var(--brand)}
        .dw-h p{margin:5px 0 0;color:var(--muted);font-size:12.5px}
        .dw-x{position:absolute;top:16px;right:16px;background:none;border:0;color:var(--muted2);cursor:pointer;padding:4px;display:flex}
        .dw-x svg{width:18px;height:18px}
        .dw-body{flex:1;overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:14px}
        .dw-foot{border-top:1px solid var(--line2);padding:14px 20px;display:flex;flex-direction:column;gap:9px}
        .dw-foot .btn{justify-content:center;width:100%;padding:11px}
        .dw-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
        .dw-l .req{color:#e5484d}
        .dw textarea.inp{min-height:78px;resize:vertical;font-family:inherit}
      `}</style>
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <div><label className="dw-l">{label} {req && <span className="req">*</span>}</label>{children}</div>;
}

function TaskDrawer({ onClose, onSave }: { onClose: () => void; onSave: (t: Omit<Task, "id" | "created">) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TStatus>("todo");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => { if (!title.trim()) return; onSave({ title: title.trim(), description: description.trim(), type, priority, status, tags: tags.split(",").map((s) => s.trim()).filter(Boolean), notes: notes.trim() }); };
  return (
    <>
      <div className="dw-back" onClick={onClose} />
      <div className="dw">
        <div className="dw-h"><button className="dw-x" onClick={onClose}><Icon name="x" /></button><h3><Icon name="plus" /> Create Task</h3><p>Create a task and assign it to your team.</p></div>
        <div className="dw-body">
          <Field label="Task Title" req><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare weekly report" autoFocus /></Field>
          <Field label="Description"><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done…" /></Field>
          <Field label="Task Type" req><select className="inp" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Priority"><select className="inp" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
          <Field label="Status"><select className="inp" value={status} onChange={(e) => setStatus(e.target.value as TStatus)}><option value="todo">Todo</option><option value="in_progress">In progress</option><option value="done">Done</option></select></Field>
          <Field label="Tags"><input className="inp" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma-separated, e.g. urgent, client" /></Field>
          <Field label="Notes"><textarea className="inp" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or instructions…" /></Field>
        </div>
        <div className="dw-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Create Task</button></div>
      </div>
    </>
  );
}

function TemplateDrawer({ onClose, onSave }: { onClose: () => void; onSave: (t: Omit<Tpl, "id">) => void }) {
  const [name, setName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [notes, setNotes] = useState("");
  const submit = () => { if (!name.trim() || !taskTitle.trim()) return; onSave({ name: name.trim(), taskTitle: taskTitle.trim(), description: description.trim(), type, priority, notes: notes.trim() }); };
  return (
    <>
      <div className="dw-back" onClick={onClose} />
      <div className="dw">
        <div className="dw-h"><button className="dw-x" onClick={onClose}><Icon name="x" /></button><h3><Icon name="plus" /> Create Task Template</h3><p>Create a reusable task template that can be used to quickly create new tasks.</p></div>
        <div className="dw-body">
          <Field label="Template Name" req><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Weekly Report Template" autoFocus /></Field>
          <Field label="Task Title" req><input className="inp" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Default title for tasks created from this template" /></Field>
          <Field label="Description"><textarea className="inp" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed explanation of the template requirements…" /></Field>
          <Field label="Task Type" req><select className="inp" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Priority"><select className="inp" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></Field>
          <Field label="Notes"><textarea className="inp" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes or instructions…" /></Field>
        </div>
        <div className="dw-foot"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Create Template</button></div>
      </div>
    </>
  );
}
