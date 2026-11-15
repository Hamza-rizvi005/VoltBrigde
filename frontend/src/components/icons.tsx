import { useId, type ReactNode } from "react";

// Bespoke duotone icon set for Volt Bridge — fine 1.25 stroke, amber→teal gradient accents.
type P = { className?: string };

function Base({ className = "size-6", children }: P & { children: (g: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  const g = `vb${id}`;
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={g} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--solar)" />
          <stop offset="0.55" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">{children(`url(#${g})`)}</g>
    </svg>
  );
}

export const LogoMark = ({ className = "size-5" }: P) => {
  const id = useId().replace(/:/g, "");
  const g = `vb-logo-${id}`;
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={g} x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.45" stopColor="#10B981" />
          <stop offset="0.85" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M12 14 L28 48 C30 52 34 52 36 48 L48 26 C52 18 46 12 38 14 C28 16 26 30 38 32 C44 33 52 30 54 24"
        stroke={`url(#${g})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.5" fill="#FBBF24" />
      <circle cx="38" cy="32" r="2.5" fill="#10B981" />
      <circle cx="54" cy="24" r="3" fill="#06B6D4" />
    </svg>
  );
};

export const IconSolarPlan = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <circle cx="23" cy="8" r="3.2" fill={g} stroke="none" />
        <path d="M23 2.5v1M28.5 8h-1M27 4l-.7.7M19 4l.7.7" />
        <path d="M3.5 26 7 15h15l-3.5 11Z" />
        <path d="M5.3 20.5h15M10 15l-2 11M15 15l-2 11" opacity=".55" />
        <path d="M11 29h6" stroke={g} />
      </>
    )}
  </Base>
);

export const IconBackupCore = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <rect x="9" y="5" width="14" height="23" rx="3.5" />
        <path d="M13 3h6" />
        <rect x="11.5" y="15" width="9" height="10.5" rx="1.6" fill={g} stroke="none" opacity=".9" />
        <path d="M11.5 11.5h9" opacity=".45" />
        <path d="M26.5 10a7 7 0 0 1 0 12" stroke={g} />
      </>
    )}
  </Base>
);

export const IconSchedule = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <circle cx="16" cy="16" r="12" opacity=".4" />
        <path d="M16 4a12 12 0 0 1 10.4 6" stroke={g} strokeWidth="2" />
        <path d="M16 9v7l4.5 3" />
        <circle cx="16" cy="16" r="1.4" fill={g} stroke="none" />
      </>
    )}
  </Base>
);

export const IconCutShield = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <path d="M16 3 26 7v8c0 6.5-4.3 11.3-10 14-5.7-2.7-10-7.5-10-14V7Z" />
        <path d="M17 9.5 12.5 16H17l-1.5 6" stroke={g} strokeWidth="1.8" />
        <path d="M20 13l2.5 2.5M22.5 13 20 15.5" opacity=".6" />
      </>
    )}
  </Base>
);

export const IconGathering = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <path d="M4 27h24" />
        <path d="M7 27V16l9-7 9 7v11" />
        <circle cx="13" cy="20" r="2" fill={g} stroke="none" />
        <circle cx="19" cy="20" r="2" fill={g} stroke="none" />
        <path d="M10.5 26c.5-2 1.5-3 2.5-3s2 1 2.5 3M16.5 26c.5-2 1.5-3 2.5-3s2 1 2.5 3" opacity=".6" />
        <path d="M16 3v2M11 4.5l1 1.5M21 4.5l-1 1.5" stroke={g} />
      </>
    )}
  </Base>
);

export const IconAssistant = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <path d="M5 8.5A3.5 3.5 0 0 1 8.5 5h15A3.5 3.5 0 0 1 27 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5h0A3 3 0 0 1 5 18Z" />
        <path d="M16 9.5c.4 1.8 1.2 2.6 3 3-1.8.4-2.6 1.2-3 3-.4-1.8-1.2-2.6-3-3 1.8-.4 2.6-1.2 3-3Z" fill={g} stroke="none" />
      </>
    )}
  </Base>
);

export const IconLiveSignal = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <path d="M3 17h5l3-8 5 15 3-9 2 2h8" />
        <circle cx="24" cy="17" r="2.2" fill={g} stroke="none" />
        <path d="M24 10.5a6.5 6.5 0 0 1 0 13" stroke={g} opacity=".7" />
      </>
    )}
  </Base>
);

export const IconHonest = (p: P) => (
  <Base {...p}>
    {(g) => (
      <>
        <circle cx="16" cy="16" r="12" />
        <path d="M10.5 16.5 14 20l7.5-8" stroke={g} strokeWidth="2" />
      </>
    )}
  </Base>
);

export const IconSpark = (p: P) => (
  <Base {...p}>{(g) => <path d="M16 4c1 5.5 3.5 8 9 9-5.5 1-8 3.5-9 9-1-5.5-3.5-8-9-9 5.5-1 8-3.5 9-9Z" fill={g} stroke="none" />}</Base>
);

/** Premium framed tile for icons: dark glass with a hairline gradient border and inner glow. */
export function IconTile({ children, size = "md" }: { children: ReactNode; size?: "md" | "lg" }) {
  const s = size === "lg" ? "size-14" : "size-12";
  return (
    <span className={`relative grid ${s} place-items-center rounded-xl bg-sun p-px`}>
      <span className="grid size-full place-items-center rounded-[calc(var(--radius)+3px)] bg-card text-foreground/85 shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--solar)_25%,transparent)]">
        {children}
      </span>
    </span>
  );
}
