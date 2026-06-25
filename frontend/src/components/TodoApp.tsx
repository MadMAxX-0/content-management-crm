"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { api, TodoList, TodoListFull, TodoTask, TodoStatus, TodoPriority } from "@/lib/api";

const COLORS = ["#2f6df6", "#ef4444", "#22c55e", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1"];
const PRIO: Record<TodoPriority, { label: string; color: string }> = {
  none: { label: "No priority", color: "#9aa0a8" },
  low: { label: "Low", color: "#3b82f6" },
  medium: { label: "Medium", color: "#f59e0b" },
  high: { label: "High", color: "#f97316" },
  urgent: { label: "Urgent", color: "#ef4444" },
};
const PRIO_ORDER: TodoPriority[] = ["urgent", "high", "medium", "low", "none"];
const COLS: { key: TodoStatus; label: string }[] = [
  { key: "todo", label: "To Do" }, { key: "in_progress", label: "In Progress" }, { key: "done", label: "Done" },
];
const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);
const fmtDue = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }) : "";

export default function TodoApp() {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [list, setList] = useState<TodoListFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [cTitle, setCTitle] = useState(""); const [cDesc, setCDesc] = useState(""); const [cColor, setCColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState<"list" | "board">("list");
  const [settings, setSettings] = useState(false);
  const [q, setQ] = useState("");
  const [prioFilter, setPrioFilter] = useState<Set<TodoPriority>>(new Set());
  const [prioMenu, setPrioMenu] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [taskText, setTaskText] = useState("");
  const [drag, setDrag] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setLists(await api.todoLists()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadLists(); }, [loadLists]);

  const openList = async (id: string) => {
    setErr(null); setQ(""); setView("list"); setOpenId(null); setPrioFilter(new Set());
    try { setList(await api.todoList(id)); } catch (e: any) { setErr(e.message); }
  };
  const reload = () => { if (list) openListKeep(list.id); };
  const openListKeep = async (id: string) => { try { setList(await api.todoList(id)); } catch { /* ignore */ } };

  const createList = async () => {
    if (!cTitle.trim()) return;
    setBusy(true);
    try {
      const l = await api.todoCreateList(cTitle.trim(), cDesc.trim() || undefined, cColor);
      setShowCreate(false); setCTitle(""); setCDesc(""); setCColor(COLORS[0]);
      await loadLists(); openList(l.id);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const deleteList = async (id: string) => {
    if (!confirm("Delete this list and its tasks?")) return;
    try { await api.todoDeleteList(id); setList(null); await loadLists(); } catch (e: any) { setErr(e.message); }
  };

  const addTask = async (status: TodoStatus = "todo", title?: string) => {
    const text = (title ?? taskText).trim();
    if (!list || !text) return;
    try {
      const t = await api.todoCreateTask(list.id, text);
      const created = status === "todo" ? t : { ...t, status };
      if (status !== "todo") api.todoUpdateTask(t.id, { status });
      setList({ ...list, tasks: [...list.tasks, created] }); setTaskText("");
    } catch (e: any) { setErr(e.message); }
  };

  const patchTask = async (id: string, fields: Partial<TodoTask>) => {
    if (!list) return;
    setList({ ...list, tasks: list.tasks.map((t) => t.id === id ? { ...t, ...fields } : t) });
    try { await api.todoUpdateTask(id, fields as any); } catch (e: any) { setErr(e.message); reload(); }
  };
  const deleteTask = async (id: string) => {
    if (!list) return;
    setOpenId(null);
    setList({ ...list, tasks: list.tasks.filter((t) => t.id !== id) });
    try { await api.todoDeleteTask(id); } catch (e: any) { setErr(e.message); reload(); }
  };
  const toggleDone = (t: TodoTask) => patchTask(t.id, { status: t.status === "done" ? "todo" : "done" });

  const matches = (t: TodoTask) =>
    t.title.toLowerCase().includes(q.toLowerCase()) && (prioFilter.size === 0 || prioFilter.has(t.priority));
  const togglePrio = (p: TodoPriority) =>
    setPrioFilter((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  // ───── Task detail ─────
  const openTask = list?.tasks.find((t) => t.id === openId);
  if (list && openTask) {
    return (
      <div className="td td-detail">
        <div className="tdd-head">
          <button className={`td-check lg ${openTask.status === "done" ? "on" : ""}`} onClick={() => toggleDone(openTask)}>
            {openTask.status === "done" && <Icon name="check" />}
          </button>
          <input className="tdd-title" value={openTask.title}
            onChange={(e) => setList({ ...list, tasks: list.tasks.map((t) => t.id === openTask.id ? { ...t, title: e.target.value } : t) })}
            onBlur={(e) => patchTask(openTask.id, { title: e.target.value })} />
          <button className="icon-btn" onClick={() => setOpenId(null)} aria-label="Close"><Icon name="x" /></button>
        </div>

        <div className="tdd-grid">
          <div>
            <label className="lbl-f">Priority</label>
            <select className="inp" value={openTask.priority} onChange={(e) => patchTask(openTask.id, { priority: e.target.value as TodoPriority })}>
              {PRIO_ORDER.slice().reverse().map((p) => <option key={p} value={p}>{PRIO[p].label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl-f">Due Date</label>
            <input type="date" className="inp" value={openTask.due_date || ""} onChange={(e) => patchTask(openTask.id, { due_date: e.target.value || null })} />
          </div>
        </div>

        <label className="lbl-f" style={{ marginTop: 16 }}>Description</label>
        <textarea className="inp" rows={3} placeholder="Add a description…" defaultValue={openTask.description || ""}
          onBlur={(e) => patchTask(openTask.id, { description: e.target.value })} />

        <div className="tdd-soon">Labels, subtasks & comments coming soon.</div>

        <div className="tdd-foot">
          <button className="icon-btn danger" onClick={() => deleteTask(openTask.id)}><Icon name="trash" /> Delete</button>
        </div>
      </div>
    );
  }

  // ───── List / Board view ─────
  if (list) {
    const visible = list.tasks.filter(matches);
    const doneN = list.tasks.filter((t) => t.status === "done").length;
    return (
      <div className="td" onClick={() => { setSettings(false); setPrioMenu(false); }}>
        {err && <div className="note" style={{ margin: "0 0 12px" }}>{err}</div>}
        <div className="td-bar">
          <button className="btn sm" onClick={() => { setList(null); loadLists(); }}>
            <Icon name="chevr" style={{ transform: "rotate(180deg)" }} /> Lists
          </button>
          <span className="td-dot" style={{ background: list.color }} />
          <b className="td-name">{list.title}</b>
          <div className="td-tools" style={{ marginLeft: "auto" }}>
            <div className="td-toggle">
              <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} title="List view"><Icon name="listcheck" /></button>
              <button className={view === "board" ? "on" : ""} onClick={() => setView("board")} title="Board view"><Icon name="kanban" /></button>
            </div>
            <div className="td-menuwrap" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" onClick={() => setSettings((s) => !s)}><Icon name="dots" /></button>
              {settings && (
                <div className="td-menu">
                  <div className="tm-lbl">Settings</div>
                  <button onClick={() => { setView("list"); setSettings(false); }}><Icon name="listcheck" /> List View {view === "list" && <Icon name="check" />}</button>
                  <button onClick={() => { setView("board"); setSettings(false); }}><Icon name="kanban" /> Board View {view === "board" && <Icon name="check" />}</button>
                  <button className="danger" onClick={() => deleteList(list.id)}><Icon name="trash" /> Delete List</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="td-filters" onClick={(e) => e.stopPropagation()}>
          <div className="search-inp" style={{ flex: 1, minWidth: 160 }}><Icon name="search" /><input placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="td-menuwrap">
            <button className={`btn sm ${prioFilter.size ? "active-chip" : ""}`} onClick={() => setPrioMenu((s) => !s)}>
              <Icon name="filter" /> Priority {prioFilter.size > 0 && <span className="chip-n">{prioFilter.size}</span>}
            </button>
            {prioMenu && (
              <div className="td-menu">
                <div className="tm-lbl">Filter by priority</div>
                {PRIO_ORDER.map((p) => (
                  <button key={p} onClick={() => togglePrio(p)}>
                    <span className="pr-dot" style={{ background: PRIO[p].color }} /> {PRIO[p].label}
                    {prioFilter.has(p) && <Icon name="check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {prioFilter.size > 0 && <button className="btn sm" onClick={() => setPrioFilter(new Set())}><Icon name="x" /> Clear ({prioFilter.size})</button>}
        </div>

        <div className="td-prog">
          <span className="bar-track" style={{ flex: 1 }}><span className="bar-fill ok" style={{ width: `${pct(doneN, list.tasks.length)}%` }} /></span>
          <span className="sub">{doneN}/{list.tasks.length} done</span>
        </div>

        {view === "list" ? (
          <div className="td-tasks">
            {visible.map((t) => (
              <div className={`td-task ${t.status === "done" ? "done" : ""}`} key={t.id} onClick={() => setOpenId(t.id)}>
                <span className="td-grip"><Icon name="grip" /></span>
                <button className={`td-check ${t.status === "done" ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleDone(t); }}>
                  {t.status === "done" && <Icon name="check" />}
                </button>
                {t.priority !== "none" && <span className="pr-flag" style={{ color: PRIO[t.priority].color }}><Icon name="flag" /></span>}
                <span className="td-title">{t.title}</span>
                {t.due_date && <span className="due-chip"><Icon name="cal" /> {fmtDue(t.due_date)}</span>}
              </div>
            ))}
            {list.tasks.length === 0 && <div className="empty">No tasks yet — add your first one.</div>}
            <div className="td-addrow">
              <Icon name="plus" />
              <input className="td-addinput" placeholder="Add task…" value={taskText}
                onChange={(e) => setTaskText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTask("todo"); }} />
              {taskText.trim() && <button className="btn dark sm" onClick={() => addTask("todo")}>Add</button>}
            </div>
          </div>
        ) : (
          <div className="kb-board">
            {COLS.map((col) => {
              const cards = visible.filter((t) => t.status === col.key);
              return (
                <div className="kb-col" key={col.key} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (drag) { patchTask(drag, { status: col.key }); setDrag(null); } }}>
                  <div className="kb-col-head"><b>{col.label}</b><span className="kb-count">{cards.length}</span></div>
                  <div className="kb-cards">
                    {cards.map((t) => (
                      <div className="kb-card" key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)} onClick={() => setOpenId(t.id)}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {t.priority !== "none" && <span className="pr-flag" style={{ color: PRIO[t.priority].color }}><Icon name="flag" /></span>}
                            {t.title}
                          </span>
                          {t.due_date && <span className="due-chip"><Icon name="cal" /> {fmtDue(t.due_date)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="kb-addbtn" onClick={() => addTask(col.key, prompt("Task title:") || undefined)}><Icon name="plus" /> Add task</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ───── Lists grid ─────
  return (
    <div className="td">
      <div className="kb-top">
        <div>
          <h2 style={{ margin: 0 }}>My Todo Lists</h2>
          <p className="sub" style={{ margin: "4px 0 0" }}>{lists.length} list{lists.length === 1 ? "" : "s"}</p>
        </div>
        <button className="btn dark" onClick={() => setShowCreate(true)}><Icon name="plus" /> New List</button>
      </div>

      {err && <div className="note">{err}</div>}

      {loading ? (
        <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
      ) : lists.length === 0 ? (
        <div className="td-empty">
          <span className="td-empty-ic"><Icon name="listcheck" /></span>
          <h3>No todo lists yet</h3>
          <p className="sub">Create your first todo list to start organizing your tasks.</p>
          <button className="btn dark" onClick={() => setShowCreate(true)}><Icon name="plus" /> Create List</button>
        </div>
      ) : (
        <div className="kb-grid">
          {lists.map((l) => (
            <button className="td-lcard" key={l.id} onClick={() => openList(l.id)}>
              <div className="td-lhead">
                <span className="td-dot" style={{ background: l.color }} />
                <b>{l.title}</b>
                <span className="td-more" title="Delete" onClick={(e) => { e.stopPropagation(); deleteList(l.id); }}><Icon name="dots" /></span>
              </div>
              <div className="sub" style={{ marginTop: 14 }}>{l.done || 0}/{l.total || 0} tasks</div>
              <span className="bar-track" style={{ marginTop: 6, display: "block" }}><span className="bar-fill ok" style={{ width: `${pct(l.done || 0, l.total || 0)}%` }} /></span>
            </button>
          ))}
          <button className="kb-bcard new" onClick={() => setShowCreate(true)}>
            <span className="kb-plus"><Icon name="plus" /></span><b>New List</b>
          </button>
        </div>
      )}

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3><Icon name="listcheck" /> New Todo List</h3>
            <p className="sub" style={{ margin: "2px 0 0" }}>Create a new list to organize your tasks</p>
            <div className="form-grid">
              <div className="full"><label className="lbl-f">Title</label>
                <input autoFocus className="inp" placeholder="My Todo List" value={cTitle} onChange={(e) => setCTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createList(); }} /></div>
              <div className="full"><label className="lbl-f">Description (optional)</label>
                <textarea className="inp" rows={2} placeholder="What is this list for?" value={cDesc} onChange={(e) => setCDesc(e.target.value)} /></div>
              <div className="full"><label className="lbl-f">Color</label>
                <div className="td-colors">
                  {COLORS.map((c) => <button key={c} className={`td-swatch ${cColor === c ? "on" : ""}`} style={{ background: c }} onClick={() => setCColor(c)} aria-label={c} />)}
                </div>
              </div>
            </div>
            <div className="actions">
              <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn dark" onClick={createList} disabled={busy || !cTitle.trim()}>
                {busy ? <Icon name="refresh" className="spin" /> : <Icon name="plus" />} Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
