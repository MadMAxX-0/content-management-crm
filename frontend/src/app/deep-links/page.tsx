"use client";
import { useState } from "react";
import Icon from "@/components/Icon";

// Static placeholder data — Deep Links is a prepared UI (no backend yet).
type Link = {
  id: string;
  name: string;
  kind: string;
  online: boolean;
  clicks: number;
  ctr: string;
  url: string;
};

const LINKS: Link[] = [
  { id: "l1", name: "Sample Page", kind: "Redirect Link", online: true, clicks: 0, ctr: "0 CTR", url: "xcelerator.click/apsfefe" },
];

const KPIS = [
  { icon: "link", label: "Total Links", n: "1", sub: "0 models assigned", tone: "iris" },
  { icon: "note", label: "Landing Pages", n: "0", sub: "0% of total links", tone: "blue" },
  { icon: "external", label: "Redirects", n: "1", sub: "100% of total links", tone: "green" },
  { icon: "globe", label: "Domains", n: "4", sub: "Active domains configured", tone: "amber" },
];

export default function DeepLinksPage() {
  const [tab, setTab] = useState<"links" | "templates">("links");
  const [view, setView] = useState<"list" | "grid">("list");
  const [q, setQ] = useState("");

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name="link" /> Deep Links</h1>
          <p>Manage your deep links and landing pages.</p>
        </div>
        <div className="btn-row">
          <button className="btn"><Icon name="globe" /> Add Domain <span className="badge b-soft">4</span></button>
          <button className="btn"><Icon name="pie" /> Quota <span className="badge b-todo">0%</span></button>
          <button className="btn dark icon"><Icon name="plus" /></button>
        </div>
      </div>

      {/* KPI cards — same style as Statistics */}
      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        {KPIS.map((k) => (
          <div className={`kpi t-${k.tone}`} key={k.label}>
            <div className="kpi-top">{k.label}<Icon name={k.icon} /></div>
            <div className="kpi-val">{k.n}</div>
            <div className="kpi-sub"><span className="dot" /> {k.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar: tab toggle (left) + view toggle (right) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div className="btn-row">
          <button className={`pill-btn ${tab === "links" ? "active" : ""}`} onClick={() => setTab("links")}><Icon name="link" /> Deep Links</button>
          <button className={`pill-btn ${tab === "templates" ? "active" : ""}`} onClick={() => setTab("templates")}><Icon name="layers" /> Templates</button>
        </div>
        <div className="btn-row">
          <button className={`pill-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}><Icon name="listcheck" /> List</button>
          <button className={`pill-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}><Icon name="grid" /> Grid</button>
          <button className="btn icon" title="Refresh"><Icon name="refresh" /></button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="search-bar"><Icon name="search" /><input placeholder="Search links…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn"><Icon name="user" /> All Models <Icon name="chevd" /></button>
        <button className="btn"><Icon name="tag" /> Tag <Icon name="chevd" /></button>
      </div>

      {/* Table */}
      <div className="card pad">
        <div className="panel-title" style={{ marginBottom: 2 }}><Icon name="link" /> Deep Links ({LINKS.length})</div>
        <div className="panel-sub">Manage your deep links, landing pages, and redirects.</div>

        {LINKS.length === 0 ? (
          <div className="empty"><Icon name="link" /><div className="sub">No links yet.</div></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Link</th><th>Analytics</th><th>URL</th><th>Campaign</th>
                <th>Model</th><th>Tags</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {LINKS.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="btn icon sm" style={{ pointerEvents: "none" }}><Icon name="external" /></span>
                      <div>
                        <div className="u-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {l.name}
                          {l.online && <span className="dot" style={{ color: "#37b46e" }} />}
                        </div>
                        <div className="sub">{l.kind}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="u-name">{l.clicks}</span> <span className="sub">{l.ctr}</span></td>
                  <td>
                    <span className="badge b-todo" style={{ gap: 8, maxWidth: 220 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.url}</span>
                      <Icon name="copy" />
                    </span>
                  </td>
                  <td><button className="btn sm ghost"><Icon name="flag" /> No campaign</button></td>
                  <td><button className="btn sm ghost"><Icon name="user" /> Assign model</button></td>
                  <td><button className="btn sm ghost"><Icon name="tag" /> Add tags</button></td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-flex", gap: 4 }}>
                      <button className="btn icon sm" title="Preview"><Icon name="eye" /></button>
                      <button className="btn icon sm" title="Analytics"><Icon name="trendup" /></button>
                      <button className="btn icon sm" title="Open"><Icon name="external" /></button>
                      <button className="btn icon sm" title="Copy link"><Icon name="copy" /></button>
                      <button className="btn icon sm" title="Duplicate"><Icon name="folders" /></button>
                      <button className="btn icon sm danger" title="Delete"><Icon name="trash" /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
