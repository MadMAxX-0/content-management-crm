"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { useAuth } from "./auth-context";
import OfficePanel from "./OfficePanel";

const NAV = [
  { group: "Workspace" },
  { href: "/", icon: "grid", label: "Overview" },
  { href: "/users", icon: "users", label: "Manage Users" },
  { href: "/models", icon: "star", label: "Manage Models" },
  { group: "Content" },
  { href: "/tasks", icon: "clip", label: "Model Tasks" },
  { href: "/gallery", icon: "gallery", label: "Gallery" },
  { href: "/drive", icon: "folder", label: "Drive Manager" },
  { href: "/templates", icon: "folders", label: "Drive Templates", soon: true },
  { href: "/stats", icon: "pie", label: "Statistics" },
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
  const nav = isCreator
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
