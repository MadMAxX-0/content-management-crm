"use client";
import { useEffect } from "react";
import Icon from "./Icon";
import { api, DriveItem } from "@/lib/api";

export default function PreviewModal({ file, onClose }: { file: DriveItem; onClose: () => void }) {
  const isImg = (file.mimeType || "").startsWith("image/");
  const heic = /heic|heif/i.test(file.mimeType || "") || /\.he(ic|if)$/i.test(file.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="preview" onClick={(e) => e.stopPropagation()}>
        <div className="ph">
          <span className="title">{file.name}</span>
          <div className="pa">
            <a className="pbtn" href={api.downloadUrl(file.id)} title="Download"><Icon name="download" /></a>
            {file.webViewLink && (
              <a className="pbtn" href={file.webViewLink} target="_blank" rel="noreferrer" title="Open in Drive"><Icon name="external" /></a>
            )}
            <button className="pbtn" onClick={onClose} title="Close"><Icon name="x" /></button>
          </div>
        </div>
        <div className="pb">
          {isImg && !heic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={api.contentUrl(file.id)} alt={file.name} />
          ) : (
            <div className="noimg">
              <Icon name="image" style={{ width: 40, height: 40 }} />
              <div style={{ marginTop: 10 }}>No inline preview for this file type{heic ? " (HEIC)" : ""}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
