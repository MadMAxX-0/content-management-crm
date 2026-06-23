"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { LineChart, Donut, Radar } from "@/components/Charts";
import { api, Stats, fmtDate } from "@/lib/api";
import { TYPE_LABEL, statusMeta } from "@/lib/slots";

type Tab = "overview" | "models" | "tasks";

const STATUS_ORDER = ["todo", "in_progress", "submitted", "changes_requested", "approved"];
const STATUS_COLOR: Record<string, string> = {
  todo: "#c9b6c0", in_progress: "#e7a3c4", submitted: "#5b8def",
  changes_requested: "#f0a43a", approved: "#37b46e",
};
const PRIORITY_COLOR: Record<string, string> = { high: "#ef5b5b", medium: "#f0a43a", low: "#6bbf7e" };

function monthBuckets(n: number) {
  const now = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en", { month: "short" }) });
  }
  return out;
}
const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

export default function StatsPage() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [months, setMonths] = useState(6);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setS(await api.stats()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="pie" /> Model Statistics</h1>
          <p>Analytics and insights across models, content tasks, and reviews.</p>
        </div>
        <div className="btn-row">
          <select className="inp" value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ width: "auto" }}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button className="btn" onClick={load}><Icon name="refresh" className={loading ? "spin" : ""} /> Refresh</button>
        </div>
      </div>

      {err && <div className="note">{err}</div>}

      {loading && !s ? (
        <div className="card pad"><div className="empty"><Icon name="refresh" className="spin" /> Loading…</div></div>
      ) : s && (
        <>
          <TopKpis s={s} />
          <div className="seg tabs" style={{ margin: "18px 0" }}>
            <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
            <button className={tab === "models" ? "active" : ""} onClick={() => setTab("models")}>Model Analytics</button>
            <button className={tab === "tasks" ? "active" : ""} onClick={() => setTab("tasks")}>Task Analytics</button>
          </div>
          {tab === "overview" && <Overview s={s} months={months} />}
          {tab === "models" && <ModelAnalytics s={s} />}
          {tab === "tasks" && <TaskAnalytics s={s} months={months} />}
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: string; label: string; value: React.ReactNode; sub: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="kpi">
      <div className="kpi-top"><span>{label}</span><Icon name={icon} /></div>
      <div className="kpi-val">{value}</div>
      <div className={`kpi-sub ${tone || ""}`}><span className="dot" /> {sub}</div>
    </div>
  );
}

function TopKpis({ s }: { s: Stats }) {
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newThis = s.models_by_month[curKey] || 0;
  return (
    <div className="kpi-grid">
      <Kpi icon="users" label="Total Models" value={s.models_total} tone="ok"
        sub={newThis > 0 ? `+${newThis} this month` : "no new this month"} />
      <Kpi icon="clip" label="Active Tasks" value={s.tasks_total} tone={s.overdue > 0 ? "warn" : "ok"}
        sub={s.overdue > 0 ? `${s.overdue} overdue` : "all on time"} />
      <Kpi icon="check" label="Completion Rate" value={`${s.completion_pct}%`} tone={s.completion_pct >= 50 ? "ok" : "warn"}
        sub={s.completion_pct >= 50 ? "on track" : "needs attention"} />
      <Kpi icon="clock" label="Avg Response Time"
        value={s.avg_response_hours != null ? `${s.avg_response_hours}h` : "—"}
        tone={s.avg_response_hours != null && s.avg_response_hours <= 48 ? "ok" : undefined}
        sub={s.avg_response_hours != null ? (s.avg_response_hours <= 48 ? "fast responses" : "from assignment to submit") : "no submissions yet"} />
    </div>
  );
}

function MiniList({ title, sub, rows }: { title: string; sub: string; rows: { label: string; value: number; color?: string; pill?: boolean }[] }) {
  return (
    <div className="card pad">
      <div className="panel-title">{title}</div>
      <div className="panel-sub">{sub}</div>
      <div className="mini-list">
        {rows.map((r) => (
          <div className="ml-row" key={r.label}>
            <span className="ml-lbl">{r.color && <i className="ml-dot" style={{ background: r.color }} />}{r.label}</span>
            <span className={`ml-val ${r.pill ? "pill-green" : ""}`} style={r.color && !r.pill ? {} : undefined}>{r.pill ? `+${r.value}` : r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ s, months }: { s: Stats; months: number }) {
  const buckets = useMemo(() => monthBuckets(months), [months]);
  const w = s.work_by_status;
  // cumulative model growth across the window (carry forward the pre-window total)
  const growth = useMemo(() => {
    const firstKey = buckets[0]?.key || "";
    let base = 0;
    for (const [k, v] of Object.entries(s.models_by_month)) if (k < firstKey) base += v;
    let run = base;
    return buckets.map((b) => (run += s.models_by_month[b.key] || 0));
  }, [s, buckets]);

  return (
    <>
      <div className="trio">
        <MiniList title="Model Distribution" sub="Models by approval status" rows={[
          { label: "Approved", value: s.models_by_status["Approved"] || 0, color: "#37b46e" },
          { label: "Pending", value: s.models_by_status["Pending"] || 0, color: "#f0a43a" },
          { label: "Launched", value: s.models_by_status["Launched"] || 0, color: "#5b8def" },
        ]} />
        <MiniList title="Task Overview" sub="Where assigned work stands" rows={[
          { label: "Completed", value: w["approved"] || 0, color: "#37b46e" },
          { label: "In Progress", value: (w["submitted"] || 0) + (w["changes_requested"] || 0) + (w["in_progress"] || 0), color: "#5b8def" },
          { label: "To Do", value: w["todo"] || 0, color: "#c9b6c0" },
          { label: "Overdue", value: s.overdue, color: "#ef5b5b" },
        ]} />
        <MiniList title="Review Status" sub="Manager review pipeline" rows={[
          { label: "Approved", value: w["approved"] || 0, color: "#37b46e" },
          { label: "Awaiting review", value: w["submitted"] || 0, color: "#5b8def" },
          { label: "Needs changes", value: w["changes_requested"] || 0, color: "#f0a43a" },
        ]} />
      </div>

      <div className="card pad">
        <div className="panel-title">Model Growth Over Time</div>
        <div className="panel-sub">Total models registered, cumulative.</div>
        <LineChart labels={buckets.map((b) => b.label)} series={[{ label: "Models", color: "#7a55d6", values: growth, area: true }]} />
      </div>
    </>
  );
}

function ModelAnalytics({ s }: { s: Stats }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const list = s.per_model.filter((m) =>
    (status === "All" || m.status === status) && m.name.toLowerCase().includes(q.toLowerCase()));
  const top = list.slice(0, 8);

  return (
    <>
      <div className="card pad" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-inp"><Icon name="search" /><input placeholder="Search models…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="inp" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto" }}>
          {["All", "Approved", "Pending", "Launched"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <span className="sub" style={{ marginLeft: "auto" }}>{list.length} model{list.length === 1 ? "" : "s"}</span>
      </div>

      <div className="card pad">
        <div className="panel-title">Model Performance Overview</div>
        <div className="panel-sub">Completion rate (%) by model.</div>
        {top.length === 0 ? <div className="empty">No models match.</div> : (
          <div className="radar-wrap">
            <div className="legend-row"><span className="lg-item"><i style={{ background: "#7a55d6" }} /> Completion Rate (%)</span></div>
            <Radar axes={top.map((m) => m.name)} max={100}
              series={[{ label: "Completion", color: "#7a55d6", values: top.map((m) => pct(m.approved, m.total)) }]} />
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="panel-title">Models ({list.length})</div>
        <div className="panel-sub">Per-model assignment and approval progress.</div>
        {list.length === 0 ? <div className="empty">No models match.</div> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Model</th><th>Status</th><th>Completion</th><th>Assigned</th><th>Approved</th><th>Join date</th></tr></thead>
              <tbody>
                {list.map((m) => {
                  const sm = m.status === "Approved" ? "b-green" : m.status === "Launched" ? "b-soft" : "b-amber";
                  const cr = pct(m.approved, m.total);
                  return (
                    <tr key={m.id}>
                      <td><b>{m.name}</b></td>
                      <td><span className={`badge ${sm}`}>{m.status || "Pending"}</span></td>
                      <td>
                        <span className="bar-track sm"><span className="bar-fill ok" style={{ width: `${cr}%` }} /></span>
                        <span className="sub" style={{ marginLeft: 8 }}>{cr}%</span>
                      </td>
                      <td>{m.total}</td>
                      <td>{m.approved}</td>
                      <td className="sub">{m.created_at ? fmtDate(m.created_at) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function TaskAnalytics({ s, months }: { s: Stats; months: number }) {
  const buckets = useMemo(() => monthBuckets(months), [months]);
  const created = buckets.map((b) => s.tasks_created_by_month[b.key] || 0);
  const completed = buckets.map((b) => s.tasks_completed_by_month[b.key] || 0);
  const donutSegs = STATUS_ORDER.filter((k) => (s.work_by_status[k] || 0) > 0)
    .map((k) => ({ label: statusMeta(k).label, value: s.work_by_status[k] || 0, color: STATUS_COLOR[k] }));
  const typeEntries = Object.entries(s.tasks_by_type).sort((a, b) => b[1] - a[1]);
  const typeMax = typeEntries.reduce((m, [, v]) => Math.max(m, v), 1);
  const prioEntries = ["high", "medium", "low"].map((p) => [p, s.tasks_by_priority[p] || 0] as [string, number]);
  const prioMax = prioEntries.reduce((m, [, v]) => Math.max(m, v), 1);

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi icon="clip" label="Total Tasks" value={s.tasks_total} sub={`${s.templates_total} templates`} />
        <Kpi icon="check" label="Completion Rate" value={`${s.completion_pct}%`} tone={s.completion_pct >= 50 ? "ok" : "warn"} sub={`${s.work_by_status["approved"] || 0}/${s.assignees_total} approved`} />
        <Kpi icon="alert" label="Overdue Rate" value={`${pct(s.overdue, s.assignees_total)}%`} tone={s.overdue > 0 ? "bad" : "ok"} sub={`${s.overdue} overdue`} />
        <Kpi icon="clock" label="Avg Response" value={s.avg_response_hours != null ? `${s.avg_response_hours}h` : "—"} sub={s.avg_response_hours != null ? "assign → submit" : "no submissions"} />
      </div>

      <div className="stat-row">
        <div className="card pad">
          <div className="panel-title">Task Trends</div>
          <div className="panel-sub">Tasks created vs completed over time.</div>
          <div className="legend-row">
            <span className="lg-item"><i style={{ background: "#5b8def" }} /> Created</span>
            <span className="lg-item"><i style={{ background: "#37b46e" }} /> Completed</span>
          </div>
          <LineChart labels={buckets.map((b) => b.label)} series={[
            { label: "Created", color: "#5b8def", values: created, area: true },
            { label: "Completed", color: "#37b46e", values: completed },
          ]} />
        </div>
        <div className="card pad">
          <div className="panel-title">Status Distribution</div>
          <div className="panel-sub">Current breakdown of assigned work.</div>
          {donutSegs.length === 0 ? <div className="empty">No assigned work yet.</div> : (
            <div className="donut-wrap">
              <Donut segments={donutSegs} />
              <div className="legend">
                {donutSegs.map((d) => <span className="lg-item" key={d.label}><i style={{ background: d.color }} />{d.label} <b>{d.value}</b></span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="stat-row">
        <div className="card pad">
          <div className="panel-title">Tasks by Priority</div>
          <div className="panel-sub">How urgent the workload is.</div>
          <div className="bars">
            {prioEntries.map(([p, n]) => (
              <div className="bar-row" key={p}>
                <span className="bar-lbl" style={{ textTransform: "capitalize" }}>{p}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${pct(n, prioMax)}%`, background: PRIORITY_COLOR[p] }} /></span>
                <span className="bar-n">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <div className="panel-title">Tasks by Type</div>
          <div className="panel-sub">Distribution across content formats.</div>
          {typeEntries.length === 0 ? <div className="empty">No tasks yet.</div> : (
            <div className="bars">
              {typeEntries.map(([t, n]) => (
                <div className="bar-row" key={t}>
                  <span className="bar-lbl">{TYPE_LABEL[t] || t}</span>
                  <span className="bar-track"><span className="bar-fill" style={{ width: `${pct(n, typeMax)}%` }} /></span>
                  <span className="bar-n">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
