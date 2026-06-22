"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { api, DriveItem, FOLDER_MIME, ModelRow } from "@/lib/api";

export default function FolderSelect({
  model,
  value,
  onChange,
}: {
  model: ModelRow;
  value?: string;
  onChange: (folderId: string, label: string) => void;
}) {
  const [q, setQ] = useState("");
  if (!model.drive_folder_id) {
    return (
      <div className="tf-card">
        <div className="tf-head"><Icon name="user" /> {model.name} <span className="em">no Drive folder</span></div>
        <div className="sub" style={{ marginTop: 8 }}>This model has no Drive folder yet — uploads will use the default once created.</div>
      </div>
    );
  }
  return (
    <div className="tf-card">
      <div className="tf-head"><Icon name="user" /> {model.name} {model.email && <span className="em">({model.email})</span>}</div>
      <div className="search-bar" style={{ marginTop: 10, marginBottom: 0 }}>
        <Icon name="search" /><input placeholder="Search folders…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tf-tree">
        <Node
          item={{ id: model.drive_folder_id, name: `${model.name}`, mimeType: FOLDER_MIME }}
          depth={0}
          defaultOpen
          value={value}
          filter={q}
          onPick={(id, label) => onChange(id, label)}
        />
      </div>
    </div>
  );
}

function Node({
  item, depth, defaultOpen, value, filter, onPick,
}: {
  item: DriveItem; depth: number; defaultOpen?: boolean; value?: string; filter: string;
  onPick: (id: string, label: string) => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [kids, setKids] = useState<DriveItem[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const load = async () => {
    try {
      const r = await api.folder(item.id);
      setKids((r.items || []).filter((k) => k.mimeType === FOLDER_MIME));
    } catch {
      setKids([]); // transient fetch drop — show empty rather than crash
    }
  };
  useEffect(() => {
    if (defaultOpen && kids === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const n = !open; setOpen(n);
    if (n && kids === null) await load();
  };
  const startCreate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCreating(true); setOpen(true);
    if (kids === null) await load();
  };
  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    const f = await api.createSubfolder(item.id, name);
    setNewName(""); setCreating(false);
    await load();
    onPick(f.id, f.name); // auto-select the new folder
  };
  const visible = !filter || item.name.toLowerCase().includes(filter.toLowerCase());
  return (
    <>
      {visible && (
        <div className={`tf-row ${value === item.id ? "sel" : ""}`} style={{ paddingLeft: 8 + depth * 14 }} onClick={() => onPick(item.id, item.name)}>
          <span className="chev" onClick={toggle}><Icon name={open ? "chevd" : "chevr"} /></span>
          <span className="fi"><Icon name="folder" /></span>
          <span style={{ flex: 1 }}>{item.name}</span>
          {value === item.id && <Icon name="check" style={{ width: 14, height: 14, color: "var(--brand)" }} />}
          <button className="tf-add" title="New subfolder" onClick={startCreate}><Icon name="folderplus" /></button>
        </div>
      )}
      {open && creating && (
        <div className="tf-new" style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
          <Icon name="folder" style={{ width: 15, height: 15, color: "#d4a72c" }} />
          <input autoFocus value={newName} placeholder="Folder name"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }} />
          <button className="btn brand mini" onClick={create}>Create</button>
          <button className="btn mini" onClick={() => { setCreating(false); setNewName(""); }}><Icon name="x" /></button>
        </div>
      )}
      {open && kids && kids.map((k) => (
        <Node key={k.id} item={k} depth={depth + 1} value={value} filter={filter} onPick={onPick} />
      ))}
    </>
  );
}
