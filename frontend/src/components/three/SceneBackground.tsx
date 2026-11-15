import { lazy, Suspense, useEffect, useState } from "react";

const EnergyScene = lazy(() => import("./EnergyScene"));

export function SceneBackground({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`} aria-hidden>
      {mounted && (
        <Suspense fallback={null}>
          <EnergyScene />
        </Suspense>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/90" />
    </div>
  );
}
