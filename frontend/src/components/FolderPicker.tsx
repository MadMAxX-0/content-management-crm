"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { api, DriveItem, FOLDER_MIME } from "@/lib/api";

export default function FolderPicker({
  root,
  rootLabel,
  mode,
  fileName,
  onCancel,
  onPick,
}: {
  root: DriveItem;
  rootLabel: string;
  mode: "move" | "copy";
  fileName: string;
  onCancel: () => void;
  onPick: (folderId: string) => void;
}) {
  const [sel, setSel] = useState<string>(root.id);
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3>{mode === "move" ? "Move file" : "Copy file"}</h3>
        <p className="sub" style={{ margin: "2px 0 0" }}>
          {mode === "move" ? "Move" : "Copy"} <b style={{ color: "var(--ink)" }}>{fileName}</b> to a destination folder.
        </p>
        <div className="picker-tree">
          <PickNode item={{ ...root, name: rootLabel }} sel={sel} setSel={setSel} defaultOpen />
        </div>
        <div className="actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn brand" onClick={() => onPick(sel)}>
            <Icon name={mode === "move" ? "move" : "copy"} /> {mode === "move" ? "Move here" : "Copy here"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PickNode({
  item,
  sel,
  setSel,
  defaultOpen,
}: {
  item: DriveItem;
  sel: string;
  setSel: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [kids, setKids] = useState<DriveItem[] | null>(null);
  const load = async () => {
    const r = await api.folder(item.id);
    setKids((r.items || []).filter((k) => k.mimeType === FOLDER_MIME));
  };
  useEffect(() => {
    if (defaultOpen && kids === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = async () => {
    const n = !open;
    setOpen(n);
    if (n && kids === null) await load();
  };
  return (
    <>
      <div className={`pk ${sel === item.id ? "sel" : ""}`} onClick={() => setSel(item.id)}>
        <span className="chev" onClick={(e) => { e.stopPropagation(); toggle(); }}>
          <Icon name={open ? "chevd" : "chevr"} />
        </span>
        <span className="fld"><Icon name="folder" /></span>
        <span style={{ flex: 1 }}>{item.name}</span>
      </div>
      {open && kids && kids.length > 0 && (
        <div style={{ paddingLeft: 18 }}>
          {kids.map((k) => <PickNode key={k.id} item={k} sel={sel} setSel={setSel} />)}
        </div>
      )}
    </>
  );
}
