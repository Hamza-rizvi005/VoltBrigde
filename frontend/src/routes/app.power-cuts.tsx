import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Alert, PageTitle, Panel } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { usePlan } from "@/hooks/use-plan";
import { cutCoverage } from "@/lib/energy";

export const Route = createFileRoute("/app/power-cuts")({
  head: () => ({ meta: [{ title: "Power cuts — Volt Bridge" }, { name: "description", content: "Plan your backup around expected power cuts." }] }),
  component: Cuts,
});

function Cuts() {
  const { state, user, update } = useStore();
  const plan = usePlan();
  const [start, setStart] = useState("18:00");
  const [dur, setDur] = useState("1");
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(start) && Number.isFinite(+dur) && +dur > 0 && +dur <= 24;
  const cov = user && plan.data ? { needKwh: plan.data.outageNeedKwh, haveKwh: plan.data.availableKwh, covered: plan.data.outageNeedKwh <= plan.data.availableKwh && !plan.data.alerts.some(a => a.code === "overload") } : cutCoverage(state.system, state.appliances, state.cuts);
  return (
    <>
      <PageTitle title="Power cuts" sub="Add the cuts you expect today. We'll estimate if backup can cover essentials." />
      <Panel className="mb-4 flex flex-wrap items-end gap-2">
        <div><p className="mb-1 text-xs text-muted-foreground">Starts</p><Input aria-label="Power cut start" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><p className="mb-1 text-xs text-muted-foreground">Hours</p><Input aria-label="Power cut duration in hours" type="number" min="0.01" max="24" step="any" value={dur} onChange={(e) => setDur(e.target.value)} className="w-24" /></div>
        <Button className="bg-sun" disabled={!valid} onClick={() => update({ cuts: [...state.cuts, { id: crypto.randomUUID(), start, durationHours: +dur }].sort((a, b) => a.start.localeCompare(b.start)) })}>Add cut</Button>
      </Panel>
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        {state.cuts.map((c) => (
          <Panel key={c.id} className="flex items-center justify-between !p-4">
            <div><p className="font-display text-xl font-semibold">{c.start}</p><p className="text-xs text-muted-foreground">{c.durationHours} hour(s)</p></div>
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => update({ cuts: state.cuts.filter((x) => x.id !== c.id) })}><Trash2 className="size-4" /></Button>
          </Panel>
        ))}
      </div>
      {user && plan.isPending ? <p>Recalculating saved outages…</p> : user && plan.error ? <Alert tone="bad">{plan.error.message}</Alert> : cov.covered ? <Alert tone="ok">Estimated: essentials need {cov.needKwh} kWh during cuts; about {cov.haveKwh} kWh usable. Should be covered — not guaranteed.</Alert> : <Alert tone="bad">Estimated: essentials need {cov.needKwh} kWh but only {cov.haveKwh} kWh is usable. Switch off non-essentials during cuts.</Alert>}
    </>
  );
}
