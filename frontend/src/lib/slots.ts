import { TaskRow } from "./api";

export const TYPE_LABEL: Record<string, string> = {
  detailed: "Detailed Media", video: "Video", ppv_sequence: "PPV Sequence",
  ppv_long: "PPV Long Video", images_videos: "Media Gallery", swipe: "Swipe",
};

export const TYPE_ICON: Record<string, string> = {
  detailed: "image", video: "video", ppv_sequence: "heart",
  ppv_long: "video", images_videos: "gallery", swipe: "image",
};

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
