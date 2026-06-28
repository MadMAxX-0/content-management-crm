"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { useAuth } from "./auth-context";
import OfficePanel from "./OfficePanel";

type NavItem =
  | { group: string }
  | { href: string; icon: string; label: string; soon?: boolean; pill?: string };

const NAV: NavItem[] = [
  { group: "Workspace" },
  { href: "/", icon: "grid", label: "Overview" },
  { href: "/x-ai-studio", icon: "spark", label: "X AI Studio", pill: "Soon" },
  { href: "/users", icon: "users", label: "Manage Users" },
  { href: "/models", icon: "star", label: "Manage Models" },
  { href: "/register-models", icon: "uplus", label: "Register Models", pill: "Soon" },
  { href: "/departments", icon: "building", label: "Manage Departments", pill: "Mock" },
  { href: "/projects", icon: "folders", label: "Manage Projects", pill: "Soon" },
  { group: "Content" },
  { href: "/tasks", icon: "clip", label: "Model Tasks" },
  { href: "/create-tasks", icon: "plus", label: "Create Tasks", pill: "Soon" },
  { href: "/custom-roles", icon: "user", label: "Custom Roles", pill: "Mock" },
  { href: "/signatures", icon: "edit", label: "Signatures", pill: "Soon" },
  { href: "/media-library", icon: "image", label: "Media Library", pill: "Soon" },
  { href: "/gallery", icon: "gallery", label: "Gallery" },
  { href: "/drive", icon: "folder", label: "Drive Manager" },
  { href: "/templates", icon: "folders", label: "Model Drive Templates", pill: "Mock" },
  { href: "/sop-manager", icon: "note", label: "SOP Manager", pill: "Mock" },
  { href: "/deep-links", icon: "link", label: "Deep Links", pill: "Mock" },
  { group: "Analytics" },
  { href: "/social-media-tracker", icon: "share", label: "Social Media Tracker", pill: "Soon" },
  { href: "/onlyfans-statistics", icon: "dollar", label: "OnlyFans Statistics", pill: "Soon" },
  { href: "/stats", icon: "pie", label: "Analytics & Statistics" },
  { href: "/social-media-analytics", icon: "trendup", label: "Social Media Analytics", pill: "Soon" },
  { href: "/model-tasks-statistics", icon: "kanban", label: "Model Tasks Statistics", pill: "Soon" },
  { href: "/bottlenecks", icon: "alert", label: "Bottlenecks", pill: "Soon" },
  { href: "/reporting-bots", icon: "send", label: "Reporting Bots", pill: "Soon" },
  { href: "/activity-logs", icon: "listcheck", label: "Activity Logs", pill: "Soon" },
  { href: "/clock-history", icon: "clock", label: "Clock History", pill: "Soon" },
  { group: "System" },
  { href: "/time-clock", icon: "clock", label: "Time Clock", pill: "Soon" },
  { href: "/apps", icon: "download", label: "Apps", pill: "Soon" },
  { href: "/notifications", icon: "bell", label: "Notifications & Support", pill: "Soon" },
  { href: "/settings", icon: "gear", label: "Settings", pill: "Soon" },
  { group: "Creator" },
  { href: "/app", icon: "phone", label: "Creator App" },
];

export default function Sidebar({ open }: { open?: boolean }) {
  const path = usePathname();
  const { me, signOut, authEnabled } = useAuth();
  const [officeOpen, setOfficeOpen] = useState(false);
  const isCreator = me?.role === "creator";
  const isVa = me?.role === "va";

  // Creators see only their own app; VAs see only Model Tasks — minimal rails.
  const nav: NavItem[] = isCreator
    ? [{ group: "Creator" }, { href: "/app", icon: "phone", label: "My Tasks" }]
    : isVa
    ? [{ group: "Content" }, { href: "/tasks", icon: "clip", label: "Model Tasks" }]
    : NAV;

  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <div className="acct">
        <div className="avatar">{(me?.name || "Y").charAt(0).toUpperCase()}</div>
        <div>
          <div className="nm">{isCreator || isVa ? me?.name : "Youtopia CRM"}</div>
          <div className="rl">{isCreator ? "Creator" : isVa ? "VA" : "Admin"}</div>
        </div>
      </div>
      <nav className="nav">
        {nav.map((n, i) =>
          "group" in n ? (
            <div className="lbl" key={i}>{n.group}</div>
          ) : (
            <Link
              key={n.href}
              href={n.soon ? "#" : n.href}
              className={`${path === n.href ? "active" : ""} ${n.soon ? "soon" : ""}`}
              onClick={(e) => n.soon && e.preventDefault()}
            >
              <Icon name={n.icon} />
              {n.label}
              {(n.pill || n.soon) && <span className={`pill ${n.pill === "Mock" ? "mock" : ""}`}>{n.pill || "Soon"}</span>}
            </Link>
          )
        )}
        {!isCreator && !isVa && (
          <>
            <div className="divider" />
            <button className="nav-office" onClick={() => setOfficeOpen(true)}>
              <Icon name="layers" /> Office
            </button>
            <Link href="#" className="soon"><Icon name="spark" /> X AI <span className="pill">AI</span></Link>
          </>
        )}
        {authEnabled && (
          <button className="nav-signout" onClick={signOut}>
            <Icon name="logout" /> Sign out
          </button>
        )}
      </nav>
      {!isCreator && !isVa && <OfficePanel open={officeOpen} onClose={() => setOfficeOpen(false)} />}
    </aside>
  );
}
