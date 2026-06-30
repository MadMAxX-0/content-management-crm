"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";

// ── Mock model ────────────────────────────────────────────────────────────────
const ENDPOINT = "https://api.luminacrm.app/v1/reels/analytics/export";

type Reel = { id: string; account: string; caption: string; views: number; likes: number; comments: number; engagement: number; kind: "reel" | "post" };
type Tracked = { id: string; handle: string; platform: string; followers: number; reels: number; lastSync: string };
type ApiKey = { id: string; name: string; key: string; created: string };

const TRACKED: Tracked[] = [
  { id: "ta1", handle: "@avastone", platform: "Instagram", followers: 184000, reels: 42, lastSync: "2026-06-29" },
  { id: "ta2", handle: "@miarivers", platform: "TikTok", followers: 96000, reels: 31, lastSync: "2026-06-28" },
];
const REELS: Reel[] = [
  { id: "r1", account: "@avastone", caption: "Golden hour BTS", views: 142000, likes: 18900, comments: 412, engagement: 4.2, kind: "reel" },
  { id: "r2", account: "@miarivers", caption: "Gym routine clip", views: 88000, likes: 9600, comments: 233, engagement: 3.1, kind: "reel" },
  { id: "r3", account: "@avastone", caption: "Q&A reel", views: 51000, likes: 7100, comments: 188, engagement: 5.0, kind: "reel" },
];
const POSTS: Reel[] = [
  { id: "p1", account: "@avastone", caption: "Beach carousel", views: 61000, likes: 8200, comments: 140, engagement: 3.8, kind: "post" },
  { id: "p2", account: "@miarivers", caption: "Lookbook", views: 33000, likes: 4100, comments: 90, engagement: 2.9, kind: "post" },
];

const TABS = [
  { key: "tracked", label: "Tracked Accounts", icon: "users" },
  { key: "reels", label: "Reels", icon: "video" },
  { key: "posts", label: "Posts & Carousels", icon: "image" },
  { key: "insights", label: "Insights", icon: "trendup" },
  { key: "api", label: "API Export", icon: "download" },
  { key: "trash", label: "Trash", icon: "trash" },
  { key: "ext", label: "Extension", icon: "layers" },
] as const;

const fmtN = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const genKey = () => "sk_live_" + Array.from({ length: 28 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");

export default function SocialMediaAnalyticsPage() {
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("ext");
  const [guideOpen, setGuideOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

  const copy = async (text: string, label: string) => { try { await navigator.clipboard.writeText(text); flash(`${label} copied.`); } catch { flash("Copy failed."); } };
  const createKey = () => { setKeys((s) => [{ id: "k_" + Math.floor(Math.random() * 99999), name: `Key ${s.length + 1}`, key: genKey(), created: new Date().toLocaleDateString("en-US") }, ...s]); flash("API key created."); };

  return (
    <div className="content">
      {/* Tab bar */}
      <div className="sma-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}><Icon name={t.icon} /> {t.label}</button>
        ))}
      </div>

      {tab === "ext" && <ExtensionTab flash={flash} guideOpen={guideOpen} setGuideOpen={setGuideOpen} />}
      {tab === "api" && <ApiTab keys={keys} onCreate={createKey} onRevoke={(id) => setKeys((s) => s.filter((k) => k.id !== id))} onCopy={copy} />}
      {tab === "tracked" && <TrackedTab />}
      {tab === "reels" && <ReelGrid title="Reels" sub="Instagram Reels & TikTok videos" items={REELS} />}
      {tab === "posts" && <ReelGrid title="Posts & Carousels" sub="Feed posts and carousels" items={POSTS} />}
      {tab === "insights" && <InsightsTab />}
      {tab === "trash" && <div className="card pad"><div className="empty" style={{ padding: "70px 16px" }}><Icon name="trash" /><div className="sub">Trash is empty.</div></div></div>}

      {toast && <div className="sma-toast"><Icon name="check" /> {toast}</div>}
      <style>{`
        .sma-tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--line2);margin-bottom:18px;padding-bottom:2px}
        .sma-tabs button{display:inline-flex;align-items:center;gap:7px;border:0;background:none;color:var(--muted);font-size:13px;font-weight:550;padding:9px 12px;border-radius:9px 9px 0 0;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-3px}
        .sma-tabs button:hover{color:var(--ink)}
        .sma-tabs button.on{color:var(--ink);border-bottom-color:var(--brand)}
        .sma-tabs svg{width:15px;height:15px}
        .sma-code{background:#0f1115;color:#d6dae1;border-radius:10px;padding:14px 16px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;overflow:auto;white-space:pre;margin:6px 0 4px}
        .sma-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;border-radius:11px;padding:10px 16px;font-size:13px;font-weight:550;display:flex;align-items:center;gap:8px;box-shadow:var(--sh-lg);z-index:120}
        .sma-toast svg{width:15px;height:15px;color:#7ee2a8}
        .sma-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
        .sma-rcard{border:1px solid var(--line2);border-radius:13px;overflow:hidden}
        .sma-thumb{height:120px;background:linear-gradient(135deg,#ede9fe,#e3d9fb);display:flex;align-items:center;justify-content:center;color:#8b7cf6}
        .sma-thumb svg{width:26px;height:26px}
        .sma-rbody{padding:12px}
        .sma-rstats{display:flex;gap:12px;margin-top:8px;font-size:11.5px;color:var(--muted2)}
        .sma-kvlist code{background:#f3f4f6;border-radius:5px;padding:1px 6px;font-size:12px}
        .sma-kvlist li{margin:5px 0;font-size:13px}
      `}</style>
    </div>
  );
}

// ── Extension tab ─────────────────────────────────────────────────────────────
function ExtensionTab({ flash, guideOpen, setGuideOpen }: { flash: (m: string) => void; guideOpen: boolean; setGuideOpen: (v: boolean) => void }) {
  const KPIS = [
    { label: "Active", icon: "wifi", n: "0", tone: "green" },
    { label: "Tasks Pushed", icon: "note", n: "0", tone: "blue" },
    { label: "Storage Used", icon: "database", n: "0 B", tone: "amber" },
    { label: "Connections", icon: "phone", n: "0", tone: "iris" },
  ];
  return (
    <>
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <div><div className="panel-title"><Icon name="layers" /> Browser Extension</div><div className="panel-sub">Push Instagram Reels and TikTok videos directly as model tasks</div></div>
          <div className="btn-row"><button className="btn" onClick={() => flash("Refreshed.")}><Icon name="refresh" /> Refresh</button><button className="btn" onClick={() => flash("Extension download is mocked.")}><Icon name="download" /> Download Extension</button></div>
        </div>
        <div className="kpi-grid" style={{ marginTop: 6 }}>
          {KPIS.map((k) => (
            <div className={`kpi t-${k.tone}`} key={k.label}><span className="k-ic"><Icon name={k.icon} /></span><span className="k-n">{k.n}</span><span className="k-l">{k.label}</span></div>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="k-ic" style={{ background: "#f3f4f6", color: "#52525b", width: 38, height: 38, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="layers" /></span>
          <div><div className="u-name">Extension Not Detected</div><div className="sub">Install the extension and refresh this page</div></div>
        </div>
        <button className="btn" onClick={() => flash("Extension download is mocked.")}><Icon name="download" /> Download</button>
      </div>

      <div className="card pad" style={{ marginBottom: 18 }}>
        <button onClick={() => setGuideOpen(!guideOpen)} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "none", border: 0, cursor: "pointer", padding: 0 }}>
          <div style={{ textAlign: "left" }}><div className="panel-title">Installation Guide</div><div className="panel-sub">How to install and set up the Chrome extension</div></div>
          <Icon name={guideOpen ? "chevu" : "chevd"} />
        </button>
        {guideOpen && (
          <ol className="sma-kvlist" style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--ink2)" }}>
            <li>Download the extension package using the button above.</li>
            <li>Open <code>chrome://extensions</code> and enable Developer mode.</li>
            <li>Click “Load unpacked” and select the extracted folder.</li>
            <li>Pin the extension and sign in with your CRM account.</li>
            <li>Refresh this page — your connection will appear below.</li>
          </ol>
        )}
      </div>

      <div className="card pad">
        <div className="panel-title">Connected Extensions</div>
        <div className="panel-sub">No extensions connected yet</div>
        <div className="empty" style={{ padding: "60px 16px" }}><Icon name="wifioff" /><div style={{ fontWeight: 600, color: "#3f3f46" }}>No extensions connected</div><div className="sub">Install the extension and sign in to get started</div></div>
      </div>
    </>
  );
}

// ── API Export tab ────────────────────────────────────────────────────────────
function ApiTab({ keys, onCreate, onRevoke, onCopy }: { keys: ApiKey[]; onCreate: () => void; onRevoke: (id: string) => void; onCopy: (t: string, l: string) => void }) {
  const curlAll = `curl -X POST ${ENDPOINT} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{}'`;
  const curlFilter = `curl -X POST ${ENDPOINT} \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"filters":{"minViews":10000}}'`;
  const python = `import requests\n\nresponse = requests.post(\n    '${ENDPOINT}',\n    headers={\n        'Authorization': 'Bearer YOUR_API_KEY',\n        'Content-Type': 'application/json',\n    },\n    json={\n        'filters': {'minViews': 10000, 'minEngagementRate': 3.0},\n        'sortBy': 'engagementRate',\n        'sortOrder': 'desc',\n    },\n)\ndata = response.json()\nprint(data['data']['reels'])`;
  const guideText = `Endpoint: ${ENDPOINT}\nAuth: Authorization: Bearer YOUR_API_KEY\n\n${curlAll}\n\n${python}`;

  return (
    <>
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <div><div className="panel-title"><Icon name="key" /> API Export Keys</div><div className="panel-sub">Manage API keys for programmatic access to reels analytics export</div></div>
          <button className="btn" onClick={onCreate}><Icon name="key" /> Create API Key</button>
        </div>
        {keys.length === 0 ? (
          <div className="empty" style={{ padding: "50px 16px" }}>
            <Icon name="key" /><div style={{ fontWeight: 600, color: "#3f3f46" }}>No API keys</div>
            <div className="sub">Create an API key to start exporting reels data programmatically</div>
            <button className="btn" style={{ marginTop: 8 }} onClick={onCreate}><Icon name="plus" /> Create Your First API Key</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {keys.map((k) => (
              <div key={k.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid var(--line2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ minWidth: 0 }}><div className="u-name">{k.name} <span className="sub">· {k.created}</span></div><div style={{ fontFamily: "ui-monospace,monospace", fontSize: 12.5, color: "var(--muted)" }}>{k.key.slice(0, 14)}••••••••</div></div>
                <span className="btn-row">
                  <button className="btn icon sm" title="Copy key" onClick={() => onCopy(k.key, "API key")}><Icon name="copy" /></button>
                  <button className="btn icon sm danger" title="Revoke" onClick={() => onRevoke(k.id)}><Icon name="trash" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card pad">
        <div className="panel-h">
          <div><div className="panel-title"><Icon name="code" /> API Usage Guide</div><div className="panel-sub">Learn how to use the export API endpoint with your API key</div></div>
          <button className="btn" onClick={() => onCopy(guideText, "API usage guide")}><Icon name="copy" /> Copy API Usage Guide</button>
        </div>

        <h4 style={{ margin: "16px 0 6px" }}>Endpoint</h4>
        <div className="sma-code">{ENDPOINT}</div>

        <h4 style={{ margin: "18px 0 6px" }}>Authentication</h4>
        <div className="sub" style={{ marginBottom: 6 }}>Include your API key in the Authorization header:</div>
        <div className="sma-code">Authorization: Bearer YOUR_API_KEY</div>

        <h4 style={{ margin: "18px 0 6px" }}>Examples</h4>
        <div className="sub" style={{ margin: "8px 0 4px", fontWeight: 600 }}>1. Export all reels</div>
        <div className="sma-code">{curlAll}</div>
        <div className="sub" style={{ margin: "12px 0 4px", fontWeight: 600 }}>2. Export with filters</div>
        <div className="sma-code">{curlFilter}</div>
        <div className="sub" style={{ margin: "12px 0 4px", fontWeight: 600 }}>3. Python</div>
        <div className="sma-code">{python}</div>

        <h4 style={{ margin: "18px 0 6px" }}>Available Filters</h4>
        <ul className="sma-kvlist" style={{ margin: 0, paddingLeft: 18 }}>
          <li><code>accountIds</code> — Array of account IDs to filter</li>
          <li><code>dateFrom</code> — Start date (ISO format)</li>
          <li><code>dateTo</code> — End date (ISO format)</li>
          <li><code>minViews</code> / <code>maxViews</code> — Min/Max views</li>
          <li><code>minLikes</code> / <code>maxLikes</code> — Min/Max likes</li>
          <li><code>minEngagementRate</code> / <code>maxEngagementRate</code> — Min/Max engagement rate (%)</li>
        </ul>

        <h4 style={{ margin: "18px 0 6px" }}>Sort Options</h4>
        <div className="sub" style={{ marginBottom: 4 }}>Available sort fields:</div>
        <ul className="sma-kvlist" style={{ margin: 0, paddingLeft: 18 }}>
          <li><code>postedAt</code> — Post date</li>
          <li><code>views</code> — View count</li>
          <li><code>likes</code> — Like count</li>
          <li><code>comments</code> — Comment count</li>
          <li><code>engagementRate</code> — Engagement rate</li>
        </ul>
      </div>
    </>
  );
}

// ── Other tabs ────────────────────────────────────────────────────────────────
function TrackedTab() {
  return (
    <div className="card pad">
      <div className="panel-title"><Icon name="users" /> Tracked Accounts ({TRACKED.length})</div>
      <div className="panel-sub">Instagram & TikTok accounts being tracked</div>
      <table className="tbl" style={{ marginTop: 6 }}>
        <thead><tr><th>Account</th><th>Platform</th><th>Followers</th><th>Reels</th><th>Last sync</th></tr></thead>
        <tbody>{TRACKED.map((a) => (
          <tr key={a.id}><td className="u-name">{a.handle}</td><td><span className="badge b-type">{a.platform}</span></td><td>{fmtN(a.followers)}</td><td>{a.reels}</td><td className="sub">{a.lastSync}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ReelGrid({ title, sub, items }: { title: string; sub: string; items: Reel[] }) {
  return (
    <div className="card pad">
      <div className="panel-title"><Icon name={title === "Reels" ? "video" : "image"} /> {title} ({items.length})</div>
      <div className="panel-sub">{sub}</div>
      <div className="sma-grid" style={{ marginTop: 8 }}>
        {items.map((r) => (
          <div className="sma-rcard" key={r.id}>
            <div className="sma-thumb"><Icon name={r.kind === "reel" ? "video" : "image"} /></div>
            <div className="sma-rbody">
              <div className="u-name" style={{ fontSize: 13 }}>{r.caption}</div>
              <div className="sub">{r.account}</div>
              <div className="sma-rstats"><span>{fmtN(r.views)} views</span><span>{fmtN(r.likes)} likes</span><span>{r.engagement}%</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsTab() {
  const all = [...REELS, ...POSTS];
  const totalViews = all.reduce((s, r) => s + r.views, 0);
  const avgEng = (all.reduce((s, r) => s + r.engagement, 0) / all.length).toFixed(1);
  const top = all.slice().sort((a, b) => b.views - a.views)[0];
  return (
    <div className="card pad">
      <div className="panel-title"><Icon name="trendup" /> Insights</div>
      <div className="panel-sub">Aggregated performance across tracked content</div>
      <div className="kpi-grid" style={{ marginTop: 8 }}>
        <div className="kpi"><div className="kpi-top">Total Views</div><div className="kpi-val">{fmtN(totalViews)}</div></div>
        <div className="kpi"><div className="kpi-top">Avg. Engagement</div><div className="kpi-val">{avgEng}%</div></div>
        <div className="kpi"><div className="kpi-top">Pieces Tracked</div><div className="kpi-val">{all.length}</div></div>
        <div className="kpi"><div className="kpi-top">Top Content</div><div className="kpi-val" style={{ fontSize: 15, marginTop: 14 }}>{top?.caption}</div></div>
      </div>
    </div>
  );
}
