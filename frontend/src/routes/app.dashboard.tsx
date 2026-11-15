import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Alert, BatteryGauge, PageTitle, Panel, Stat } from "@/components/app-ui";
import { useStore } from "@/lib/store";
import { backupHours, cutCoverage, energyBalance, essentialWatts, batteryBreakdown } from "@/lib/energy";
import { usePlan } from "@/hooks/use-plan";
import { demoHourly } from "@/lib/demo-data";
import { HardwareControlPanel, type HardwareSyncData } from "@/components/HardwareControlPanel";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Volt Bridge" }, { name: "description", content: "Today's solar, battery and backup at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const [hours, setHours] = useState(2);
  const [includeFlexible, setIncludeFlexible] = useState(false);
  const [hwSync, setHwSync] = useState<HardwareSyncData | null>(null);
  const [syncWithHardware, setSyncWithHardware] = useState(true);
  const { state, user } = useStore();
  const plan = usePlan();
  const { system: s, appliances: a, cuts } = state;

  const hasHwSoc = hwSync?.soc_pct != null;
  const isSyncActive = syncWithHardware && hasHwSoc;
  const effectiveChargePct = isSyncActive ? Math.round(hwSync.soc_pct!) : s.chargePct;
  const effectiveSystem = {
    ...s,
    chargePct: effectiveChargePct,
  };

  const distribution = batteryBreakdown(effectiveSystem, a.filter((item) => includeFlexible || item.essential), hours);
  const bal = plan.data?.balance ?? energyBalance(effectiveSystem, a);
  const backup = user ? (plan.data?.backupHours ?? NaN) : backupHours(effectiveSystem, essentialWatts(a));
  const cov = user && plan.data ? { needKwh: plan.data.outageNeedKwh, haveKwh: plan.data.availableKwh, covered: plan.data.outageNeedKwh <= plan.data.availableKwh && !plan.data.alerts.some(x => x.code === "overload") } : cutCoverage(effectiveSystem, a, cuts);
  const max = Math.max(...demoHourly.map((h) => Math.max(h.solar, h.load)));

  if (user && plan.isPending) return <p role="status">Calculating your home energy…</p>;
  if (user && plan.error) return <Alert tone="bad">{plan.error.message} <button onClick={() => void plan.refetch()}>Retry</button></Alert>;

  return (
    <div className="energy-dashboard">
      <PageTitle title="Today at home" sub="Make a little room for a better energy day." />
      <HardwareControlPanel onSync={setHwSync} />
      {!state.setupDone && (
        <div className="mb-4"><Alert tone="warn">{user ? "Complete your equipment details before using these estimates." : "You’re viewing demo values."} <Link to="/app/setup" className="font-semibold text-primary underline">Set up your home</Link> for your own plan.</Alert></div>
      )}
      <div className="dashboard-brief">
        <div>
          <span className="eyebrow">YOUR ENERGY OUTLOOK</span>
          <h2>{bal.exceeds ? "Your plan needs a little breathing room." : "Start with the sun. Save for later."}</h2>
          <p>{bal.exceeds ? "Review flexible appliances and reduce planned use before relying on backup." : "Review your appliance plan, then check the battery budget for your expected cuts."}</p>
        </div>
        <Link to="/app/planner">Review my plan <ArrowRight size={16}/></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Solar today" value={bal.solar} unit="kWh" />
        <Stat
          label="Home use today"
          value={bal.load}
          unit="kWh"
          kind={isSyncActive && hwSync?.relay_on ? "live" : "estimate"}
        />
        <Stat
          label="Backup for essentials"
          value={Number.isFinite(backup) ? `~${backup}` : "—"}
          unit="hrs"
          kind={isSyncActive ? "live" : "estimate"}
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
        <Panel className="energy-hover text-center">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Battery</p>
            {hasHwSoc && (
              <button
                type="button"
                onClick={() => setSyncWithHardware(!syncWithHardware)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  isSyncActive
                    ? "border border-primary/40 bg-primary/10 text-primary"
                    : "border border-border bg-muted/40 text-muted-foreground"
                }`}
                title="Toggle synchronization with hardware simulation"
              >
                {isSyncActive ? "● Synced" : "Manual"}
              </button>
            )}
          </div>
          <BatteryGauge pct={effectiveChargePct} reserve={s.minChargePct} />
          <p className="mt-3 text-xs text-muted-foreground">Dashed line = {s.minChargePct}% reserve</p>
          {isSyncActive && hwSync && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary">
              <span className="font-semibold">{hwSync.label}</span> · {hwSync.soc_pct?.toFixed(1)}%
              {hwSync.battery_voltage != null && <span className="ml-1 text-muted-foreground">({hwSync.battery_voltage.toFixed(2)}V)</span>}
            </div>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center justify-between text-sm"><span className="font-semibold">A sample solar day</span><span className="text-muted-foreground">Sample · kW</span></div>
          <div className="mt-5 flex h-48 items-end gap-1.5">
            {demoHourly.map((h, i) => (
              <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1" title={`${h.hour}: solar ${h.solar} kW, home use ${h.load} kW`}>
                <div className="flex h-40 w-full items-end gap-0.5">
                  <div className="flex-1 rounded-t bg-solar/80 transition-all duration-700" style={{ height: `${(h.solar / max) * 100}%`, transitionDelay: `${i * 30}ms` }} />
                  <div className="flex-1 rounded-t bg-grid/70" style={{ height: `${(h.load / max) * 100}%` }} />
                </div>
                <span className="text-[12px] text-muted-foreground">{i % 3 === 0 ? h.hour : ""}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Illustrative profile, not live readings or a forecast for your home.</p>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span><span className="mr-1 inline-block size-2 rounded bg-solar" />Solar</span><span><span className="mr-1 inline-block size-2 rounded bg-grid" />Use</span></div>
        </Panel>
      </div>
      <Panel className="energy-hover mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Where your battery goes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSyncActive
                ? `Synchronized with ${hwSync?.label ?? 'hardware'} (${effectiveChargePct}% charge).`
                : "See what your appliances would use during a power cut."}
            </p>
          </div>
          <span className="rounded-full border border-primary/30 px-3 py-1 text-sm text-primary">
            {distribution.available.toFixed(2)} kWh available
          </span>
        </div>
        <div className="my-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-3 text-sm">Power cut: {hours} h
            <input type="range" min="0.5" max="8" step="0.5" value={hours} onChange={(event) => setHours(Number(event.target.value))} className="accent-primary" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeFlexible} onChange={(event) => setIncludeFlexible(event.target.checked)} className="accent-primary" />
            Include all appliances
          </label>
        </div>
        <div className="space-y-2">
          {distribution.items.length === 0 && <p className="text-sm text-muted-foreground">No appliances selected. <Link to="/app/appliances" className="text-primary underline">Manage appliances</Link></p>}
          {distribution.items.map(({ id, name, needed, percent }) => (
            <div key={id} className="battery-usage-row rounded-xl border border-border/60 p-3">
              <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">{needed.toFixed(2)} kWh · {percent === null ? "No battery energy available" : `${Math.round(percent)}% of battery budget`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="battery-usage-fill h-full rounded-full bg-primary" style={{ width: `${Math.min(percent ?? (needed > 0 ? 100 : 0), 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium">
          {distribution.shortfall > 0 ? `Estimated shortfall: ${distribution.shortfall.toFixed(2)} kWh` : `Estimated energy left: ${distribution.remaining.toFixed(2)} kWh`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Assumes the selected appliances are on backup and run throughout the cut, with no solar or grid power. Your reserve stays out of the available budget.</p>
      </Panel>
      <div className="dashboard-actions mt-5">
        <Link to="/app/power-cuts"><div><strong>Prepare for a power cut</strong><p>Check your expected outage windows.</p></div><ArrowRight/></Link>
        <Link to="/app/appliances"><div><strong>Choose what stays on</strong><p>Review essential and flexible appliances.</p></div><ArrowRight/></Link>
      </div>
      <div className="mt-4 space-y-2">
        {bal.exceeds ? <Alert tone="bad">Planned use is more than estimated solar plus battery today by {Math.abs(bal.surplus)} kWh. Consider moving flexible appliances.</Alert> : <Alert tone="ok">Today looks balanced — about {bal.surplus} kWh spare (estimate).</Alert>}
        {cov.covered ? <Alert tone="ok">Your battery should cover today's expected power cuts for essentials ({cov.needKwh} kWh needed).</Alert> : <Alert tone="warn">Expected cuts may need {cov.needKwh} kWh but only ~{cov.haveKwh} kWh is usable. Save charge before the next expected cut.</Alert>}
        <Alert tone="warn">Planning tip: move flexible appliances into your strongest solar hours. The sample profile peaks around midday; actual conditions vary.</Alert>
      </div>
    </div>
  );
}
