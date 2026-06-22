"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import CreateTaskModal from "@/components/CreateTaskModal";
import AssignTemplateModal from "@/components/AssignTemplateModal";
import ReviewModal from "@/components/ReviewModal";
import { api, ModelRow, TaskRow } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  detailed: "Detailed", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long", images_videos: "Images & Videos", swipe: "Swipe",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [templates, setTemplates] = useState<TaskRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [assign, setAssign] = useState<TaskRow | null>(null);
  const [review, setReview] = useState<TaskRow | null>(null);
  const [q, setQ] = useState("");
  const [tq, setTq] = useState("");
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
  const tpls = templates.filter((t) => t.title.toLowerCase().includes(tq.toLowerCase()));

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Model Task Center</h1>
          <p>Manage, create, and assign tasks to your models efficiently. Search and organize task templates.</p>
          <div className="headhints">
            <span>→ Drag tasks to templates to convert them</span>
            <span>← Drag templates to tasks to assign them</span>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn"><Icon name="info" /> Tour this page</button>
          <button className="btn brand" onClick={() => setShow(true)}><Icon name="plus" /> Create New Task / Template</button>
          <button className="btn"><Icon name="pie" /> View Statistics</button>
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
              <button className="pill-btn active"><Icon name="clip" /> All Tasks</button>
              <button className="pill-btn"><Icon name="check" /> Active</button>
              <button className="pill-btn"><Icon name="folder" /> Archive</button>
              <button className="pill-btn"><Icon name="sort" /> Sort</button>
              <button className="pill-btn"><Icon name="filter" /> Filters</button>
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
                    const subs = (t.assignees || []).map((a) => a.status);
                    const needsReview = subs.includes("submitted");
                    const allApproved = subs.length > 0 && subs.every((s) => s === "approved");
                    return (
                    <tr key={t.id} className={needsReview ? "row-attn" : ""}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="grip"><Icon name="grip" /></span>
                          <div><div className="u-name">{t.title}</div></div>
                        </div>
                      </td>
                      <td>
                        {t.assignees?.length ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="avstack">{t.assignees.slice(0, 3).map((a) => <span className="avmini" key={a.id}>{a.name.charAt(0).toUpperCase()}</span>)}</div>
                            {t.assignees.length === 1 && <span>{t.assignees[0].name}</span>}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="avmini na">N/A</span><span className="sub">No models assigned</span>
                          </div>
                        )}
                      </td>
                      <td><span className="badge b-type">{TYPE_LABELS[t.type || ""] || t.type || "—"}</span></td>
                      <td><span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        {needsReview ? <span className="badge b-amber">● Needs review</span>
                          : allApproved ? <span className="badge b-green"><Icon name="check" /> Approved</span>
                          : <span className="badge b-todo">{t.status}</span>}
                        <span className={`badge b-prio-${t.priority}`}>{t.priority}</span>
                      </span></td>
                      <td className="sub">{t.due_date || "-"}</td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <button className={`btn icon sm ${needsReview ? "attn" : ""}`} title="Review submissions" disabled={!t.assignees?.length} onClick={() => setReview(t)}><Icon name="eye" /></button>
                          <button className="btn icon sm danger" onClick={() => del(t.id, t.title)}><Icon name="trash" /></button>
                        </span>
                      </td>
                    </tr>
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
            {tpls.length === 0 ? (
              <div className="empty" style={{ padding: "30px 16px" }}><Icon name="gear" /><div className="sub">No templates yet. Tick “Save as Reusable Template” when creating.</div></div>
            ) : (
              tpls.map((t) => (
                <div className="tpl-card" key={t.id}>
                  <span className="grip"><Icon name="grip" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tnm">{t.title}</div>
                    <div className="tsub">{TYPE_LABELS[t.type || ""] || t.type} Task</div>
                  </div>
                  <span className={`badge b-prio-${t.priority}`}>{t.priority}</span>
                  <div className="tpl-actions">
                    <button className="btn icon sm assign" title="Assign to models" onClick={() => setAssign(t)}><Icon name="send" /></button>
                    <button className="btn icon sm danger" title="Delete template" onClick={() => del(t.id, t.title)}><Icon name="trash" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {show && <CreateTaskModal models={models} onClose={() => setShow(false)} onCreated={() => { setShow(false); load(); }} />}
      {assign && <AssignTemplateModal template={assign} models={models} onClose={() => setAssign(null)} onAssigned={() => { setAssign(null); load(); }} />}
      {review && <ReviewModal task={review} onClose={() => setReview(null)} onReviewed={() => { setReview(null); load(); }} />}
    </div>
  );
}
