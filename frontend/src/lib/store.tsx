import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Appliance, PowerCut, System } from "./energy";
import { demoAppliances, demoCuts, demoSystem } from "./demo-data";
import { api, type SavedEvent } from "./api";

export type State = { userName: string; system: System; appliances: Appliance[]; cuts: PowerCut[]; events: SavedEvent[]; setupDone: boolean };
type User = { id: string; email: string };
type Envelope = { user: User; state: State; revision: number };
const initial: State = { userName: "Demo household", system: demoSystem, appliances: demoAppliances, cuts: demoCuts, events: [], setupDone: false };
const KEY = "voltbridge-demo";
const Ctx = createContext<{
  state: State; user: User | null; loading: boolean; saving: boolean; error: string; revision: number;
  update: (p: Partial<State>) => Promise<boolean>; reset: () => void;
  authenticate: (mode: "login" | "register", email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>; reload: () => Promise<void>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const apply = (data: Envelope) => { setState(data.state); setUser(data.user); setRevision(data.revision); };
  const loadDemo = () => {
    try { const raw = localStorage.getItem(KEY); setState(raw ? { ...initial, ...JSON.parse(raw) } : initial); }
    catch { setState(initial); }
    setUser(null); setRevision(0);
  };
  const reload = async () => {
    setLoading(true);
    try {
      const data = await api<Envelope | { user: null }>("/auth/session");
      if (data.user) apply(data as Envelope); else loadDemo();
      setError("");
    } catch {
      loadDemo();
      setError("");
    }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  const update = async (changes: Partial<State>) => {
    if (busy.current || loading || error) return false;
    busy.current = true; setSaving(true);
    try {
      if (user) apply(await api<Envelope>("/home", "PATCH", { revision, changes }));
      else { const next = { ...state, ...changes }; localStorage.setItem(KEY, JSON.stringify(next)); setState(next); }
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Changes could not be saved."); return false; }
    finally { busy.current = false; setSaving(false); }
  };
  const authenticate = async (mode: "login" | "register", email: string, password: string, name: string) => {
    if (busy.current) throw new Error("Wait for your changes to finish saving.");
    apply(await api<Envelope>(`/auth/${mode}`, "POST", { email, password, ...(mode === "register" ? { name } : {}) }));
    setError("");
  };
  const logout = async () => {
    if (busy.current) return;
    try { await api("/auth/logout", "POST"); loadDemo(); setError(""); }
    catch { setError("Sign-out failed. Retry when the server is available."); }
  };
  const reset = () => { if (!user) { localStorage.removeItem(KEY); setState(initial); } };
  return <Ctx.Provider value={{ state, user, loading, saving, error, revision, update, reset, authenticate, logout, reload }}>{children}</Ctx.Provider>;
}
export function useStore() { const c = useContext(Ctx); if (!c) throw new Error("StoreProvider missing"); return c; }
