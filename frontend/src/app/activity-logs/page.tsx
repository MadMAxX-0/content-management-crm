"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Model (mock) ──────────────────────────────────────────────────────────────
type Level = "info" | "success" | "warning" | "error";
type Log = {
  id: string;
  level: Level;
  action: string;
  actionColor: string;
  category: "User" | "System";
  tag: string;
  title: string;
  actor: string;
  email: string;
  time: string;
  day: "today" | string;
  icon: string;
  details: Record<string, string>;
};

const LOGS: Log[] = [
  { id: "e1", level: "info", action: "USER LOGOUT", actionColor: "#6b7280", category: "User", tag: "Aria", icon: "user",
    title: "User Aria logged out", actor: "Aria", email: "team@example.com", time: "18:57:25", day: "today",
    details: { "IP Address": "192.168.1.24", Device: "Chrome · Windows", Session: "sess_8f2a91" } },
  { id: "e2", level: "info", action: "USER LOGIN", actionColor: "#7c3aed", category: "User", tag: "Aria", icon: "user",
    title: "User Aria logged in", actor: "Aria", email: "team@example.com", time: "18:53:05", day: "today",
    details: { "IP Address": "192.168.1.24", Device: "Chrome · Windows", Location: "Austin, US" } },
  { id: "e3", level: "success", action: "USER CREATED", actionColor: "#16a34a", category: "User", tag: "Marco", icon: "user",
    title: "New user Marco was created by Aria", actor: "Aria", email: "team@example.com", time: "12:04:59", day: "today",
    details: { Email: "marco.diaz@example.com", Role: "admin", "Created By": "Aria" } },
  { id: "e4", level: "success", action: "TEMPLATE SAVED", actionColor: "#16a34a", category: "System", tag: "Templates", icon: "folders",
    title: 'Drive template "Jasmine" was saved', actor: "Aria", email: "team@example.com", time: "11:20:33", day: "today",
    details: { Template: "Jasmine", Folders: "4", "Saved By": "Aria" } },
  { id: "e5", level: "warning", action: "LOGIN FAILED", actionColor: "#d97706", category: "User", tag: "Unknown", icon: "user",
    title: "Failed login attempt for an unknown account", actor: "System", email: "security@example.com", time: "09:41:12", day: "today",
    details: { "Attempted Email": "guest@example.com", Reason: "Invalid password", Attempts: "3" } },
  { id: "e6", level: "error", action: "DRIVE SYNC FAILED", actionColor: "#dc2626", category: "System", tag: "Drive", icon: "database",
    title: "Google Drive sync failed for model Ava Stone", actor: "System", email: "system@example.com", time: "08:15:40", day: "today",
    details: { Error: "OAuth token expired", Model: "Ava Stone", Retry: "scheduled in 5m" } },
  { id: "e7", level: "info", action: "INITIAL SETUP", actionColor: "#2563eb", category: "System", tag: "System Setup", icon: "database",
    title: "Initial admin account created for team@example.com", actor: "Aria", email: "team@example.com", time: "17:55:02", day: "June 14, 2026",
    details: { Environment: "production", Version: "v1.0.0", Region: "us-east" } },
];

const LEVEL: Record<Level, { label: string; cls: string; icon: string; dot: string }> = {
  info: { label: "INFO", cls: "b-todo", icon: "info", dot: "#5b5bd6" },
  success: { label: "SUCCESS", cls: "b-green", icon: "check", dot: "#37b46e" },
  warning: { label: "WARNING", cls: "b-amber", icon: "alert", dot: "#f0a43a" },
  error: { label: "ERROR", cls: "b-red", icon: "xcircle", dot: "#ef5b5b" },
};

const TABS: { key: "all" | Level | "system"; label: string; icon: string }[] = [
  { key: "all", label: "All Logs", icon: "activity" },
  { key: "error", label: "Errors", icon: "xcircle" },
  { key: "warning", label: "Warnings", icon: "alert" },
  { key: "success", label: "Success", icon: "check" },
  { key: "system", label: "System", icon: "note" },
];

export default function ActivityLogsPage() {
  const [tab, setTab] = useState<"all" | Level | "system">("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (tab === "all") return LOGS;
    if (tab === "system") return LOGS.filter((l) => l.category === "System");
    return LOGS.filter((l) => l.level === tab);
  }, [tab]);

  // group by day, keep "today" first, sort entries by time desc
  const groups = useMemo(() => {
    const by: Record<string, Log[]> = {};
    filtered.forEach((l) => { (by[l.day] ||= []).push(l); });
    const keys = Object.keys(by).sort((a, b) => (a === "today" ? -1 : b === "today" ? 1 : b.localeCompare(a)));
    return keys.map((k) => ({ day: k, items: by[k].slice().sort((a, b) => b.time.localeCompare(a.time)) }));
  }, [filtered]);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="listcheck" /> Activity Logs</h1>
          <p>Every sign-in, sign-out and system event across your workspace.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="btn-row" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.key} className={`pill-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card pad"><div className="empty"><Icon name="activity" /><div className="sub">No events for this filter.</div></div></div>
      ) : groups.map((g) => (
        <div className="al-day" key={g.day}>
          <div className="al-dayhead">
            <Icon name="cal" /> <b>{g.day === "today" ? "Today" : g.day}</b>
            <span className="badge b-todo">{g.items.length} event{g.items.length === 1 ? "" : "s"}</span>
          </div>
          <div className="al-list">
            {g.items.map((l) => {
              const lv = LEVEL[l.level];
              const isOpen = !!open[l.id];
              return (
                <div className="al-event" key={l.id}>
                  <span className="al-dot" style={{ background: lv.dot }} />
                  <div className="card pad al-card">
                    <div className="al-top">
                      <span className="al-actor-ic"><Icon name={l.icon} /></span>
                      <span className={`badge ${lv.cls}`}><Icon name={lv.icon} /> {lv.label}</span>
                      <span className="al-action" style={{ color: l.actionColor }}>{l.action}</span>
                      <span className="badge b-todo">{l.category}</span>
                      <span className="badge b-type"># {l.tag}</span>
                    </div>
                    <div className="al-title">{l.title}</div>
                    <div className="al-meta">
                      <span><span className="al-av">{l.actor.charAt(0).toUpperCase()}</span> {l.actor}</span>
                      <span><Icon name="clock" /> {l.time}</span>
                      <span><Icon name="globe" /> {l.email}</span>
                    </div>
                    <button className="al-toggle" onClick={() => setOpen((s) => ({ ...s, [l.id]: !s[l.id] }))}>
                      <Icon name="code" /> {isOpen ? "Hide Details" : "Show Details"} <Icon name={isOpen ? "chevu" : "chevd"} />
                    </button>
                    {isOpen && (
                      <div className="al-details">
                        <div className="al-dh">Additional Information</div>
                        <dl className="al-dl">
                          {Object.entries(l.details).map(([k, v]) => (
                            <div key={k}><dt>{k}:</dt><dd>{v}</dd></div>
                          ))}
                        </dl>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <style>{`
        .al-day{margin-bottom:10px}
        .al-dayhead{display:flex;align-items:center;gap:9px;background:#f6f6f8;border:1px solid var(--line2);border-radius:10px;padding:10px 14px;font-size:14px;margin:14px 0}
        .al-dayhead svg{width:15px;height:15px;color:var(--muted2)}
        .al-list{position:relative;margin-left:6px;padding-left:24px;border-left:2px solid var(--line2)}
        .al-event{position:relative;margin:12px 0}
        .al-dot{position:absolute;left:-31px;top:24px;width:11px;height:11px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px var(--line2)}
        .al-card{border-radius:14px}
        .al-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .al-actor-ic{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#f3f4f6;color:#6b7280}
        .al-actor-ic svg{width:15px;height:15px}
        .al-action{font-size:11px;font-weight:800;letter-spacing:.04em}
        .al-title{font-weight:650;margin:9px 0 7px;font-size:14.5px;letter-spacing:-.01em}
        .al-meta{display:flex;gap:16px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:12.5px}
        .al-meta span{display:inline-flex;align-items:center;gap:6px}
        .al-meta svg{width:13px;height:13px;color:var(--muted2)}
        .al-av{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--brand-soft);color:var(--brand-tx);font-size:10px;font-weight:700}
        .al-toggle{margin-top:11px;background:none;border:0;color:var(--muted);font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:0}
        .al-toggle:hover{color:var(--ink)}
        .al-toggle svg{width:14px;height:14px}
        .al-details{margin-top:11px;border-top:1px solid var(--line2);padding-top:12px}
        .al-dh{font-weight:700;font-size:12.5px;color:var(--brand-tx);margin-bottom:8px}
        .al-dl{margin:0;display:flex;flex-direction:column;gap:6px}
        .al-dl > div{display:flex;gap:10px;font-size:13px}
        .al-dl dt{color:var(--muted);min-width:120px;font-weight:600}
        .al-dl dd{margin:0;color:var(--ink2)}
      `}</style>
    </div>
  );
}
