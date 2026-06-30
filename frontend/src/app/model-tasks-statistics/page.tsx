"use client";
import { useState } from "react";
import Icon from "@/components/Icon";

// ── Mock data ─────────────────────────────────────────────────────────────────
const KPIS = [
  { label: "Total Models", icon: "users", val: "2", sub: "+2 this period", tone: "#1f8f53" },
  { label: "Active Tasks", icon: "cal", val: "7", sub: "All on time", tone: "#1f8f53" },
  { label: "Completion Rate", icon: "check", val: "22%", sub: "Needs attention", tone: "#c2871b" },
  { label: "Avg Response Time", icon: "clock", val: "0h", sub: "Fast responses", tone: "#1f8f53" },
];

const ACTIVITY = [
  { id: "a1", icon: "check", tone: "green", title: "Ava Stone completed swipe task", date: "6/18/2026 at 6:46:58 PM", tag: "task" },
  { id: "a2", icon: "check", tone: "green", title: "Ava Stone completed media task", date: "6/17/2026 at 10:14:35 PM", tag: "task" },
  { id: "a3", icon: "user", tone: "iris", title: "New model Ava Stone registered", date: "6/17/2026 at 4:43:43 PM", tag: "model" },
  { id: "a4", icon: "user", tone: "iris", title: "New model Mia Rivers registered", date: "6/16/2026 at 6:20:25 PM", tag: "model" },
];
const TASK_TYPES = [
  { label: "Photos", n: 4, icon: "image", bg: "#eef2ff", c: "#3b6fd4" },
  { label: "Videos", n: 0, icon: "video", bg: "#f5edff", c: "#8b5cf6" },
  { label: "Swipe", n: 2, icon: "note", bg: "#ecfdf3", c: "#1f9d57" },
  { label: "Other", n: 1, icon: "note", bg: "#fff3ec", c: "#d9772e" },
];

const GROWTH = { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], points: [0, 0, 1, 1, 2, 2] };
const TRENDS = { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], points: [1, 2, 1, 3, 2, 4] };
const PERF = { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], points: [10, 14, 12, 18, 20, 22] };

export default function ModelStatsPage() {
  const [range, setRange] = useState("30d");
  const [tab, setTab] = useState<"overview" | "model" | "task">("overview");
  const [inner, setInner] = useState<"growth" | "trends" | "perf">("growth");
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); };

  return (
    <div className="content">
      <div className="page-head">
        <div><h1>Model Statistics</h1><p>Comprehensive analytics and insights for model management.</p></div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 10, flexWrap: "wrap" }}>
        <select className="inp" style={{ width: "auto" }} value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">This year</option>
        </select>
        <button className="btn" onClick={refresh}><Icon name="refresh" className={refreshing ? "spin" : ""} /> Refresh</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-top">{k.label}<Icon name={k.icon} /></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-sub" style={{ color: k.tone }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="seg" style={{ marginBottom: 18 }}>
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button className={tab === "model" ? "active" : ""} onClick={() => setTab("model")}>Model Analytics</button>
        <button className={tab === "task" ? "active" : ""} onClick={() => setTab("task")}>Task Analytics</button>
      </div>

      {tab === "overview" && (
        <>
          <div className="grid3" style={{ marginBottom: 18 }}>
            <DistCard title="Model Distribution" sub="Models by approval status" rows={[
              { l: "Approved", v: "2" }, { l: "Pending", v: "0" }, { l: "New This Period", v: "+2", cls: "b-green" },
            ]} />
            <DistCard title="Task Overview" sub="Task completion status" rows={[
              { l: "Completed", v: "2" }, { l: "In Progress", v: "0" }, { l: "Overdue", v: "0", cls: "b-red" },
            ]} />
            <DistCard title="Content Status" sub="Content availability" rows={[
              { l: "High Availability", v: "0" }, { l: "Medium Availability", v: "1" }, { l: "Low Availability", v: "1", cls: "b-red" },
            ]} />
          </div>

          <div className="card pad" style={{ marginBottom: 18 }}>
            <div className="panel-title">Recent Activity</div>
            <div className="panel-sub">Latest activities in the system</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
              {ACTIVITY.map((a) => (
                <div className="ms-act" key={a.id}>
                  <span className={`ms-act-ic ${a.tone}`}><Icon name={a.icon} /></span>
                  <div style={{ flex: 1 }}><div className="u-name" style={{ fontSize: 13.5 }}>{a.title}</div><div className="sub">{a.date}</div></div>
                  <span className="badge b-todo">{a.tag}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card pad">
            <div className="panel-title">Task Type Breakdown</div>
            <div className="panel-sub">Distribution of tasks by type</div>
            <div className="ms-types">
              {TASK_TYPES.map((t) => (
                <div className="ms-type" key={t.label} style={{ background: t.bg }}>
                  <Icon name={t.icon} style={{ color: t.c, width: 22, height: 22 }} />
                  <div className="ms-type-n">{t.n}</div>
                  <div className="sub">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "model" && (
        <>
          <div className="seg" style={{ marginBottom: 18 }}>
            <button className={inner === "growth" ? "active" : ""} onClick={() => setInner("growth")}>Model Growth</button>
            <button className={inner === "trends" ? "active" : ""} onClick={() => setInner("trends")}>Task Trends</button>
            <button className={inner === "perf" ? "active" : ""} onClick={() => setInner("perf")}>Performance</button>
          </div>
          <div className="card pad">
            {inner === "growth" && <LineChart title="Model Growth Over Time" sub="Number of models registered over time" labels={GROWTH.labels} points={GROWTH.points} />}
            {inner === "trends" && <LineChart title="Task Trends" sub="Tasks created over time" labels={TRENDS.labels} points={TRENDS.points} />}
            {inner === "perf" && <LineChart title="Performance" sub="Completion rate over time (%)" labels={PERF.labels} points={PERF.points} />}
          </div>
        </>
      )}

      {tab === "task" && (
        <div className="card pad">
          <LineChart title="Task Completion Trend" sub="Completed tasks over time" labels={TRENDS.labels} points={TRENDS.points} />
          <div className="ms-types" style={{ marginTop: 18 }}>
            {TASK_TYPES.map((t) => (
              <div className="ms-type" key={t.label} style={{ background: t.bg }}>
                <Icon name={t.icon} style={{ color: t.c, width: 22, height: 22 }} /><div className="ms-type-n">{t.n}</div><div className="sub">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media(max-width:1000px){.grid3{grid-template-columns:1fr}}
        .ms-distrow{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-top:1px solid var(--line2)}
        .ms-distrow:first-of-type{border-top:0}
        .ms-act{display:flex;align-items:center;gap:12px;padding:12px 4px;border-top:1px solid var(--line2)}
        .ms-act:first-child{border-top:0}
        .ms-act-ic{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;flex:none}
        .ms-act-ic.green{background:#ecfdf3;color:#1f9d57}
        .ms-act-ic.iris{background:var(--brand-soft);color:var(--brand-tx)}
        .ms-act-ic svg{width:16px;height:16px}
        .ms-types{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px}
        @media(max-width:800px){.ms-types{grid-template-columns:repeat(2,1fr)}}
        .ms-type{border-radius:14px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid var(--line2)}
        .ms-type-n{font-size:22px;font-weight:700}
        .ms-chart{width:100%;height:auto;display:block;margin-top:10px}
        .ms-chart .grid{stroke:#eef0f3}.ms-chart .axis{fill:#9aa0a8;font-size:11px}
      `}</style>
    </div>
  );
}

function DistCard({ title, sub, rows }: { title: string; sub: string; rows: { l: string; v: string; cls?: string }[] }) {
  return (
    <div className="card pad">
      <div className="panel-title">{title}</div>
      <div className="panel-sub">{sub}</div>
      <div style={{ marginTop: 10 }}>
        {rows.map((r) => (
          <div className="ms-distrow" key={r.l}><span>{r.l}</span><span className={`badge ${r.cls || "b-todo"}`}>{r.v}</span></div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ title, sub, labels, points }: { title: string; sub: string; labels: string[]; points: number[] }) {
  const W = 720, H = 300, PL = 38, PR = 14, PT = 16, PB = 28;
  const max = Math.max(...points, 1);
  const x = (i: number) => PL + (i / (labels.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const yticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p).toFixed(1)}`).join(" ");
  return (
    <div>
      <div className="panel-title">{title}</div>
      <div className="panel-sub">{sub}</div>
      <svg className="ms-chart" viewBox={`0 0 ${W} ${H}`}>
        {yticks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PL - 8} y={y(t) + 3} textAnchor="end">{max <= 2 ? t.toFixed(1) : Math.round(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => <text key={l + i} className="axis" x={x(i)} y={H - 8} textAnchor="middle">{l}</text>)}
        <path d={path} fill="none" stroke="#2f6df6" strokeWidth={2.5} />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r={4} fill="#fff" stroke="#2f6df6" strokeWidth={2.5} />)}
      </svg>
    </div>
  );
}
