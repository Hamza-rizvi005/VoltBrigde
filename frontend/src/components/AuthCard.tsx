import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const nav = useNavigate();
  const { authenticate, loading } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || busy) return;
    setBusy(true); setError("");
    try { await authenticate(mode, email, password, name || "My home"); await nav({ to: mode === "register" ? "/app/setup" : "/app/dashboard" }); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };
  return (
    <div className="auth-page">
      <div className="auth-layout">
      <section className="auth-story" aria-label="Home energy planning">
        <p className="eyebrow">A LITTLE PLANNING. A CALMER HOME.</p>
        <h2>Make room for <br />a brighter day.</h2>
        <p>Bring your solar, battery and daily routines together in one household plan.</p>
        <div className="auth-solar-art" aria-hidden="true">
          <div className="auth-sun" />
          <div className="auth-horizon" />
          <div className="auth-panel-grid" />
        </div>
        <div className="auth-principles"><span>Plan around sunshine</span><span>Prepare for power cuts</span><span>Keep essentials in mind</span></div>
      </section>
      <form onSubmit={submit} className="auth-form glass w-full rounded-2xl p-7">
        <div className="flex items-center justify-between"><Logo /><span className="text-xs text-primary">Local account</span></div>
        <h1 className="mt-6 text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-3 text-xs text-muted-foreground">Your home is saved on this computer’s local server. Use at least 12 characters for your password.</p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 space-y-4">
          {mode === "register" && (
            <div><Label htmlFor="n">Household name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Khan home" /></div>
          )}
          <div><Label htmlFor="e">Email</Label><Input id="e" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></div>
          <div><Label htmlFor="p">Password</Label><Input id="p" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={12} maxLength={128} /></div>
        </div>
        <Button disabled={busy || loading} type="submit" className="mt-6 w-full bg-sun">{mode === "login" ? "Log in" : "Continue to setup"}</Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? <>New here? <Link to="/register" className="text-primary">Create account</Link></> : <>Have an account? <Link to="/login" className="text-primary">Log in</Link></>}
        </p>
      </form>
      </div>
    </div>
  );
}
