"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api, ModelRow, TaskRow, DriveStatus, fmtDate } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  detailed: "Detailed", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long", images_videos: "Media Gallery", swipe: "Swipe",
};

function StatusDot({ s }: { s: string }) {
  const cls = s === "done" ? "b-green" : s === "in_progress" ? "b-soft" : "b-amber";
  const label = s === "done" ? "Done" : s === "in_progress" ? "In Progress" : "Todo";
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Overview() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [templates, setTemplates] = useState<TaskRow[]>([]);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, t, tpl, s] = await Promise.all([
          api.listModels(), api.listTasks(false), api.listTasks(true), api.status(),
        ]);
        setModels(m); setTasks(t); setTemplates(tpl); setStatus(s);
      } catch { /* surfaced via empty state */ } finally { setLoading(false); }
    })();
  }, []);

  const pending = models.filter((m) => m.status === "Pending").length;
  const active = tasks.filter((t) => t.status !== "done").length;
  const connected = !!status?.connected;

  const kpis = [
    { icon: "star", label: "Models", n: models.length, sub: pending ? `${pending} pending approval` : "all reviewed", href: "/models", tone: "iris" },
    { icon: "clip", label: "Active Tasks", n: active, sub: `${tasks.length} total`, href: "/tasks", tone: "blue" },
    { icon: "folders", label: "Templates", n: templates.length, sub: "reusable blueprints", href: "/tasks", tone: "green" },
    { icon: "folder", label: "Drive", n: connected ? "Connected" : "Offline", sub: status?.email || "not connected", href: "/drive", tone: "amber", small: true },
  ];

  const recent = tasks.slice(0, 6);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Your agency at a glance — models, content tasks and Drive.</p>
        </div>
        <div className="btn-row">
          <Link className="btn" href="/models"><Icon name="uplus" /> Register Model</Link>
          <Link className="btn brand" href="/tasks"><Icon name="plus" /> New Task</Link>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={`kpi t-${k.tone}`}>
            <span className="k-ic"><Icon name={k.icon} /></span>
            <span className="k-n" style={k.small ? { fontSize: 20 } : undefined}>{loading ? "—" : k.n}</span>
            <span className="k-l">{k.label}</span>
            <span className="k-s">{k.sub}</span>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card pad">
          <div className="panel-h">
            <h3><Icon name="clip" /> Recent Tasks</h3>
            <Link className="lnk" href="/tasks">View all <Icon name="chevr" /></Link>
          </div>
          {loading ? (
            <div className="empty-row">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="empty-row">No tasks yet. <Link className="lnk" href="/tasks">Create your first task</Link>.</div>
          ) : (
            <div className="dash-list">
              {recent.map((t) => (
                <div className="dash-item" key={t.id}>
                  <span className="di-ic"><Icon name="clip" /></span>
                  <span className="di-main">
                    <span className="di-title">{t.title}</span>
                    <span className="di-sub">
                      {TYPE_LABEL[t.type || ""] || "Task"}
                      {t.assignees?.length ? ` · ${t.assignees.map((a) => a.name).join(", ")}` : ""}
                    </span>
                  </span>
                  {t.due_date && <span className="di-date">{fmtDate(t.due_date)}</span>}
                  <StatusDot s={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-side">
          <div className="card pad">
            <div className="panel-h"><h3><Icon name="folder" /> Drive</h3></div>
            {connected ? (
              <>
                <div className="statusbar" style={{ marginBottom: 10 }}>
                  <span className="badge b-green"><Icon name="check" /> Connected</span>
                  {status?.shared_drive && <span className="badge b-soft">Shared Drive</span>}
                </div>
                <div className="di-sub" style={{ marginBottom: 14 }}>{status?.email}</div>
                <Link className="btn sm" href="/drive"><Icon name="folder" /> Open Drive Manager</Link>
              </>
            ) : (
              <>
                <div className="di-sub" style={{ marginBottom: 14 }}>Connect the agency Google Drive to manage content.</div>
                <Link className="btn brand sm" href="/drive"><Icon name="link" /> Connect Drive</Link>
              </>
            )}
          </div>

          <div className="card pad">
            <div className="panel-h"><h3><Icon name="star" /> Models</h3></div>
            {models.length === 0 ? (
              <div className="di-sub">No models registered yet.</div>
            ) : (
              <div className="dash-list">
                {models.slice(0, 5).map((m) => (
                  <Link className="dash-item lite" key={m.id} href="/models">
                    <span className="av fav">{m.name.charAt(0).toUpperCase()}</span>
                    <span className="di-main"><span className="di-title">{m.name}</span></span>
                    <span className="di-sub">{m.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
