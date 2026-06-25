import { supabase } from "./supabase";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiBase = API;

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(path: string, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();
  const safe = method === "GET";
  const auth = await authHeaders();
  let lastErr: unknown;
  // Retry only idempotent GETs on transient network errors (e.g. a dev-server
  // restart dropping an in-flight request). Never retry POST/PATCH/DELETE.
  for (let attempt = 0; attempt < (safe ? 2 : 1); attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        cache: "no-store",
        ...init,
        headers: { ...auth, ...(init?.headers || {}) },
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      return res.json();
    } catch (e) {
      lastErr = e;
      // Only retry genuine network failures (TypeError), not HTTP error responses.
      if (!safe || !(e instanceof TypeError)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw lastErr;
}

export type Me = { email: string | null; role: "admin" | "va" | "creator" | "none"; model_id: string | null; name: string };

export type DriveStatus = {
  configured: boolean;
  connected: boolean;
  db?: boolean | null;
  email?: string;
  company?: string;
  root_folder?: string;
  root?: { id: string; name: string; webViewLink?: string };
  shared_drive?: boolean;
};

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  child_count?: number;
};

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export type ModelRow = {
  id: string;
  name: string;
  legal_name?: string | null;
  username?: string | null;
  email?: string | null;
  location?: string | null;
  status: string;
  progress: number;
  drive_folder_id?: string | null;
  created_at?: string;
};

export const api = {
  me: (): Promise<Me> => req("/api/me"),
  status: (): Promise<DriveStatus> => req("/api/status"),
  tree: (): Promise<{ root: DriveItem | null; folders: DriveItem[] }> => req("/api/tree"),
  folder: (id: string): Promise<{ items: DriveItem[] }> => req(`/api/folder/${id}`),
  createModelFolder: (name: string, userId: string) =>
    req(`/api/model/folder?name=${encodeURIComponent(name)}&user_id=${encodeURIComponent(userId)}`, { method: "POST" }),
  createSubfolder: (parentId: string, name: string) =>
    req(`/api/folder/${parentId}/subfolder?name=${encodeURIComponent(name)}`, { method: "POST" }),
  moveFile: (fileId: string, dest: string) =>
    req(`/api/file/${fileId}/move?dest=${encodeURIComponent(dest)}`, { method: "POST" }),
  copyFile: (fileId: string, dest: string) =>
    req(`/api/file/${fileId}/copy?dest=${encodeURIComponent(dest)}`, { method: "POST" }),
  renameFile: (fileId: string, name: string) =>
    req(`/api/file/${fileId}/rename?name=${encodeURIComponent(name)}`, { method: "POST" }),
  trashFile: (fileId: string) => req(`/api/file/${fileId}/trash`, { method: "POST" }),
  contentUrl: (fileId: string) => `${API}/api/file/${fileId}/content`,
  downloadUrl: (fileId: string) => `${API}/api/file/${fileId}/content?download=1`,
  disconnect: () => req("/api/disconnect", { method: "POST" }),
  loginUrl: `${API}/auth/google/login`,

  // models (DB-backed)
  listModels: (): Promise<ModelRow[]> => req("/api/models"),
  createModel: (data: Partial<ModelRow>): Promise<ModelRow> =>
    req("/api/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  approveModel: (id: string): Promise<ModelRow> => req(`/api/models/${id}/approve`, { method: "POST" }),
  setupModelFolder: (id: string): Promise<ModelRow> => req(`/api/models/${id}/setup-folder`, { method: "POST" }),
  updateModel: (id: string, data: Partial<ModelRow>): Promise<ModelRow> =>
    req(`/api/models/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  deleteModel: (id: string) => req(`/api/models/${id}`, { method: "DELETE" }),

  // tasks (DB-backed)
  listTasks: (templates = false): Promise<TaskRow[]> => req(`/api/tasks?templates=${templates ? 1 : 0}`),
  createTask: (data: any): Promise<TaskRow> =>
    req("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  deleteTask: (id: string) => req(`/api/tasks/${id}`, { method: "DELETE" }),
  submitTask: (taskId: string, modelId: string) =>
    req(`/api/tasks/${taskId}/submit?model_id=${modelId}`, { method: "POST" }),
  reviewTask: (taskId: string, body: { model_id: string; status: string; review?: any }) =>
    req(`/api/tasks/${taskId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),

  // creator app view
  listModelTasks: (modelId: string): Promise<TaskRow[]> => req(`/api/models/${modelId}/tasks`),
  uploadFile: (folderId: string, file: File): Promise<DriveItem> => {
    const fd = new FormData();
    fd.append("file", file);
    return req(`/api/folder/${folderId}/upload`, { method: "POST", body: fd });
  },

  // statistics
  stats: (): Promise<Stats> => req("/api/stats"),

  // kanban (Office app)
  kanbanBoards: (): Promise<KanbanBoard[]> => req("/api/kanban/boards"),
  kanbanCreateBoard: (title: string, description?: string): Promise<KanbanBoard> =>
    req("/api/kanban/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description }) }),
  kanbanDeleteBoard: (id: string) => req(`/api/kanban/boards/${id}`, { method: "DELETE" }),
  kanbanBoard: (id: string): Promise<KanbanBoardFull> => req(`/api/kanban/boards/${id}`),
  kanbanCreateList: (boardId: string, title: string): Promise<KanbanList> =>
    req(`/api/kanban/boards/${boardId}/lists`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }),
  kanbanDeleteList: (id: string) => req(`/api/kanban/lists/${id}`, { method: "DELETE" }),
  kanbanCreateCard: (listId: string, title: string, description?: string): Promise<KanbanCard> =>
    req(`/api/kanban/lists/${listId}/cards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description }) }),
  kanbanDeleteCard: (id: string) => req(`/api/kanban/cards/${id}`, { method: "DELETE" }),
  kanbanMoveCard: (id: string, listId: string, position: number) =>
    req(`/api/kanban/cards/${id}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ list_id: listId, position }) }),

  // user management (admin)
  listUsers: (): Promise<UserRow[]> => req("/api/users"),
  createUser: (data: { email: string; password: string; role: string }): Promise<UserRow> =>
    req("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  setUserRole: (email: string, role: string) =>
    req("/api/users/role", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) }),
  deleteUser: (id: string, email: string) =>
    req(`/api/users/${id}?email=${encodeURIComponent(email)}`, { method: "DELETE" }),
};

export type Stats = {
  models_total: number;
  models_by_status: Record<string, number>;
  tasks_total: number;
  templates_total: number;
  tasks_by_type: Record<string, number>;
  tasks_by_priority: Record<string, number>;
  assignees_total: number;
  work_by_status: Record<string, number>;
  completion_pct: number;
  pending_review: number;
  overdue: number;
  avg_response_hours: number | null;
  models_by_month: Record<string, number>;
  tasks_created_by_month: Record<string, number>;
  tasks_completed_by_month: Record<string, number>;
  per_model: {
    id: string; name: string; status: string; created_at?: string | null;
    total: number; submitted: number; approved: number; changes: number;
  }[];
  recent: { title: string; model: string; status: string; submitted_at?: string | null; reviewed_at?: string | null }[];
};

export type KanbanCard = { id: string; list_id: string; title: string; description?: string | null; position: number };
export type KanbanList = { id: string; title: string; position: number; cards: KanbanCard[] };
export type KanbanBoard = { id: string; title: string; description?: string | null; created_at?: string; card_count?: number };
export type KanbanBoardFull = KanbanBoard & { lists: KanbanList[] };

export type UserRow = {
  id: string;
  email: string | null;
  role: "admin" | "va" | "creator" | "none";
  locked: boolean;
  is_self: boolean;
  model?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

export type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  tags?: string[];
  manager_notes?: string | null;
  extra_tips?: string | null;
  captions?: string | null;
  is_template: boolean;
  recurring: boolean;
  recurrence?: string | null;
  upload_type?: string | null;
  data?: any;
  created_at?: string;
  assignees?: { id: string; name: string; status?: string; upload_folder_id?: string | null; review?: any }[];
  upload_folder_id?: string | null;
  assignee_status?: string;     // creator view: this model's submission status
  review?: any;                 // creator view: manager's per-slot review
};

export function fmtSize(bytes?: string) {
  if (!bytes) return "";
  const n = Number(bytes);
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 2 : 0)} ${u[i]}`;
}

export function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
