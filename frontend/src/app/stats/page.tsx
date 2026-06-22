"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, Stats, fmtDate } from "@/lib/api";
import { TYPE_LABEL, statusMeta } from "@/lib/slots";

const STATUS_ORDER = ["todo", "in_progress", "submitted", "changes_requested", "approved"];
const STATUS_COLOR: Record<string, string> = {
  todo: "#c9b6c0", in_progress: "#e7a3c4", submitted: "#7aa2ff",
  changes_requested: "#f0a43a", approved: "#37b46e",
};

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export default function StatsPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setS(await api.stats()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const kpis = s ? [
    { icon: "star", label: "Models", value: s.models_total, sub: `${s.models_by_status["Approved"] || 0} approved` },
    { icon: "clip", label: "Active Tasks", value: s.tasks_total, sub: `${s.templates_total} templates` },
    { icon: "send", label: "Pending Review", value: s.pending_review, sub: "awaiting your sign-off" },
    { icon: "check", label: "Completion", value: `${s.completion_pct}%`, sub: `${s.work_by_status["approved"] || 0}/${s.assignees_total} approved` },
  ] : [];

  const workTotal = s ? Object.values(s.work_by_status).reduce((a, b) => a + b, 0) : 0;
  const typeEntries = s ? Object.entries(s.tasks_by_type).sort((a, b) => b[1] - a[1]) : [];
  const typeMax = typeEntries.reduce((m, [, v]) => Math.max(m, v), 0);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="pie" /> Statistics</h1>
          <p>Overview of models, content tasks, and review progress.</p>
        </div>
        <button className="btn" onClick={load}><Icon name="refresh" className={loading ? "spin" : ""} /> Refresh</button>
      </div>

      {err && <div className="note">{err}</div>}

      {loading && !s ? (
        <div className="card pad"><div className="empty"><Icon name="refresh" className="spin" /> Loading…</div></div>
      ) : s && (
        <>
          <div className="stat-grid">
            {kpis.map((k) => (
              <div className="stat-card" key={k.label}>
                <span className="sc-ic"><Icon name={k.icon} /></span>
                <div className="sc-val">{k.value}</div>
                <div className="sc-lbl">{k.label}</div>
                <div className="sc-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="stat-row">
            <div className="card pad">
              <div className="panel-title">Content pipeline</div>
              <div className="panel-sub">Every model-assigned deliverable by review status.</div>
              {workTotal === 0 ? <div className="empty">No assigned work yet.</div> : (
                <>
                  <div className="stack-bar">
                    {STATUS_ORDER.filter((k) => (s.work_by_status[k] || 0) > 0).map((k) => (
                      <span key={k} title={`${statusMeta(k).label}: ${s.work_by_status[k]}`}
                        style={{ width: `${pct(s.work_by_status[k] || 0, workTotal)}%`, background: STATUS_COLOR[k] }} />
                    ))}
                  </div>
                  <div className="legend">
                    {STATUS_ORDER.filter((k) => (s.work_by_status[k] || 0) > 0).map((k) => (
                      <span className="lg-item" key={k}>
                        <i style={{ background: STATUS_COLOR[k] }} />
                        {statusMeta(k).label} <b>{s.work_by_status[k]}</b>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card pad">
              <div className="panel-title">Tasks by type</div>
              <div className="panel-sub">Distribution across content formats.</div>
              {typeEntries.length === 0 ? <div className="empty">No tasks yet.</div> : (
                <div className="bars">
                  {typeEntries.map(([type, n]) => (
                    <div className="bar-row" key={type}>
                      <span className="bar-lbl">{TYPE_LABEL[type] || type}</span>
                      <span className="bar-track"><span className="bar-fill" style={{ width: `${pct(n, typeMax)}%` }} /></span>
                      <span className="bar-n">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card pad">
            <div className="panel-title">Per-model progress</div>
            <div className="panel-sub">Assigned work and how much is approved.</div>
            {s.per_model.length === 0 ? <div className="empty">No models yet.</div> : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Model</th><th>Assigned</th><th>Submitted</th><th>Changes</th><th>Approved</th><th style={{ width: 160 }}>Progress</th></tr></thead>
                  <tbody>
                    {s.per_model.map((m) => (
                      <tr key={m.id}>
                        <td><b>{m.name}</b></td>
                        <td>{m.total}</td>
                        <td>{m.submitted}</td>
                        <td>{m.changes}</td>
                        <td>{m.approved}</td>
                        <td>
                          <span className="bar-track sm"><span className="bar-fill ok" style={{ width: `${pct(m.approved, m.total)}%` }} /></span>
                          <span className="sub" style={{ marginLeft: 8 }}>{pct(m.approved, m.total)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="panel-title">Recent activity</div>
            <div className="panel-sub">Latest submissions and reviews.</div>
            {s.recent.length === 0 ? <div className="empty">Nothing yet.</div> : (
              <div className="activity">
                {s.recent.map((r, i) => {
                  const sm = statusMeta(r.status);
                  const when = r.reviewed_at || r.submitted_at;
                  return (
                    <div className="act-row" key={i}>
                      <span className={`badge ${sm.cls}`}>{sm.label}</span>
                      <span className="act-main"><b>{r.model}</b> · {r.title}</span>
                      <span className="sub">{when ? fmtDate(when) : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
