import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import type { System } from "@/lib/energy";

export const Route = createFileRoute("/app/setup")({
  head: () => ({ meta: [{ title: "Home setup — Volt Bridge" }, { name: "description", content: "Tell us about your solar panels, inverter and battery." }] }),
  component: Setup,
});

const steps: { title: string; fields: [keyof System, string, string][] }[] = [
  { title: "Solar panels", fields: [["panelKw", "Total panel size (kW)", "e.g. 3.2"], ["sunHours", "Good sun hours per day", "e.g. 5.5"]] },
  { title: "Inverter", fields: [["inverterKw", "Inverter size (kW)", "e.g. 3.6"]] },
  { title: "Battery", fields: [["batteryKwh", "Battery size (kWh)", "e.g. 5"], ["chargePct", "Current charge (%)", "e.g. 80"], ["minChargePct", "Keep at least (%)", "e.g. 20"]] },
];

function Setup() {
  const { state, update } = useStore();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [sys, setSys] = useState(state.system);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  return (
    <>
      <PageTitle title="Set up your home" sub="Step by step. You can change these any time." />
      <div className="mb-4 flex gap-2">{steps.map((s, k) => <div key={s.title} className={`h-1.5 flex-1 rounded-full transition-colors ${k <= i ? "bg-sun" : "bg-muted"}`} />)}</div>
      <Panel key={i} className="space-y-4">
        <h2 className="text-xl font-semibold">{step.title}</h2>
        {step.fields.map(([k, label, ph]) => (
          <div key={k}><Label htmlFor={k}>{label}</Label><Input id={k} type="number" step="0.1" placeholder={ph} value={sys[k]} onChange={(e) => setSys({ ...sys, [k]: +e.target.value })} /></div>
        ))}
        <p className="text-xs text-muted-foreground">Not sure? Check the label on the device or your installer's invoice. Appliances and power cuts come next.</p>
        <div className="flex justify-between">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</Button>
          <Button className="bg-sun" onClick={async () => { if (last) { if (await update({ system: sys, setupDone: true })) nav({ to: "/app/appliances" }); } else setI(i + 1); }}>{last ? "Save & add appliances" : "Next"}</Button>
        </div>
      </Panel>
    </>
  );
}
