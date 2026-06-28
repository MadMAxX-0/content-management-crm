"use client";
import Icon from "@/components/Icon";

// Shared placeholder for CRM modules that are on the roadmap but not built yet.
export default function ComingSoon({ title, icon = "clock", sub }: { title: string; icon?: string; sub?: string }) {
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1><Icon name={icon} /> {title}</h1>
          <p>{sub || "This module is part of the CRM roadmap."}</p>
        </div>
      </div>

      <div className="card pad">
        <div className="empty" style={{ padding: "64px 16px" }}>
          <Icon name={icon} />
          <div style={{ fontWeight: 600, color: "#3f3f46", marginTop: 8 }}>Available soon</div>
          <div className="sub">This section is under construction. Check back later.</div>
        </div>
      </div>
    </div>
  );
}
