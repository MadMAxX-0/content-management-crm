"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, Me } from "@/lib/api";
import { supabase, authEnabled } from "@/lib/supabase";
import { AuthContext } from "./auth-context";
import Icon from "./Icon";
import Sidebar from "./Sidebar";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}

// Routes a creator is allowed to see. Everything else is admin-only.
const isCreatorPath = (p: string) => p === "/app" || p.startsWith("/app/");

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const path = usePathname();
  const router = useRouter();

  const refresh = async () => {
    let session = false;
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      session = !!data.session;
    }
    setHasSession(session);
    try { setMe(await api.me()); } catch { setMe(null); }
    setReady(true);
  };

  useEffect(() => {
    refresh();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setMe(null); setHasSession(false);
    router.replace("/login");
  };

  // Redirect logic once we know the auth state
  useEffect(() => {
    if (!ready || !authEnabled) return;
    if (!hasSession) {
      if (path !== "/login") router.replace("/login");
      return;
    }
    if (me?.role === "creator" && !isCreatorPath(path)) router.replace("/app");
    if (me?.role === "admin" && path === "/login") router.replace("/");
  }, [ready, hasSession, me, path, router]);

  const value = { me, signOut, authEnabled };

  // Auth off → run open with the full shell
  if (!authEnabled) return <AuthContext.Provider value={value}><Shell>{children}</Shell></AuthContext.Provider>;

  if (!ready) {
    return <div className="auth-screen"><Icon name="refresh" className="spin" /> Loading…</div>;
  }

  // Not signed in → only the (bare) login page renders
  if (!hasSession) {
    return <AuthContext.Provider value={value}>{path === "/login" ? children : null}</AuthContext.Provider>;
  }

  // Signed in but no matching role
  if (me?.role === "none") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h2>No access</h2>
          <p>Your account <b>{me.email}</b> isn’t linked to a creator or admin yet. Ask your manager to set it up.</p>
          <button className="btn brand" onClick={signOut}><Icon name="logout" /> Sign out</button>
        </div>
      </div>
    );
  }

  // Creator on an admin path (mid-redirect) → render nothing briefly
  if (me?.role === "creator" && !isCreatorPath(path)) return null;

  return <AuthContext.Provider value={value}><Shell>{children}</Shell></AuthContext.Provider>;
}
