import { Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/icons";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
      <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-card text-foreground glow-sun">
        <LogoMark className="size-6" />
      </span>
      <span className="tracking-tight">Volt<span className="font-light text-muted-foreground">Bridge</span></span>
    </Link>
  );
}

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
      <span className="size-1.5 rounded-full bg-warning animate-pulse-soft" />
      {label}
    </span>
  );
}
