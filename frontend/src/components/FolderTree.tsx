"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { api, DriveItem, FOLDER_MIME, fmtDate, fmtSize } from "@/lib/api";

type Cbs = {
  onErr?: (m: string) => void;
  onPreview?: (f: DriveItem) => void;
  onPick?: (mode: "move" | "copy", f: DriveItem) => void;
};

export default function FolderTree({
  root,
  label,
  reloadParent,
  ...cbs
}: { root: DriveItem; label?: string; reloadParent?: () => void } & Cbs) {
  return (
    <FolderNode
      item={{ ...root, name: label || root.name }}
      defaultOpen
      reloadParent={reloadParent}
      {...cbs}
    />
  );
}

function Menu({ children }: { children: React.ReactNode }) {
  return <div className="menu" onClick={(e) => e.stopPropagation()}>{children}</div>;
}

function FolderNode({
  item,
  defaultOpen,
  reloadParent,
  onErr,
  onPreview,
  onPick,
}: { item: DriveItem; defaultOpen?: boolean; reloadParent?: () => void } & Cbs) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [kids, setKids] = useState<DriveItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.folder(item.id);
      setKids(r.items || []);
    } catch (e: any) { onErr?.(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (defaultOpen && kids === null) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && kids === null) await load();
  };

  const fileCount = kids ? kids.filter((k) => k.mimeType !== FOLDER_MIME).length : null;

  const act = async (fn: () => Promise<any>, after: "self" | "parent") => {
    setMenu(false);
    try {
      await fn();
      if (after === "self") { await load(); setOpen(true); }
      else reloadParent?.();
    } catch (e: any) { onErr?.(e.message); }
  };
  const newFolder = () => {
    const name = window.prompt("New folder name");
    if (name) act(() => api.createSubfolder(item.id, name), "self");
  };
  const rename = () => {
    const name = window.prompt("Rename folder", item.name);
    if (name && name !== item.name) act(() => api.renameFile(item.id, name), "parent");
  };
  const del = () => {
    if (window.confirm(`Move "${item.name}" to Trash?`)) act(() => api.trashFile(item.id), "parent");
  };

  return (
    <>
      <div className="treerow">
        <button className="chev" onClick={toggle}><Icon name={open ? "chevd" : "chevr"} /></button>
        <span className="nm fld"><Icon name="folder" /><span>{item.name}</span></span>
        {fileCount !== null && <span className="fc">{fileCount} files</span>}
        <div className="menuwrap">
          <button className="kebab" onClick={() => setMenu((v) => !v)}><Icon name="dots" /></button>
          {menu && (
            <>
              <div className="backdrop" onClick={() => setMenu(false)} />
              <Menu>
                {item.webViewLink && (
                  <button onClick={() => { setMenu(false); window.open(item.webViewLink, "_blank"); }}>
                    <Icon name="external" /> Open in Google Drive
                  </button>
                )}
                <button onClick={newFolder}><Icon name="folderplus" /> New folder</button>
                <button onClick={rename}><Icon name="edit" /> Rename</button>
                <div className="sep" />
                <button className="danger" onClick={del}><Icon name="trash" /> Delete folder</button>
              </Menu>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="indent">
          {loading && kids === null ? (
            <div className="treerow"><span className="meta"><Icon name="refresh" className="spin" style={{ width: 14, height: 14 }} /> Loading…</span></div>
          ) : kids && kids.length === 0 ? (
            <div className="treerow"><span className="meta">Empty</span></div>
          ) : (
            (kids || []).map((k) =>
              k.mimeType === FOLDER_MIME ? (
                <FolderNode key={k.id} item={k} reloadParent={load} onErr={onErr} onPreview={onPreview} onPick={onPick} />
              ) : (
                <FileRow key={k.id} item={k} reloadParent={load} onErr={onErr} onPreview={onPreview} onPick={onPick} />
              )
            )
          )}
        </div>
      )}
    </>
  );
}

function FileRow({
  item,
  reloadParent,
  onErr,
  onPreview,
  onPick,
}: { item: DriveItem; reloadParent?: () => void } & Cbs) {
  const [menu, setMenu] = useState(false);
  const act = async (fn: () => Promise<any>) => {
    setMenu(false);
    try { await fn(); reloadParent?.(); } catch (e: any) { onErr?.(e.message); }
  };
  const rename = () => {
    const name = window.prompt("Rename file", item.name);
    if (name && name !== item.name) act(() => api.renameFile(item.id, name));
  };
  const del = () => { if (window.confirm(`Move "${item.name}" to Trash?`)) act(() => api.trashFile(item.id)); };
  const download = () => {
    setMenu(false);
    const a = document.createElement("a");
    a.href = api.downloadUrl(item.id);
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="treerow">
      <span style={{ width: 16 }} />
      <span className="nm file" style={{ cursor: onPreview ? "pointer" : "default" }} onClick={() => onPreview?.(item)}>
        <Icon name="image" />
        <span>{item.name}</span>
      </span>
      <span className="meta">{fmtDate(item.modifiedTime)}</span>
      {item.size && <span className="meta">{fmtSize(item.size)}</span>}
      <div className="menuwrap">
        <button className="kebab" onClick={() => setMenu((v) => !v)}><Icon name="dots" /></button>
        {menu && (
          <>
            <div className="backdrop" onClick={() => setMenu(false)} />
            <Menu>
              {item.webViewLink && (
                <button onClick={() => { setMenu(false); window.open(item.webViewLink, "_blank"); }}>
                  <Icon name="external" /> Open in Google Drive
                </button>
              )}
              <button onClick={() => { setMenu(false); onPreview?.(item); }}><Icon name="eye" /> Preview</button>
              <button onClick={download}><Icon name="download" /> Download</button>
              <button onClick={() => { setMenu(false); onPick?.("copy", item); }}><Icon name="copy" /> Copy</button>
              <button onClick={() => { setMenu(false); onPick?.("move", item); }}><Icon name="move" /> Move</button>
              <button onClick={rename}><Icon name="edit" /> Rename</button>
              <div className="sep" />
              <button className="danger" onClick={del}><Icon name="trash" /> Delete</button>
            </Menu>
          </>
        )}
      </div>
    </div>
  );
}
