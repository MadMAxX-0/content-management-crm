"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/Icon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setErr("Login isn’t configured yet."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message);
    // success → AuthGate's auth listener redirects by role
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="avatar">Y</div>
          <div><div className="nm">Youtopia CRM</div><div className="rl">Sign in to your account</div></div>
        </div>

        {err && <div className="note" style={{ marginBottom: 14 }}>{err}</div>}

        <label className="fld-l">Email</label>
        <input className="inp" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />

        <label className="fld-l" style={{ marginTop: 12 }}>Password</label>
        <input className="inp" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required />

        <button className="btn brand" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
          {busy ? <Icon name="refresh" className="spin" /> : <Icon name="logout" />} Sign in
        </button>
      </form>
    </div>
  );
}
