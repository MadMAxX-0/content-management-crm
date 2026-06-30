"use client";
import { useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
type Status = "open" | "in_progress" | "resolved";
type TaskBn = { id: string; task: string; reportedBy: string; department: string; issue: string; status: Status; date: string };
type DeptBn = { id: string; department: string; reportedBy: string; issue: string; status: Status; date: string };

const DEPTS = ["Editors", "AI editors", "Model Managers", "IG management", "Mass DMs", "Cupid management", "Onlyfans management", "HR department", "Operations"];
const ST_BADGE: Record<Status, string> = { open: "b-amber", in_progress: "b-soft", resolved: "b-green" };
const ST_LABEL: Record<Status, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
const NEXT: Record<Status, Status> = { open: "in_progress", in_progress: "resolved", resolved: "open" };
const today = () => new Date().toLocaleDateString("en-US");

export default function BottlenecksPage() {
  const [taskBns, setTaskBns] = useState<TaskBn[]>([]);
  const [deptBns, setDeptBns] = useState<DeptBn[]>([]);
  const [report, setReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const cycleTask = (id: string) => setTaskBns((s) => s.map((b) => b.id === id ? { ...b, status: NEXT[b.status] } : b));
  const cycleDept = (id: string) => setDeptBns((s) => s.map((b) => b.id === id ? { ...b, status: NEXT[b.status] } : b));

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="alert" /> All Reported Bottlenecks</h1>
          <p>View and manage task and department bottlenecks reported by your team.</p>
        </div>
        <div className="btn-row"><button className="btn" onClick={() => setReport(true)}><Icon name="plus" /> Report Bottleneck</button></div>
      </div>

      {/* Task bottlenecks */}
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="panel-title"><Icon name="clip" /> Task Bottlenecks (Reported by Employees) ({taskBns.length})</div>
        <div className="panel-sub">Issues reported regarding specific tasks.</div>
        {taskBns.length === 0 ? (
          <div className="bn-empty">No task bottlenecks reported.</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Task</th><th>Reported By</th><th>Department</th><th>Issue</th><th>Status</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {taskBns.map((b) => (
                <tr key={b.id}>
                  <td className="u-name">{b.task}</td><td className="sub">{b.reportedBy}</td><td><span className="badge b-type">{b.department}</span></td>
                  <td className="sub" style={{ maxWidth: 260 }}>{b.issue}</td>
                  <td><button className={`badge ${ST_BADGE[b.status]}`} style={{ border: 0, cursor: "pointer" }} onClick={() => cycleTask(b.id)} title="Click to advance">{ST_LABEL[b.status]}</button></td>
                  <td className="sub">{b.date}</td>
                  <td style={{ textAlign: "right" }}><button className="btn icon sm danger" onClick={() => setTaskBns((s) => s.filter((x) => x.id !== b.id))}><Icon name="trash" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Department bottlenecks */}
      <div className="card pad">
        <div className="panel-title"><Icon name="building" /> Department Bottlenecks (Reported by Managers) ({deptBns.length})</div>
        <div className="panel-sub">Issues reported regarding department operations.</div>
        {deptBns.length === 0 ? (
          <div className="bn-empty">No department bottlenecks reported.</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Department</th><th>Reported By</th><th>Issue</th><th>Status</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {deptBns.map((b) => (
                <tr key={b.id}>
                  <td><span className="badge b-type">{b.department}</span></td><td className="sub">{b.reportedBy}</td>
                  <td className="sub" style={{ maxWidth: 320 }}>{b.issue}</td>
                  <td><button className={`badge ${ST_BADGE[b.status]}`} style={{ border: 0, cursor: "pointer" }} onClick={() => cycleDept(b.id)} title="Click to advance">{ST_LABEL[b.status]}</button></td>
                  <td className="sub">{b.date}</td>
                  <td style={{ textAlign: "right" }}><button className="btn icon sm danger" onClick={() => setDeptBns((s) => s.filter((x) => x.id !== b.id))}><Icon name="trash" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {report && <ReportModal onClose={() => setReport(false)}
        onTask={(b) => { setTaskBns((s) => [{ ...b, id: "tb_" + Math.floor(Math.random() * 99999), status: "open", date: today() }, ...s]); setReport(false); flash("Task bottleneck reported."); }}
        onDept={(b) => { setDeptBns((s) => [{ ...b, id: "db_" + Math.floor(Math.random() * 99999), status: "open", date: today() }, ...s]); setReport(false); flash("Department bottleneck reported."); }} />}
      {toast && <div className="bn-toast"><Icon name="check" /> {toast}</div>}

      <style>{`
        .bn-empty{text-align:center;color:var(--muted);font-size:13.5px;padding:46px 16px}
        .bn-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .bn-toast svg{width:15px;height:15px;color:#7ee2a8}
        .modal .bn-l{font-size:12.5px;font-weight:600;color:#3f3f46;margin:0 0 6px;display:block}
      `}</style>
    </div>
  );
}

function ReportModal({ onClose, onTask, onDept }: {
  onClose: () => void;
  onTask: (b: Omit<TaskBn, "id" | "status" | "date">) => void;
  onDept: (b: Omit<DeptBn, "id" | "status" | "date">) => void;
}) {
  const [kind, setKind] = useState<"task" | "dept">("task");
  const [task, setTask] = useState("");
  const [department, setDepartment] = useState(DEPTS[0]);
  const [reportedBy, setReportedBy] = useState("");
  const [issue, setIssue] = useState("");

  const submit = () => {
    if (!reportedBy.trim() || !issue.trim()) return;
    if (kind === "task") { if (!task.trim()) return; onTask({ task: task.trim(), reportedBy: reportedBy.trim(), department, issue: issue.trim() }); }
    else onDept({ department, reportedBy: reportedBy.trim(), issue: issue.trim() });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Report Bottleneck</h3>
        <p className="sub" style={{ margin: "0 0 16px" }}>Flag a task or department issue for your team to resolve.</p>

        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={kind === "task" ? "active" : ""} onClick={() => setKind("task")}>Task (Employee)</button>
          <button className={kind === "dept" ? "active" : ""} onClick={() => setKind("dept")}>Department (Manager)</button>
        </div>

        {kind === "task" && (<><label className="bn-l">Task</label><input className="inp" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Which task?" autoFocus /></>)}

        <label className="bn-l" style={{ marginTop: 14 }}>Department</label>
        <select className="inp" value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>

        <label className="bn-l" style={{ marginTop: 14 }}>Reported by</label>
        <input className="inp" value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} placeholder="Your name" />

        <label className="bn-l" style={{ marginTop: 14 }}>Issue</label>
        <input className="inp" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the bottleneck…" />

        <div className="actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn brand" onClick={submit}><Icon name="check" /> Report</button></div>
      </div>
    </div>
  );
}
