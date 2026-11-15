import type { ReactNode } from "react";

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6 animate-rise">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Tag({ kind }: { kind: "estimate" | "live" }) {
  return kind === "live" ? (
    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-success">Live</span>
  ) : (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Estimate</span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`animate-rise rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, unit, kind = "estimate", icon }: { label: string; value: string | number; unit?: string; kind?: "estimate" | "live"; icon?: ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">{icon}{label}</span>
        <Tag kind={kind} />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">
        {value}<span className="ml-1 text-base text-muted-foreground">{unit}</span>
      </div>
    </Panel>
  );
}

export function BatteryGauge({ pct, reserve }: { pct: number; reserve: number }) {
  return (
    <div className="relative mx-auto h-56 w-28">
      <div className="absolute left-1/2 top-0 h-3 w-10 -translate-x-1/2 rounded-t-md bg-muted-foreground/40" />
      <div className="absolute inset-x-0 bottom-0 top-3 overflow-hidden rounded-2xl border-2 border-muted-foreground/40 bg-muted">
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent to-success transition-all duration-1000" style={{ height: `${pct}%` }}>
          <div className="absolute inset-x-0 top-0 h-2 bg-foreground/30 animate-pulse-soft" />
        </div>
        <div className="absolute inset-x-0 border-t-2 border-dashed border-destructive/70" style={{ bottom: `${reserve}%` }} />
        <div className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold">{pct}%</div>
      </div>
    </div>
  );
}

export function Alert({ tone, children }: { tone: "ok" | "warn" | "bad"; children: ReactNode }) {
  const c = tone === "ok" ? "border-success/40 bg-success/10" : tone === "warn" ? "border-warning/40 bg-warning/10" : "border-destructive/50 bg-destructive/10";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}
