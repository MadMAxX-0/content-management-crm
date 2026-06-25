"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import KanbanApp from "./KanbanApp";
import TodoApp from "./TodoApp";

type App = { key: string; name: string; desc: string; icon: string; cat: string; href?: string; inline?: boolean };

// Files maps to the existing Drive Manager; Kanboard opens inline; rest are placeholders.
const APPS: App[] = [
  { key: "files", name: "Files", desc: "Universal file manager with preview and sharing", icon: "folders", cat: "Productivity", href: "/drive" },
  { key: "whiteboard", name: "Whiteboard", desc: "Collaborative canvas for ideas and planning", icon: "edit", cat: "Design" },
  { key: "kanboard", name: "Kanboard", desc: "Trello-style project management boards", icon: "kanban", cat: "Productivity", inline: true },
  { key: "calendar", name: "Calendar", desc: "Schedule events and manage your calendars", icon: "cal", cat: "Productivity" },
  { key: "note", name: "Note", desc: "Take notes and manage your notes", icon: "note", cat: "Productivity" },
  { key: "todo", name: "Todo", desc: "Manage tasks and to-do lists with collaboration", icon: "listcheck", cat: "Productivity", inline: true },
];

export default function OfficePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<App | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => { if (!open) setActive(null); }, [open]);

  const openApp = (a: App) => {
    if (a.href) { onClose(); router.push(a.href); }
    else if (a.inline) setActive(a);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div className={`office-back ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`office-panel ${open ? "open" : ""} ${active ? "wide" : ""}`} aria-hidden={!open}>
        <div className="office-head">
          <div className="oh-title"><Icon name={active ? active.icon : "layers"} /> {active ? active.name : "Office Suite"}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        {active ? (
          <>
            <div className="office-crumb">
              <button className="btn sm" onClick={() => setActive(null)}>
                <Icon name="chevr" style={{ transform: "rotate(180deg)" }} /> Back to Apps
              </button>
              <span className="oc-crumb-ic"><Icon name={active.icon} /></span>
              <b>{active.name}</b>
            </div>
            <div className="office-app">
              {active.key === "kanboard" && <KanbanApp />}
              {active.key === "todo" && <TodoApp />}
            </div>
          </>
        ) : (
          <>
            <div className="office-sub">
              <span className="os-ic"><Icon name="layers" /></span>
              <div>
                <div className="os-name">Office Suite</div>
                <div className="sub">{APPS.length} applications</div>
              </div>
            </div>
            <div className="office-grid">
              {APPS.map((a) => (
                <div className="office-card" key={a.key}>
                  <div className="oc-top">
                    <span className="oc-grip"><Icon name="grip" /></span>
                    <span className="oc-ic"><Icon name={a.icon} /></span>
                    <div className="oc-tt">
                      <div className="oc-name">{a.name}</div>
                      <div className="oc-desc">{a.desc}</div>
                    </div>
                  </div>
                  <div className="oc-foot">
                    <span className="oc-cat">{a.cat}</span>
                    {a.href || a.inline
                      ? <button className="btn dark sm" onClick={() => openApp(a)}>Open</button>
                      : <span className="badge b-amber">Soon</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>,
    document.body
  );
}
