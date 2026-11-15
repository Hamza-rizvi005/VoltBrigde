import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Alert, PageTitle, Panel } from "@/components/app-ui";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { api, type EventResult } from "@/lib/api";
import { essentialWatts, usableBatteryKwh } from "@/lib/energy";

export const Route = createFileRoute("/app/events")({
  head: () => ({ meta: [{ title: "Event planning — Volt Bridge" }, { name: "description", content: "Plan extra energy use for a gathering at home." }] }),
  component: Events,
});

const extras = [
  { id: "lights", name: "Extra lights", watts: 200 },
  { id: "fans", name: "Pedestal fans", watts: 300 },
  { id: "speaker", name: "Sound system", watts: 150 },
  { id: "kettle", name: "Electric kettle", watts: 1500 },
];

function Events() {
  const { state, user, update, revision } = useStore();
  const [result, setResult] = useState<EventResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [title, setTitle] = useState("Family dinner");
  const [hours, setHours] = useState(4);
  const [on, setOn] = useState<Record<string, boolean>>({ lights: true, fans: true });
  useEffect(() => { setResult(null); }, [title, hours, on, revision]);
  const scenario = () => ({ id: savedId ?? crypto.randomUUID(), title: title.trim(), hours, extras: extras.filter(e => on[e.id]) });
  const calculate = async () => {
    setBusy(true); setError("");
    try { setResult(await api<EventResult>("/events/simulate", "POST", scenario())); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to calculate."); }
    finally { setBusy(false); }
  };
  const save = async () => {
    const event = scenario();
    if (await update({ events: [...state.events.filter(e => e.id !== event.id), event] })) setSavedId(event.id);
  };
  const extraWatts = extras.filter((e) => on[e.id]).reduce((sum, e) => sum + e.watts, 0);
  const available = usableBatteryKwh(state.system);
  const watts = essentialWatts(state.appliances) + extraWatts;
  const required = (watts * hours) / 1000;
  const overloaded = watts > state.system.inverterKw * 1000;
  return (
    <>
      <PageTitle title="Event planning" sub="Hosting at home? See if there's enough energy for the extras." />
      <Panel className="space-y-5">
        <Input aria-label="Event name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div><p className="mb-2 text-sm">Duration: <b>{hours} hours</b></p><Slider aria-label="Event duration" min={1} max={8} step={1} value={[hours]} onValueChange={(v) => setHours(v[0] ?? 1)} /></div>
        <div className="grid gap-2 md:grid-cols-2">
          {extras.map((e) => (
            <button type="button" aria-pressed={!!on[e.id]} key={e.id} onClick={() => setOn({ ...on, [e.id]: !on[e.id] })} className={`rounded-xl border p-3 text-left text-sm transition-all ${on[e.id] ? "border-primary bg-primary/10" : "border-border"}`}>
              <b>{e.name}</b><span className="ml-2 text-muted-foreground">{e.watts} W</span>
            </button>
          ))}
        </div>
      </Panel>
      {user && <Panel className="mt-4">
        <div className="flex flex-wrap gap-3"><Button disabled={busy || !title.trim()} onClick={() => void calculate()}>Calculate scenario</Button><Button variant="outline" disabled={busy || !title.trim()} onClick={() => void save()}>{savedId ? "Update saved event" : "Save event"}</Button><Button variant="ghost" onClick={() => { setSavedId(null); setTitle("New event"); }}>New event</Button></div>
        {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
        {result && <div className="mt-4"><Alert tone={result.feasible ? "ok" : "bad"}>{result.neededKwh} kWh needed; {result.availableKwh} kWh available. {result.overloaded ? "Exceeds your inverter power limit. " : ""}{result.shortfallKwh > 0 ? result.shortfallKwh + " kWh short." : "No energy shortfall under these assumptions."}</Alert><p className="mt-2 text-xs text-muted-foreground">{result.assumptions}</p></div>}
        <h2 className="mt-6 font-semibold">Saved events</h2>
        {state.events.length === 0 && <p className="text-sm text-muted-foreground">No saved events yet.</p>}
        {state.events.map(e => <div key={e.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg border p-3"><button onClick={() => { setSavedId(e.id); setTitle(e.title); setHours(e.hours); setOn(Object.fromEntries(e.extras.map(x => [x.id, true]))); }} className="text-left text-sm">{e.title} · {e.hours} h</button><Button variant="ghost" size="sm" onClick={async () => { if (await update({ events: state.events.filter(x => x.id !== e.id) }) && savedId === e.id) setSavedId(null); }}>Remove</Button></div>)}
      </Panel>}
      {!user && <div className="mt-4">
        <p className="mb-3 text-sm text-muted-foreground">Evening power cut estimate. This assumes no solar or grid power and counts essentials and selected extras as running throughout.</p>
        <p className="mb-3 text-sm">{title.trim() || "This event"} needs {required.toFixed(2)} kWh including essentials. Your battery has an estimated {available.toFixed(2)} kWh above its reserve.</p>
        {overloaded && <Alert tone="bad">The selected appliances exceed your inverter’s entered power limit. Run fewer at the same time.</Alert>}
        {required > available ? <Alert tone="bad">The battery is about {(required - available).toFixed(2)} kWh short. Try fewer extras or a shorter event.</Alert> : !overloaded && <Alert tone="ok">The battery may cover this plan under these assumptions.</Alert>}
      </div>}
    </>
  );
}
