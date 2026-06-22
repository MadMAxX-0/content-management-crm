"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV = [
  { group: "Workspace" },
  { href: "/", icon: "grid", label: "Overview" },
  { href: "/users", icon: "users", label: "Manage Users", soon: true },
  { href: "/models", icon: "star", label: "Manage Models" },
  { group: "Content" },
  { href: "/tasks", icon: "clip", label: "Model Tasks" },
  { href: "/drive", icon: "folder", label: "Drive Manager" },
  { href: "/templates", icon: "folders", label: "Drive Templates", soon: true },
  { href: "/stats", icon: "pie", label: "Statistics", soon: true },
  { group: "Creator" },
  { href: "/app", icon: "phone", label: "Creator App" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="side">
      <div className="acct">
        <div className="avatar">Y</div>
        <div>
          <div className="nm">Youtopia CRM</div>
          <div className="rl">Admin</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((n, i) =>
          "group" in n ? (
            <div className="lbl" key={i}>{n.group}</div>
          ) : (
            <Link
              key={n.href}
              href={n.soon ? "#" : n.href!}
              className={`${path === n.href ? "active" : ""} ${n.soon ? "soon" : ""}`}
              onClick={(e) => n.soon && e.preventDefault()}
            >
              <Icon name={n.icon!} />
              {n.label}
              {n.soon && <span className="pill">Soon</span>}
            </Link>
          )
        )}
        <div className="divider" />
        <Link href="#" className="soon"><Icon name="spark" /> X AI <span className="pill">AI</span></Link>
      </nav>
    </aside>
  );
}
