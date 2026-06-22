import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Auth is "on" only once both Supabase values are configured. Until then the app
// runs open (matches the backend, which also stays open until its keys are set).
export const authEnabled = !!(url && key);

export const supabase: SupabaseClient | null = authEnabled
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
