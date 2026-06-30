"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Session = { id: string; date: string; clockIn: string; clockOut: string; hours: number };
type Leave = { id: string; type: string; from: string; to: string; days: number; status: "approved" | "pending" | "rejected"; reason: string };

const EMPLOYEES = ["You", "Mara Quinn", "Leo Park", "Aria Vance"];
const PERIODS = [{ k: "today", l: "Today", d: 1 }, { k: "week", l: "This Week", d: 7 }, { k: "biweekly", l: "Bi-weekly", d: 14 }, { k: "month", l: "This Month", d: 30 }] as const;
const SECTIONS = [
  { k: "overview", l: "Overview", icon: "trendup" },
  { k: "history", l: "Clock History", icon: "clock" },
  { k: "leave", l: "Leave Management", icon: "cal" },
  { k: "team", l: "Team Overview", icon: "users" },
] as const;
const LEAVE_TYPES = ["Vacation", "Sick", "Personal", "Unpaid"];
const LST: Record<Leave["status"], string> = { approved: "b-green", pending: "b-amber", rejected: "b-red" };
const hh = (n: number) => `${n.toFixed(1)}h`;
const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toLocaleDateString("en-US");

export default function ClockHistoryPage() {
  const [period, setPeriod] = useState<typeof PERIODS[number]["k"]>("week");
  const [tab, setTab] = useState<typeof SECTIONS[number]["k"]>("overview");
  const [employee, setEmployee] = useState("You");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInAt, setClockInAt] = useState("");
  const [leaveModal, setLeaveModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const days = PERIODS.find((p) => p.k === period)!.d;
  const totalHours = sessions.reduce((s, x) => s + x.hours, 0);
  const avgPerDay = totalHours / days;
  const leaveApproved = leaves.filter((l) => l.status === "approved").length;
  const leavePending = leaves.filter((l) => l.status === "pending").length;
  const daysTaken = leaves.filter((l) => l.status === "approved").reduce((s, l) => s + l.days, 0);

  const clockIn = () => { setClockedIn(true); setClockInAt(nowTime()); flash("Clocked in."); };
  const clockOut = () => {
    const hours = +(4 + Math.random() * 4).toFixed(1); // mock shift length
    setSessions((s) => [{ id: "s_" + Math.floor(Math.random() * 99999), date: today(), clockIn: clockInAt || nowTime(), clockOut: nowTime(), hours }, ...s]);
    setClockedIn(false); flash(`Clocked out · ${hh(hours)} recorded.`);
  };
  const addLeave = (l: Omit<Leave, "id" | "status">) => { setLeaves((s) => [{ ...l, id: "lv_" + Math.floor(Math.random() * 99999), status: "pending" }, ...s]); setLeaveModal(false); flash("Leave request submitted."); };
  const setLeaveStatus = (id: string, status: Leave["status"]) => setLeaves((s) => s.map((l) => l.id === id ? { ...l, status } : l));

  const subtitle = tab === "team" ? "Company-wide team statistics and rankings" : "View work hours, clock history, and manage leave requests";

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="clock" /> Time Tracking & Leave Management</h1>
          <p>{subtitle}</p>
        </div>
        {tab !== "team" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="sub">Employee:</span>
            <select className="inp" style={{ width: "auto" }} value={employee} onChange={(e) => setEmployee(e.target.value)}>{EMPLOYEES.map((e) => <option key={e}>{e}</option>)}</select>
          </div>
        )}
      </div>

      <div className="btn-row" style={{ marginBottom: 12 }}>
        {PERIODS.map((p) => <button key={p.k} className={`pill-btn ${period === p.k ? "active" : ""}`} onClick={() => setPeriod(p.k)}>{p.l}</button>)}
      </div>
      <div className="btn-row" style={{ marginBottom: 18 }}>
        {SECTIONS.map((s) => <button key={s.k} className={`pill-btn ${tab === s.k ? "active" : ""}`} onClick={() => setTab(s.k)}><Icon name={s.icon} /> {s.l}</button>)}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18 }}>
            <div className="kpi"><div className="kpi-top">Total Hours<Icon name="clock" /></div><div className="kpi-val">{hh(totalHours)}</div><div className="kpi-sub">{sessions.length} clock-ins</div></div>
            <div className="kpi"><div className="kpi-top">Avg Hours/Day<Icon name="trendup" /></div><div className="kpi-val">{hh(avgPerDay)}</div><div className="kpi-sub">Based on {days} days</div></div>
            <div className="kpi"><div className="kpi-top">Current Status<Icon name="user" /></div>
              <div className="kpi-val" style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>{clockedIn ? "Clocked In" : "Clocked Out"} <span className={`badge ${clockedIn ? "b-green" : "b-todo"}`}>{clockedIn ? "Active" : "Idle"}</span></div>
              <div className="kpi-sub" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{clockedIn ? `Since ${clockInAt}` : "No recent activity"}</span>
                <button className="btn sm brand" onClick={clockedIn ? clockOut : clockIn}><Icon name="clock" /> {clockedIn ? "Clock Out" : "Clock In"}</button>
              </div>
            </div>
          </div>

          <div className="grid2" style={{ marginBottom: 18 }}>
            <div className="card pad">
              <div className="panel-title">Daily Work Hours</div>
              {sessions.length === 0 ? (
                <div className="empty" style={{ padding: "70px 16px" }}><div style={{ fontWeight: 600, color: "#3f3f46" }}>No work hours recorded</div><div className="sub">Start clocking in/out to see your daily hours</div></div>
              ) : <HoursBars sessions={sessions} />}
            </div>
            <div className="card pad">
              <div className="panel-title">Weekly Trend</div>
              {sessions.length === 0 ? (
                <div className="empty" style={{ padding: "70px 16px" }}><div style={{ fontWeight: 600, color: "#3f3f46" }}>No work hours recorded</div><div className="sub">Weekly trends will appear once you start working</div></div>
              ) : <HoursBars sessions={sessions} />}
            </div>
          </div>

          <div className="card pad">
            <div className="panel-title">Leave Summary</div>
            <div className="panel-sub">Leave status for selected period</div>
            <div className="ch-leavesum">
              <div><span className="sub">Total Requests</span><b>{leaves.length}</b></div>
              <div><span className="sub">Approved</span><b style={{ color: "#1f8f53" }}>{leaveApproved}</b></div>
              <div><span className="sub">Pending</span><b style={{ color: "#c2871b" }}>{leavePending}</b></div>
              <div><span className="sub">Days Taken</span><b>{daysTaken}</b></div>
            </div>
          </div>
        </>
      )}

      {/* CLOCK HISTORY */}
      {tab === "history" && (
        <div className="card pad">
          <div className="panel-h">
            <div><div className="panel-title"><Icon name="clock" /> Clock History</div><div className="panel-sub">Your clock in / out records</div></div>
            <button className="btn brand" onClick={clockedIn ? clockOut : clockIn}><Icon name="clock" /> {clockedIn ? "Clock Out" : "Clock In"}</button>
          </div>
          {sessions.length === 0 ? (
            <div className="empty" style={{ padding: "60px 16px" }}><Icon name="clock" /><div className="sub">No clock records yet — clock in to start.</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th></th></tr></thead>
              <tbody>{sessions.map((s) => (
                <tr key={s.id}><td className="u-name">{s.date}</td><td>{s.clockIn}</td><td>{s.clockOut}</td><td>{hh(s.hours)}</td>
                  <td style={{ textAlign: "right" }}><button className="btn icon sm danger" onClick={() => setSessions((x) => x.filter((y) => y.id !== s.id))}><Icon name="trash" /></button></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* LEAVE MANAGEMENT */}
      {tab === "leave" && (
        <div className="card pad">
          <div className="panel-h">
            <div><div className="panel-title"><Icon name="cal" /> Leave Management</div><div className="panel-sub">Request and manage time off</div></div>
            <button className="btn brand" onClick={() => setLeaveModal(true)}><Icon name="plus" /> Request Leave</button>
          </div>
          {leaves.length === 0 ? (
            <div className="empty" style={{ padding: "60px 16px" }}><Icon name="cal" /><div className="sub">No leave requests yet.</div></div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>{leaves.map((l) => (
                <tr key={l.id}>
                  <td className="u-name">{l.type}</td><td className="sub">{l.from}</td><td className="sub">{l.to}</td><td>{l.days}</td><td className="sub">{l.reason}</td>
                  <td><span className={`badge ${LST[l.status]}`} style={{ textTransform: "capitalize" }}>{l.status}</span></td>
                  <td style={{ textAlign: "right" }}><span className="btn-row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn icon sm" title="Approve" onClick={() => setLeaveStatus(l.id, "approved")}><Icon name="check" /></button>
                    <button className="btn icon sm danger" title="Reject" onClick={() => setLeaveStatus(l.id, "rejected")}><Icon name="x" /></button>
                  </span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* TEAM OVERVIEW */}
      {tab === "team" && (
        <>
          <div className="kpi-grid" style={{ marginBottom: 18 }}>
            <div className="kpi t-blue"><div className="kpi-top">Total Hours<Icon name="clock" /></div><div className="kpi-val">0.0h</div><div className="kpi-sub">Across 0 employees</div></div>
            <div className="kpi t-iris"><div className="kpi-top">Total Employees<Icon name="users" /></div><div className="kpi-val">0</div><div className="kpi-sub">0 currently clocked in</div></div>
            <div className="kpi t-green"><div className="kpi-top">Avg Hours/Employee<Icon name="trendup" /></div><div className="kpi-val">0.0h</div><div className="kpi-sub">Average across period</div></div>
            <div className="kpi t-green"><div className="kpi-top">Total Payroll<Icon name="dollar" /></div><div className="kpi-val">$0.00</div><div className="kpi-sub">Estimated total cost</div></div>
          </div>

          <div className="card pad" style={{ marginBottom: 18 }}>
            <div className="panel-h"><div><div className="panel-title">Week-over-Week Comparison</div><div className="panel-sub">Last 7 days compared to previous 7 days</div></div><span className="badge b-todo">Stable</span></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0 14px" }}><span style={{ fontSize: 26, fontWeight: 700, color: "var(--muted2)" }}>+0.0%</span><span className="sub">Similar to last week</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div><div className="sub">CURRENT WEEK</div><b style={{ fontSize: 20 }}>0.0h</b><div className="sub">Last 7 days</div></div>
              <div style={{ textAlign: "right" }}><div className="sub">PREVIOUS WEEK</div><b style={{ fontSize: 20 }}>0.0h</b><div className="sub">7 days before</div></div>
            </div>
            <div className="ch-wow"><span style={{ width: "55%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="sub">Previous</span><span className="sub">Current</span></div>
          </div>

          <div className="card pad" style={{ marginBottom: 18 }}>
            <div className="panel-title">Employee Rankings</div><div className="panel-sub">No employee data available</div>
            <div className="empty" style={{ padding: "70px 16px" }}><div className="sub">No employees found for the selected period</div></div>
          </div>

          <div className="card pad">
            <div className="panel-title">Department Comparison</div><div className="panel-sub">No department data available</div>
            <div className="empty" style={{ padding: "70px 16px" }}><div style={{ fontWeight: 600, color: "#3f3f46" }}>No departments found</div><div className="sub">Department statistics will appear here</div></div>
          </div>
        </>
      )}

      {leaveModal && <LeaveModal onClose={() => setLeaveModal(false)} onSave={addLeave} />}
      {toast && <div className="ch-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .ch-leavesum{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
        .ch-leavesum > div{display:flex;flex-direction:column;gap:4px}
        .ch-leavesum b{font-size:22px;font-weight:700}
        .ch-wow{height:8px;background:#3b6fd4;border-radius:20px;overflow:hidden;margin:4px 0 6px;position:relative}
        .ch-wow span{display:block;height:100%;background:#9aa0aa}
        .ch-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .ch-toast svg{width:15px;height:15px;color:#7ee2a8}
        .modal .ch-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

function HoursBars({ sessions }: { sessions: Session[] }) {
  const max = Math.max(...sessions.map((s) => s.hours), 8);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, padding: "20px 4px 0" }}>
      {sessions.slice(0, 10).reverse().map((s) => (
        <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: "100%", maxWidth: 34, height: `${(s.hours / max) * 130}px`, background: "linear-gradient(180deg,#6a6ae0,var(--brand))", borderRadius: 6 }} />
          <span className="sub" style={{ fontSize: 10 }}>{hh(s.hours)}</span>
        </div>
      ))}
    </div>
  );
}

function LeaveModal({ onClose, onSave }: { onClose: () => void; onSave: (l: Omit<Leave, "id" | "status">) => void }) {
  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const submit = () => { if (!from || !to) return; onSave({ type, from, to, days: Math.max(1, +days || 1), reason: reason.trim() }); };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Request Leave</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Submit a time-off request for approval.</p>
        <label className="ch-l">Type</label>
        <select className="inp" value={type} onChange={(e) => setType(e.target.value)}>{LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <div><label className="ch-l">From</label><input className="inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="ch-l">To</label><input className="inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><label className="ch-l">Days</label><input className="inp" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></div>
        </div>
        <label className="ch-l" style={{ marginTop: 14 }}>Reason</label>
        <input className="inp" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Submit</button></div>
      </div>
    </div>
  );
}
