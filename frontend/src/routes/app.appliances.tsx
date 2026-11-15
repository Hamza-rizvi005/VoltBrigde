import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PageTitle, Panel } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { dailyLoadKwh } from "@/lib/energy";

export const Route = createFileRoute("/app/appliances")({
  head: () => ({ meta: [{ title: "Appliances — Volt Bridge" }, { name: "description", content: "Manage the appliances in your home." }] }),
  component: Appliances,
});

function Appliances() {
  const { state, update } = useStore();
  const [f, setF] = useState({ name: "", watts: "", hours: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const apps = state.appliances;
  const set = (id: string, p: object) => update({ appliances: apps.map((a) => (a.id === id ? { ...a, ...p } : a)) });
  const valid = !!f.name.trim() && Number.isFinite(+f.watts) && +f.watts > 0 &&
    f.hours.trim() !== "" && Number.isFinite(+f.hours) && +f.hours >= 0 && +f.hours <= 24;
  const clear = () => {
    setEditingId(null);
    setF({ name: "", watts: "", hours: "" });
  };
  const save = async () => {
    if (!valid) return;
    const fields = { name: f.name.trim(), watts: +f.watts, hoursPerDay: +f.hours };
    const saved = editingId ? await set(editingId, fields) : await update({ appliances: [...apps, { id: crypto.randomUUID(), ...fields, essential: false, flexible: true }] });
    if (saved) clear();
  };
  return (
    <>
      <PageTitle title="Appliances" sub={`Estimated daily use: ${dailyLoadKwh(apps).toFixed(1)} kWh`} />
      <Panel className="mb-4">
        <div className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]">
          <Input aria-label="Appliance name" placeholder="Appliance name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input aria-label="Watts" placeholder="Watts" type="number" value={f.watts} onChange={(e) => setF({ ...f, watts: e.target.value })} />
          <Input aria-label="Hours/day" placeholder="Hours/day" type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />
          <Button onClick={save} disabled={!valid} className="bg-sun">{editingId ? "Save changes" : "Add appliance"}</Button>
          {editingId && <Button variant="ghost" onClick={clear}>Cancel edit</Button>}
        </div>
      </Panel>
      <div className="space-y-2">
        {apps.map((a) => (
          <Panel key={a.id} className="flex flex-wrap items-center gap-4 !p-4">
            <div className="min-w-40 flex-1"><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.watts} W · {a.hoursPerDay} h/day · {((a.watts * a.hoursPerDay) / 1000).toFixed(2)} kWh</p></div>
            <label className="flex items-center gap-2 text-xs"><Switch checked={a.essential} onCheckedChange={(v) => set(a.id, { essential: v })} />Essential</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={a.flexible} onCheckedChange={(v) => set(a.id, { flexible: v })} />Flexible time</label>
            <Button variant="outline" size="sm" aria-label={`Edit ${a.name}`} onClick={() => { setEditingId(a.id); setF({ name: a.name, watts: String(a.watts), hours: String(a.hoursPerDay) }); }}>Edit</Button>
            <Button variant="ghost" size="icon" aria-label={`Remove ${a.name}`} onClick={() => { if (editingId === a.id) clear(); update({ appliances: apps.filter((x) => x.id !== a.id) }); }}><Trash2 className="size-4" /></Button>
          </Panel>
        ))}
      </div>
    </>
  );
}
