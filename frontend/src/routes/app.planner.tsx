import { createFileRoute, Link } from "@tanstack/react-router";
import { Alert, PageTitle, Panel } from "@/components/app-ui";
import { useStore } from "@/lib/store";
import { usePlan } from "@/hooks/use-plan";

export const Route = createFileRoute("/app/planner")({ component: Planner });
function Planner() {
  const { user } = useStore();
  const plan = usePlan();
  return <>
    <PageTitle title="Daily planner" sub="An energy budget based on your saved home. You stay in control of every switch." />
    {!user ? <Panel><p>Sign in to generate a server-calculated plan from your own equipment, appliances and expected power cuts.</p><Link className="text-primary underline" to="/login">Sign in</Link></Panel> : plan.isPending ? <p role="status">Calculating your plan…</p> : plan.error ? <Alert tone="bad">{plan.error.message} <button onClick={() => void plan.refetch()}>Retry</button></Alert> : plan.data && <>
      <div className="mb-4 space-y-2">{plan.data.alerts.map(a => <Alert key={a.code} tone={a.tone}>{a.text}</Alert>)}</div>
      <Panel className="mb-4"><h2 className="text-xl">Your daily energy budget</h2><p className="mt-3">Estimated solar: {plan.data.balance.solar} kWh · Planned use: {plan.data.balance.load} kWh</p><p className="mt-2">Battery above reserve: {plan.data.availableKwh} kWh. Expected cuts total {plan.data.outageHours} hours and need about {plan.data.outageNeedKwh} kWh for essentials.</p><p className="mt-2 text-sm text-muted-foreground">{plan.data.backupHours === null ? "Mark essential appliances to estimate backup." : `About ${plan.data.backupHours} hours of continuous essential use before reserve, under the assumptions below.`}</p></Panel>
      <Panel className="mb-4"><h2 className="text-xl">Appliances you can move</h2><p className="my-3 text-sm text-muted-foreground">Consider stronger solar hours. These are tasks to arrange, not a verified hourly schedule. Avoid running them all at once.</p>{plan.data.flexible.length ? <ul className="space-y-3">{plan.data.flexible.map(a => <li key={a.id} className="rounded-lg border p-3"><b>{a.name}</b> · {a.hours} h · {a.kwh} kWh{a.exceedsInverter && <p className="text-destructive">Exceeds the entered inverter power limit.</p>}</li>)}</ul> : <Link to="/app/appliances" className="text-primary underline">Add flexible appliances</Link>}</Panel>
      {plan.data.events.length > 0 && <Panel className="mb-4"><h2 className="text-xl">Saved event scenarios</h2>{plan.data.events.map(e => <p key={e.id} className="mt-3">{e.title}: {e.neededKwh} kWh needed.{e.overloaded ? " Exceeds inverter power limit." : e.shortfallKwh > 0 ? ` ${e.shortfallKwh} kWh short.` : " Within the entered battery budget."}</p>)}</Panel>}
      <Panel><h2 className="font-semibold">What this estimate assumes</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{plan.data.assumptions.map(a => <li key={a}>{a}</li>)}</ul><p className="mt-4 text-xs text-muted-foreground">Calculated {new Date(plan.data.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })} (Karachi time)</p></Panel>
    </>}
  </>;
}
