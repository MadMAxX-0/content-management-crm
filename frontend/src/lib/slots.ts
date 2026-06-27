import { TaskRow } from "./api";

export const TYPE_LABEL: Record<string, string> = {
  detailed: "Detailed Media", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long Video", images_videos: "Media Gallery", swipe: "Swipe",
  content_set: "Content Set",
};

export const TYPE_ICON: Record<string, string> = {
  detailed: "image", video: "video", ppv_sequence: "heart",
  ppv_long: "video", images_videos: "gallery", swipe: "image",
  content_set: "gallery",
};

// ── Content Set: sets → sections → groups (each with references + an upload slot) ──
export type SetGroup = { title: string; count: number; kind: string; refs: any[]; ref_link?: string; folderName: string };
export type SetSection = { title: string; kind: string; target: number; groups: SetGroup[] };
export type SetView = { setNo: number; sections: SetSection[] };

export function contentSetLayout(t: TaskRow): { sets: SetView[]; setCount: number; note: string } {
  const d = t.data || {};
  const setCount = Math.max(1, Number(d.sets) || 1);
  const defs: any[] = d.sections || [];
  const sets: SetView[] = [];
  for (let n = 1; n <= setCount; n++) {
    let gi = 0; // flat group index within this set — must match backend folder naming
    const sections: SetSection[] = defs.map((sec: any) => ({
      title: sec.title || "Section",
      kind: sec.kind || "photo",
      target: Number(sec.target) || 0,
      groups: (sec.groups || []).map((g: any) => {
        const idx = gi++;
        const title = g.title || "Group";
        return {
          title, count: Number(g.count) || 1, kind: sec.kind || "photo",
          refs: g.refs || [], ref_link: g.ref_link || "",
          folderName: `Set ${n} · ${idx + 1}. ${title}`,
        };
      }),
    }));
    sets.push({ setNo: n, sections });
  }
  return { sets, setCount, note: d.set_note || "" };
}

export type Slot = { label: string; folderName: string; instruction?: string; outfit?: string; location?: string };

// The deliverable slots for a task, matched 1:1 to the Drive subfolders the backend auto-creates.
export function slotsForTask(t: TaskRow): Slot[] {
  const d = t.data || {};
  switch (t.type) {
    case "ppv_sequence": {
      const out: Slot[] = [{ label: "Teasing", folderName: "Teasing", instruction: d.teasing }];
      (d.parts || []).forEach((p: any, i: number) =>
        out.push({ label: `Part ${i + 1}`, folderName: `Part ${i + 1}`, instruction: p?.desc }));
      return out;
    }
    case "detailed":
      return (d.media || []).map((m: any, i: number) => ({
        label: `Media ${i + 1}`, folderName: `Media ${i + 1}`,
        instruction: m?.description, outfit: m?.outfit, location: m?.location,
      }));
    case "ppv_long":
      return [{ label: "Video", folderName: "Video" }, { label: "Pictures", folderName: "Pictures" }];
    case "images_videos":
      return [{ label: "Images", folderName: "Images" }, { label: "Videos", folderName: "Videos" }];
    case "content_set": {
      const out: Slot[] = [];
      contentSetLayout(t).sets.forEach((s) =>
        s.sections.forEach((sec) =>
          sec.groups.forEach((g) =>
            out.push({ label: `${g.title} — Set ${s.setNo}`, folderName: g.folderName, instruction: g.kind === "clip" ? `${g.count} clip(s)` : `${g.count} piece(s)` }))));
      return out;
    }
    default:
      return [];
  }
}

// Submission status → display label + badge class
export function statusMeta(s?: string): { label: string; cls: string } {
  switch (s) {
    case "submitted": return { label: "Submitted", cls: "b-soft" };
    case "approved": return { label: "Approved", cls: "b-green" };
    case "changes_requested": return { label: "Changes requested", cls: "b-amber" };
    case "in_progress": return { label: "In Progress", cls: "b-soft" };
    default: return { label: "Todo", cls: "b-amber" };
  }
}
