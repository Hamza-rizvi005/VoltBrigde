// Plain planning maths. All results are ESTIMATES, never guarantees.

export type Appliance = {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
  essential: boolean;
  flexible: boolean; // can be moved to sunny hours
};

export type System = {
  panelKw: number; // total panel capacity
  sunHours: number; // peak sun hours today
  batteryKwh: number;
  minChargePct: number; // reserve not to go below
  inverterKw: number;
  chargePct: number; // current charge
};

export type PowerCut = { id: string; start: string; durationHours: number };

export const dailyLoadKwh = (apps: Appliance[]) =>
  apps.reduce((s, a) => s + (a.watts * a.hoursPerDay) / 1000, 0);

export const solarEstimateKwh = (sys: System, efficiency = 0.78) =>
  +(sys.panelKw * sys.sunHours * efficiency).toFixed(2);

export const usableBatteryKwh = (sys: System) =>
  Math.max(0, (sys.batteryKwh * (sys.chargePct - sys.minChargePct)) / 100);

/** Estimated hours the battery can run a given load (watts). */
export const backupHours = (sys: System, loadWatts: number) =>
  loadWatts <= 0 ? Infinity : +((usableBatteryKwh(sys) * 1000) / loadWatts).toFixed(1);

export const essentialWatts = (apps: Appliance[]) =>
  apps.filter((a) => a.essential).reduce((s, a) => s + a.watts, 0);

export type Balance = { solar: number; load: number; surplus: number; exceeds: boolean };

export const energyBalance = (sys: System, apps: Appliance[], extraKwh = 0): Balance => {
  const solar = solarEstimateKwh(sys);
  const load = +(dailyLoadKwh(apps) + extraKwh).toFixed(2);
  const available = solar + usableBatteryKwh(sys);
  return { solar, load, surplus: +(available - load).toFixed(2), exceeds: load > available };
};

/** Energy needed for the battery to cover all power cuts on essentials. */
export const cutCoverage = (sys: System, apps: Appliance[], cuts: PowerCut[]) => {
  const need = (essentialWatts(apps) * cuts.reduce((s, c) => s + c.durationHours, 0)) / 1000;
  const have = usableBatteryKwh(sys);
  return { needKwh: +need.toFixed(2), haveKwh: +have.toFixed(2), covered: have >= need };
};

/** Compare continuous appliance use with the usable battery budget for one outage. */
export function batteryBreakdown(system: System, appliances: Appliance[], hours: number) {
  const available = usableBatteryKwh(system);
  const items = appliances.map(({ id, name, watts }) => {
    const needed = (watts * hours) / 1000;
    return { id, name, needed, percent: available > 0 ? (needed / available) * 100 : null };
  });
  const total = items.reduce((sum, item) => sum + item.needed, 0);
  return { available, items, remaining: Math.max(0, available - total), shortfall: Math.max(0, total - available) };
}
