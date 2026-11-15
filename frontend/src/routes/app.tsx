import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { IconAssistant, IconBackupCore, IconCutShield, IconGathering, IconLiveSignal, IconSchedule, IconSolarPlan } from "@/components/icons";
import { Logo, DemoBadge } from "@/components/Logo";
import { useStore } from "@/lib/store";


export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "My energy — Volt Bridge" },
      { name: "description", content: "Your household solar and battery plan." },
      { property: "og:title", content: "My energy — Volt Bridge" },
      { property: "og:description", content: "Daily plan, appliances, power cuts and assistant." },
    ],
  }),
  component: AppLayout,
});

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: IconLiveSignal },
  { to: "/app/planner", label: "Daily planner", icon: IconSchedule },
  { to: "/app/appliances", label: "Appliances", icon: IconBackupCore },
  { to: "/app/power-cuts", label: "Power cuts", icon: IconCutShield },
  { to: "/app/events", label: "Events", icon: IconGathering },
  { to: "/app/assistant", label: "Assistant", icon: IconAssistant },
  { to: "/app/setup", label: "Home setup", icon: IconSolarPlan },
] as const;

function AppLayout() {
  const { state, user, loading, saving, error, logout, reload } = useStore();
  return (
    <div className="app-shell flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4"><Logo /></div>
        <div className="sidebar-caption">MY HOME ENERGY</div>
        <nav aria-label="App navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent !text-primary" }}
            >
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
          <Link to="/" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent md:mt-6">
            <LogOut className="size-4" /> Back to website
          </Link>
          {user && <button disabled={saving} onClick={() => void logout()} className="px-3 py-3 text-left text-sm text-muted-foreground">Sign out</button>}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <p className="text-sm text-muted-foreground">{state.userName} <span className="ml-2 opacity-50">/ My home</span></p>
          <div className="flex items-center gap-3">{user ? <span className="text-xs text-primary">{saving ? "Saving…" : "Saved home · Manual inputs"}</span> : <DemoBadge />}</div>
        </div>
        <div className="mx-auto max-w-6xl p-4 sm:p-8">
          {error && <div role="alert" className="mb-4 rounded-xl border border-destructive p-4 text-sm">{error} <button className="ml-3 text-primary underline" onClick={() => void reload()}>Reload saved data</button></div>}
          {!loading && !user && <p className="mb-4 text-sm text-muted-foreground">Demo changes stay in this browser. <Link to="/register" className="text-primary underline">Create an account</Link> to save your own home.</p>}
          {loading ? <p role="status">Loading your home…</p> : <div key={user?.id ?? "demo"} inert={saving || !!error}><Outlet /></div>}
        </div>
      </main>
    </div>
  );
}
