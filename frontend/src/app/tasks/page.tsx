"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import CreateTaskModal from "@/components/CreateTaskModal";
import AssignTemplateModal from "@/components/AssignTemplateModal";
import ReviewModal from "@/components/ReviewModal";
import { api, ModelRow, TaskRow } from "@/lib/api";
import { statusMeta } from "@/lib/slots";

const TYPE_LABELS: Record<string, string> = {
  detailed: "Detailed", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long", images_videos: "Images & Videos", swipe: "Swipe",
};
const TYPE_ORDER = ["detailed", "video", "ppv_sequence", "ppv_long", "images_videos", "swipe"];

// Per-status display for the assignee count pills in the list.
const COUNT_META: Record<string, { label: string; cls: string }> = {
  submitted: { label: "to review", cls: "b-amber" },
  changes_requested: { label: "changes", cls: "b-amber" },
  approved: { label: "approved", cls: "b-green" },
  in_progress: { label: "in progress", cls: "b-soft" },
  todo: { label: "not started", cls: "b-todo" },
};
const STATUS_ORDER = ["submitted", "changes_requested", "in_progress", "todo", "approved"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [templates, setTemplates] = useState<TaskRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<TaskRow | null>(null);
  const [assign, setAssign] = useState<TaskRow | null>(null);
  const [review, setReview] = useState<{ task: TaskRow; modelId?: string } | null>(null);
  const [q, setQ] = useState("");
  const [tq, setTq] = useState("");
  const [tplType, setTplType] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, tpl, m] = await Promise.all([api.listTasks(false), api.listTasks(true), api.listModels()]);
      setTasks(t); setTemplates(tpl); setModels(m);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try { await api.deleteTask(id); await load(); } catch (e: any) { setErr(e.message); }
  };

  const list = tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()) || (t.description || "").toLowerCase().includes(q.toLowerCase()));
  const tpls = templates.filter((t) =>
    t.title.toLowerCase().includes(tq.toLowerCase()) &&
    (tplType === "all" || (t.type || "") === tplType));

  // Group templates by task type, ordered, for the organized sidebar.
  const tplGroups = useMemo(() => {
    const by: Record<string, TaskRow[]> = {};
    tpls.forEach((t) => { const k = t.type || "other"; (by[k] ||= []).push(t); });
    const keys = Object.keys(by).sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return keys.map((k) => ({ key: k, items: by[k] }));
  }, [tpls]);

  // Counts per type across ALL templates (for the filter chips), regardless of current filter.
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    templates.forEach((t) => { const k = t.type || "other"; c[k] = (c[k] || 0) + 1; });
    return c;
  }, [templates]);

  const toggleCollapse = (k: string) => setCollapsed((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Model Task Center</h1>
          <p>Manage, create, and assign tasks to your models efficiently. Search and organize task templates.</p>
        </div>
        <div className="btn-row">
          <button className="btn brand" onClick={() => setShow(true)}><Icon name="plus" /> Create New Task / Template</button>
        </div>
      </div>

      {err && <div className="note">{err}</div>}

      <div className="tasks-layout">
        {/* MAIN: tasks list */}
        <div>
          <div className="panel-title" style={{ marginBottom: 14 }}><Icon name="clip" /> Tasks list ({list.length})</div>
          <div className="card pad">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <div className="search-bar"><Icon name="search" /><input placeholder="Search tasks by title, description, or notes…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            </div>

            {loading ? (
              <div className="empty"><Icon name="refresh" className="spin" /> Loading…</div>
            ) : list.length === 0 ? (
              <div className="empty"><Icon name="clip" /><div style={{ fontWeight: 600, color: "#3f3f46" }}>No tasks yet</div><div className="sub">Create one to get started.</div></div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Task Title</th><th>Assigned To</th><th>Type</th><th>Status</th><th>Due Date</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {list.map((t) => {
                    const ass = t.assignees || [];
                    const subs = ass.map((a) => a.status || "todo");
                    const needsReview = subs.includes("submitted");
                    const allApproved = subs.length > 0 && subs.every((s) => s === "approved");
                    const isOpen = expanded.has(t.id);
                    // Build ordered, non-zero status counts for the Status column.
                    const counts = STATUS_ORDER
                      .map((s) => ({ s, n: subs.filter((x) => x === s).length }))
                      .filter((c) => c.n > 0);
                    return (
                    <Fragment key={t.id}>
                    <tr className={`${needsReview ? "row-attn" : ""} ${isOpen ? "row-open" : ""}`}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {ass.length > 0 ? (
                            <button className={`ta-caret ${isOpen ? "open" : ""}`} onClick={() => toggleExpand(t.id)} title="Show per-model status"><Icon name="chevr" /></button>
                          ) : <span className="ta-caret ghost" />}
                          <div><div className="u-name">{t.title}</div></div>
                        </div>
                      </td>
                      <td>
                        {ass.length ? (
                          <button className="ta-assigned" onClick={() => toggleExpand(t.id)} title="Show per-model status">
                            <div className="avstack">{ass.slice(0, 3).map((a) => <span className="avmini" key={a.id}>{a.name.charAt(0).toUpperCase()}</span>)}</div>
                            <span className="sub">{ass.length === 1 ? ass[0].name : `${ass.length} models`}</span>
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="avmini na">N/A</span><span className="sub">No models assigned</span>
                          </div>
                        )}
                      </td>
                      <td><span className="badge b-type">{TYPE_LABELS[t.type || ""] || t.type || "—"}</span></td>
                      <td><span className="st-counts">
                        {ass.length === 0 ? <span className="badge b-todo">{t.status}</span>
                          : allApproved ? <span className="badge b-green"><Icon name="check" /> All approved</span>
                          : counts.map((c) => (
                            <span key={c.s} className={`badge ${COUNT_META[c.s]?.cls || "b-todo"}`}>
                              {c.s === "submitted" && "● "}{c.n} {COUNT_META[c.s]?.label || c.s}
                            </span>
                          ))}
                        <span className={`badge b-prio-${t.priority}`}>{t.priority}</span>
                      </span></td>
                      <td className="sub">{t.due_date || "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <button className={`btn icon sm ${needsReview ? "attn" : ""}`} title="Review submissions" disabled={!ass.length} onClick={() => setReview({ task: t })}><Icon name="eye" /></button>
                          <button className="btn icon sm danger" onClick={() => del(t.id, t.title)}><Icon name="trash" /></button>
                        </span>
                      </td>
                    </tr>
                    {isOpen && ass.length > 0 && (
                      <tr className="ta-subrow">
                        <td colSpan={6}>
                          <div className="ta-people">
                            {ass.map((a) => {
                              const sm = statusMeta(a.status);
                              return (
                                <div className="ta-prow" key={a.id}>
                                  <span className="avmini">{a.name.charAt(0).toUpperCase()}</span>
                                  <span className="ta-pname">{a.name}</span>
                                  <span className={`badge ${sm.cls}`}>{a.status === "submitted" && "● "}{sm.label}</span>
                                  <button className={`btn sm ${a.status === "submitted" ? "brand" : ""}`} onClick={() => setReview({ task: t, modelId: a.id })}>
                                    <Icon name="eye" /> Review
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SIDEBAR: templates */}
        <aside>
          <div className="panel-title" style={{ marginBottom: 14 }}><Icon name="gear" /> Task Templates ({tpls.length})</div>
          <div className="card pad">
            <div className="search-bar"><Icon name="search" /><input placeholder="Search templates by name, title, type, tags…" value={tq} onChange={(e) => setTq(e.target.value)} /></div>

            {templates.length > 0 && (
              <div className="tpl-typechips">
                <button className={`tchip ${tplType === "all" ? "on" : ""}`} onClick={() => setTplType("all")}>All <span className="tchip-n">{templates.length}</span></button>
                {TYPE_ORDER.filter((k) => typeCounts[k]).map((k) => (
                  <button key={k} className={`tchip ${tplType === k ? "on" : ""}`} onClick={() => setTplType(k)}>
                    {TYPE_LABELS[k] || k} <span className="tchip-n">{typeCounts[k]}</span>
                  </button>
                ))}
              </div>
            )}

            {tpls.length === 0 ? (
              <div className="empty" style={{ padding: "30px 16px" }}><Icon name="gear" /><div className="sub">No templates yet. Tick “Save as Reusable Template” when creating.</div></div>
            ) : (
              tplGroups.map((g) => {
                const isCol = collapsed.has(g.key);
                return (
                  <div className="tpl-group" key={g.key}>
                    <button className="tpl-ghead" onClick={() => toggleCollapse(g.key)}>
                      <span className={`ta-caret ${isCol ? "" : "open"}`}><Icon name="chevr" /></span>
                      <span className="tpl-gname">{TYPE_LABELS[g.key] || g.key}</span>
                      <span className="tpl-gcount">{g.items.length}</span>
                    </button>
                    {!isCol && g.items.map((t) => (
                      <div className="tpl-card" key={t.id}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="tnm">{t.title}</div>
                          {t.tags && t.tags.length > 0 && (
                            <div className="tpl-tags">{t.tags.slice(0, 4).map((tag) => <span className="ttag" key={tag}>{tag}</span>)}</div>
                          )}
                        </div>
                        <span className={`badge b-prio-${t.priority}`}>{t.priority}</span>
                        <div className="tpl-actions">
                          <button className="btn icon sm" title="Edit template" onClick={() => setEdit(t)}><Icon name="edit" /></button>
                          <button className="btn icon sm assign" title="Assign to models" onClick={() => setAssign(t)}><Icon name="send" /></button>
                          <button className="btn icon sm danger" title="Delete template" onClick={() => del(t.id, t.title)}><Icon name="trash" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {show && <CreateTaskModal models={models} onClose={() => setShow(false)} onCreated={() => { setShow(false); load(); }} />}
      {edit && <CreateTaskModal models={models} editing={edit} onClose={() => setEdit(null)} onCreated={() => { setEdit(null); load(); }} />}
      {assign && <AssignTemplateModal template={assign} models={models} onClose={() => setAssign(null)} onAssigned={() => { setAssign(null); load(); }} />}
      {review && <ReviewModal task={review.task} initialModelId={review.modelId} onClose={() => setReview(null)} onReviewed={() => { setReview(null); load(); }} />}
    </div>
  );
}
