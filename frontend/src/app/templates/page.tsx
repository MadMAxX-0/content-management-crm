"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

// ── Model ─────────────────────────────────────────────────────────────────────
type Rating = "SFW" | "NSFW";
type Cat = "None" | "Videos" | "Photos" | "Legal";
type Node = {
  id: string;
  parentId: string | null;
  name: string;
  x: number;
  y: number;
  rating: Rating;
  category: Cat;
  access: boolean;
  accessOpen: boolean;
  roles: string[];
  departments: string[];
};
type Template = { id: string; name: string; date: string; nodes: Node[] };

const ROLES = ["Default Employee", "Default Manager", "Default Admin"];
const DEPARTMENTS = [
  "Editors", "AI editors", "Model Managers", "IG management", "Twitter", "Threads",
  "Mass DMs", "Cupid management", "Onlyfans management", "Meta ads management",
  "YouTube management", "HR department", "Executive team",
];
const CATS: Cat[] = ["None", "Videos", "Photos", "Legal"];
const CARD_W = 232;
let SEQ = 100;
const uid = () => "n" + ++SEQ;

const mkNode = (p: Partial<Node>): Node => ({
  id: uid(), parentId: null, name: "New Folder", x: 320, y: 60, rating: "SFW",
  category: "None", access: true, accessOpen: false, roles: [], departments: [], ...p,
});

// ── Seed templates ────────────────────────────────────────────────────────────
function seedTest(): Node[] {
  const root = mkNode({ id: "t-root", name: "Root folder", x: 300, y: 30 });
  const vids = mkNode({ id: "t-vid", parentId: root.id, name: "Videos", category: "Videos", x: 120, y: 250 });
  const legal = mkNode({ id: "t-leg", parentId: root.id, name: "Legal", category: "Legal", x: 500, y: 250 });
  const photos = mkNode({ id: "t-pho", parentId: legal.id, name: "New Folder", category: "Photos", x: 540, y: 470 });
  return [root, vids, legal, photos];
}
function seedJasmine(): Node[] {
  const root = mkNode({ id: "j-root", name: "Root folder", x: 300, y: 40 });
  const f = mkNode({ id: "j-nf", parentId: root.id, name: "New Folder", rating: "NSFW", category: "None", x: 360, y: 300 });
  return [root, f];
}
const INITIAL_TEMPLATES: Template[] = [
  { id: "tpl-test", name: "Test", date: "6/18/2026", nodes: seedTest() },
  { id: "tpl-jasmine", name: "Jasmine", date: "6/20/2026", nodes: seedJasmine() },
];

const clone = (nodes: Node[]): Node[] => nodes.map((n) => ({ ...n, roles: [...n.roles], departments: [...n.departments] }));

export default function ModelTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [selId, setSelId] = useState<string>("tpl-test");
  const [name, setName] = useState("Test");
  const [nodes, setNodes] = useState<Node[]>(() => clone(INITIAL_TEMPLATES[0].nodes));
  const [zoom, setZoom] = useState(1);

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── Drag ──
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const onMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    const nx = d.ox + (e.clientX - d.sx) / zoomRef.current;
    const ny = d.oy + (e.clientY - d.sy) / zoomRef.current;
    setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, x: nx, y: ny } : n)));
  }, []);
  const onUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }, [onMove]);
  const startDrag = (e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    dragRef.current = { id: node.id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Node ops ──
  const patch = (id: string, p: Partial<Node>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const addChild = (parent: Node) => {
    const kids = nodes.filter((n) => n.parentId === parent.id).length;
    setNodes((ns) => [...ns, mkNode({ parentId: parent.id, x: parent.x + (kids - 0.5) * 60, y: parent.y + 250 })]);
  };
  const duplicate = (node: Node) =>
    setNodes((ns) => [...ns, mkNode({ ...node, id: uid(), name: `${node.name} copy`, x: node.x + 40, y: node.y + 40 })]);
  const removeNode = (id: string) => {
    // remove the node and all of its descendants
    setNodes((ns) => {
      const kill = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const n of ns) if (n.parentId && kill.has(n.parentId) && !kill.has(n.id)) { kill.add(n.id); grew = true; }
      }
      return ns.filter((n) => !kill.has(n.id));
    });
  };
  const toggleChip = (node: Node, kind: "roles" | "departments", val: string) => {
    const list = node[kind];
    patch(node.id, { [kind]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val] } as Partial<Node>);
  };

  // ── Template ops ──
  const load = (t: Template) => { setSelId(t.id); setName(t.name); setNodes(clone(t.nodes)); };
  const newTemplate = () => { setSelId(""); setName(""); setNodes([mkNode({ name: "Root folder", x: 320, y: 60 })]); };
  const save = () => {
    const today = new Date().toLocaleDateString("en-US");
    if (selId) {
      setTemplates((ts) => ts.map((t) => (t.id === selId ? { ...t, name: name || t.name, nodes: clone(nodes) } : t)));
    } else {
      const id = "tpl_" + Date.now();
      setTemplates((ts) => [...ts, { id, name: name || "Untitled", date: today, nodes: clone(nodes) }]);
      setSelId(id);
    }
  };
  const cancel = () => { const t = templates.find((x) => x.id === selId); if (t) load(t); else newTemplate(); };
  const delTemplate = (id: string) => {
    if (!confirm("Delete this template?")) return;
    setTemplates((ts) => ts.filter((t) => t.id !== id));
    if (selId === id) newTemplate();
  };

  return (
    <div className="content">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mt-ic"><Icon name="folders" /></span>
          <div>
            <h1 style={{ margin: 0 }}>Model Templates</h1>
            <p>Design and manage folder structure templates for model drives.</p>
          </div>
        </div>
      </div>

      <div className="mt-studio">
        <div className="mt-bar">
          <div className="mt-bar-t"><Icon name="gear" /> Template Studio</div>
          <div className="btn-row">
            <button className="mt-btn" onClick={cancel}>Cancel</button>
            <button className="mt-btn primary" onClick={save}><Icon name="upload" /> Save Template</button>
          </div>
        </div>

        <div className="mt-body">
          {/* LEFT */}
          <div className="mt-left">
            <div className="mt-panel">
              <div className="mt-ph"><span><Icon name="folders" /> SAVED TEMPLATES</span>
                <button className="mt-btn xs" onClick={newTemplate}><Icon name="plus" /> New</button></div>
              <div className="mt-tpl-list">
                {templates.map((t) => (
                  <div key={t.id} className={`mt-tpl ${selId === t.id ? "on" : ""}`} onClick={() => load(t)}>
                    <div>
                      <div className="mt-tpl-n">{t.name} {selId === t.id && <span className="mt-dot" />}</div>
                      <div className="mt-tpl-d"><Icon name="clock" /> {t.date}</div>
                    </div>
                    <button className="mt-trash" title="Delete" onClick={(e) => { e.stopPropagation(); delTemplate(t.id); }}><Icon name="trash" /></button>
                  </div>
                ))}
                {templates.length === 0 && <div className="mt-empty">No saved templates.</div>}
              </div>
            </div>

            <div className="mt-panel">
              <div className="mt-ph"><span>TEMPLATE DETAILS</span></div>
              <label className="mt-l">Template Name</label>
              <input className="mt-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., VIP Onboarding" />
            </div>
          </div>

          {/* CANVAS */}
          <div className="mt-canvas">
            <div className="mt-world" style={{ transform: `scale(${zoom})` }}>
              <svg className="mt-links">
                {nodes.filter((n) => n.parentId).map((n) => {
                  const p = nodes.find((x) => x.id === n.parentId);
                  if (!p) return null;
                  const x1 = p.x + CARD_W / 2, y1 = p.y + 150;
                  const x2 = n.x + CARD_W / 2, y2 = n.y + 8;
                  return <path key={n.id} d={`M ${x1} ${y1} C ${x1} ${y1 + 60}, ${x2} ${y2 - 60}, ${x2} ${y2}`} className="mt-link" />;
                })}
              </svg>

              {nodes.map((node) => (
                <div key={node.id} className={`mt-node ${node.rating === "NSFW" ? "nsfw" : ""}`} style={{ left: node.x, top: node.y }}>
                  <div className="mt-node-h" onMouseDown={(e) => startDrag(e, node)}>
                    <span className="mt-fic"><Icon name="folder" /></span>
                    <div className="mt-node-tt">
                      <input className="mt-node-name" value={node.name} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => patch(node.id, { name: e.target.value })} />
                      <div className="mt-node-sub">FOLDER</div>
                    </div>
                    <button className="mt-mini" title="Duplicate" onMouseDown={(e) => e.stopPropagation()} onClick={() => duplicate(node)}><Icon name="copy" /></button>
                    {node.parentId && <button className="mt-mini del" title="Delete" onMouseDown={(e) => e.stopPropagation()} onClick={() => removeNode(node.id)}><Icon name="x" /></button>}
                  </div>

                  <div className="mt-row">
                    <span className="mt-cap">CONTENT RATING</span>
                    <button className={`mt-rate ${node.rating === "NSFW" ? "nsfw" : "sfw"}`} onClick={() => patch(node.id, { rating: node.rating === "SFW" ? "NSFW" : "SFW" })}>
                      {node.rating === "NSFW" && <Icon name="shield" />}{node.rating}
                    </button>
                  </div>

                  <div className="mt-cat">
                    <span className="mt-cap">DIRECTORY CATEGORY</span>
                    <select className="mt-select" value={node.category} onChange={(e) => patch(node.id, { category: e.target.value as Cat })}>
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="mt-row access" onClick={() => patch(node.id, { accessOpen: !node.accessOpen })}>
                    <span className="mt-cap"><Icon name="globe" /> ACCESS</span>
                    <button className={`mt-sw ${node.access ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); patch(node.id, { access: !node.access }); }}><span /></button>
                  </div>

                  {node.accessOpen && (
                    <div className="mt-access">
                      <div className="mt-grp"><Icon name="users" /> ROLES</div>
                      <div className="mt-chips">
                        {ROLES.map((r) => (
                          <button key={r} className={`mt-chip ${node.roles.includes(r) ? "on" : ""}`} onClick={() => toggleChip(node, "roles", r)}>{r}</button>
                        ))}
                      </div>
                      <div className="mt-grp"><Icon name="building" /> DEPARTMENTS</div>
                      <div className="mt-chips">
                        {DEPARTMENTS.map((d) => (
                          <button key={d} className={`mt-chip ${node.departments.includes(d) ? "on" : ""}`} onClick={() => toggleChip(node, "departments", d)}>{d}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-foot">
                    <button className="mt-add" title="Add child folder" onClick={() => addChild(node)}><Icon name="plus" /></button>
                    <button className="mt-dup" title="Duplicate folder" onClick={() => duplicate(node)}><Icon name="copy" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-zoom">
              <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}><Icon name="minus" /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}><Icon name="plus" /></button>
              <button className="alt" onClick={() => setZoom(1)} title="Reset zoom"><Icon name="listcheck" /></button>
              <button className="alt" title="Layout"><Icon name="grid" /></button>
            </div>
          </div>
        </div>
      </div>

      <style>{studioCss}</style>
    </div>
  );
}

const studioCss = `
.mt-ic{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#f3f4f6;color:#52525b;flex:none}
.mt-ic svg{width:24px;height:24px}
.mt-studio{background:#14161b;border:1px solid #23262d;border-radius:16px;overflow:hidden;color:#e6e7ea}
.mt-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #23262d}
.mt-bar-t{display:flex;align-items:center;gap:9px;font-weight:600;font-size:14px}
.mt-bar-t svg{width:17px;height:17px;color:#9aa0aa}
.mt-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #2c3038;background:#1b1e24;color:#e6e7ea;border-radius:9px;padding:8px 13px;font-size:13px;font-weight:550;cursor:pointer}
.mt-btn:hover{background:#23272f}
.mt-btn.primary{background:#e9eaee;color:#16181d;border-color:#e9eaee}
.mt-btn.primary svg{color:#16181d}
.mt-btn.xs{padding:5px 10px;font-size:12px}
.mt-btn svg{width:15px;height:15px}
.mt-body{display:grid;grid-template-columns:320px 1fr;min-height:560px}
.mt-left{padding:18px;display:flex;flex-direction:column;gap:16px;border-right:1px solid #23262d}
.mt-panel{background:#0f1115;border:1px solid #23262d;border-radius:14px;padding:16px}
.mt-ph{display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:.05em;color:#8b909a;font-weight:600;margin-bottom:12px}
.mt-ph svg{width:14px;height:14px;vertical-align:-2px;margin-right:5px}
.mt-tpl-list{display:flex;flex-direction:column;gap:10px;min-height:120px}
.mt-tpl{display:flex;align-items:center;justify-content:space-between;background:#1b1e24;border:1px solid #2a2e36;border-radius:11px;padding:12px 13px;cursor:pointer}
.mt-tpl:hover{border-color:#3a3f49}
.mt-tpl.on{border-color:#5b5bd6;box-shadow:0 0 0 1px #5b5bd6 inset}
.mt-tpl-n{font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:7px}
.mt-dot{width:7px;height:7px;border-radius:50%;background:#37b46e}
.mt-tpl-d{display:flex;align-items:center;gap:5px;color:#8b909a;font-size:11.5px;margin-top:3px}
.mt-tpl-d svg{width:12px;height:12px}
.mt-trash{background:none;border:0;color:#7c828c;cursor:pointer;padding:4px;display:flex}
.mt-trash:hover{color:#e5484d}.mt-trash svg{width:15px;height:15px}
.mt-empty{color:#7c828c;font-size:12.5px;padding:10px 2px}
.mt-l{font-size:12px;color:#8b909a;font-weight:600;display:block;margin-bottom:6px}
.mt-input{width:100%;background:#1b1e24;border:1px solid #2a2e36;border-radius:9px;padding:9px 12px;color:#e6e7ea;font-size:13.5px;outline:0}
.mt-input:focus{border-color:#5b5bd6}
.mt-canvas{position:relative;overflow:auto;background:#0b0c0f;background-image:radial-gradient(#1b1e24 1px,transparent 1px);background-size:22px 22px}
.mt-world{position:relative;width:1200px;height:1000px;transform-origin:0 0}
.mt-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.mt-link{stroke:#39404b;stroke-width:2;fill:none}
.mt-node{position:absolute;width:${CARD_W}px;background:#15181e;border:1px solid #2a2e36;border-radius:14px;box-shadow:0 12px 30px -16px rgba(0,0,0,.7)}
.mt-node.nsfw{border-color:#5a2a2e;box-shadow:0 0 0 1px rgba(229,72,77,.35) inset,0 12px 30px -16px rgba(0,0,0,.7)}
.mt-node-h{display:flex;align-items:center;gap:9px;padding:12px;cursor:grab;border-bottom:1px solid #23262d}
.mt-node-h:active{cursor:grabbing}
.mt-fic{display:inline-flex;color:#6f8cff}.mt-fic svg{width:20px;height:20px}
.mt-node.nsfw .mt-fic{color:#e5677a}
.mt-node-tt{flex:1;min-width:0}
.mt-node-name{width:100%;background:none;border:0;color:#fff;font-weight:700;font-size:14px;outline:0;padding:0}
.mt-node-sub{font-size:9.5px;letter-spacing:.08em;color:#7c828c;font-weight:600;margin-top:1px}
.mt-mini{background:none;border:0;color:#9aa0aa;cursor:pointer;padding:3px;display:flex;border-radius:6px}
.mt-mini:hover{background:#23272f;color:#fff}.mt-mini.del:hover{color:#e5484d}.mt-mini svg{width:15px;height:15px}
.mt-row{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid #1f2228}
.mt-row.access{cursor:pointer}
.mt-cap{font-size:10px;letter-spacing:.06em;color:#8b909a;font-weight:700;display:inline-flex;align-items:center;gap:6px}
.mt-cap svg{width:13px;height:13px}
.mt-rate{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:7px;padding:4px 10px;font-size:10.5px;font-weight:800;letter-spacing:.04em;cursor:pointer}
.mt-rate.sfw{background:#16382a;color:#46d18a}
.mt-rate.nsfw{background:#3a1a1d;color:#ff5c6a}.mt-rate svg{width:13px;height:13px}
.mt-cat{padding:11px 12px;border-bottom:1px solid #1f2228}
.mt-cat .mt-cap{display:block;margin-bottom:7px}
.mt-select{width:100%;background:#1b1e24;border:1px solid #2a2e36;border-radius:8px;padding:7px 10px;color:#e6e7ea;font-size:12.5px;outline:0;cursor:pointer}
.mt-sw{width:36px;height:20px;border-radius:20px;border:0;background:#3a3f49;position:relative;cursor:pointer;transition:background .15s;padding:0;flex:none}
.mt-sw.on{background:#2f6df6}
.mt-sw span{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
.mt-sw.on span{left:18px}
.mt-access{padding:12px;border-bottom:1px solid #1f2228}
.mt-grp{font-size:10px;letter-spacing:.05em;color:#8b909a;font-weight:700;display:flex;align-items:center;gap:6px;margin:4px 0 8px}
.mt-grp svg{width:13px;height:13px}
.mt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.mt-chip{background:#1b1e24;border:1px solid #2a2e36;color:#c7ccd4;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:550;cursor:pointer}
.mt-chip:hover{border-color:#3a3f49}
.mt-chip.on{background:#5b5bd6;border-color:#5b5bd6;color:#fff}
.mt-foot{display:flex;justify-content:center;gap:10px;padding:0;position:relative;height:0}
.mt-add,.mt-dup{position:absolute;top:-16px;width:30px;height:30px;border-radius:50%;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 10px -3px rgba(0,0,0,.6)}
.mt-add{left:calc(50% - 34px);background:#17a35a;color:#fff}
.mt-add:hover{background:#1cb866}
.mt-dup{left:calc(50% + 4px);background:#23272f;color:#c7ccd4}
.mt-dup:hover{background:#2c313a}
.mt-add svg,.mt-dup svg{width:16px;height:16px}
.mt-zoom{position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:4px;background:#15181e;border:1px solid #2a2e36;border-radius:11px;padding:5px 8px}
.mt-zoom button{background:none;border:0;color:#c7ccd4;cursor:pointer;padding:5px;display:flex;border-radius:7px}
.mt-zoom button:hover{background:#23272f;color:#fff}
.mt-zoom button.alt{border-left:1px solid #2a2e36;border-radius:0;padding-left:8px;margin-left:2px}
.mt-zoom span{font-size:12px;color:#c7ccd4;min-width:38px;text-align:center;font-weight:600}
.mt-zoom svg{width:15px;height:15px}
@media(max-width:920px){.mt-body{grid-template-columns:1fr}.mt-left{border-right:0;border-bottom:1px solid #23262d}}
`;
