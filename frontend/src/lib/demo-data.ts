import type { Appliance, PowerCut, System } from "./energy";

export const demoSystem: System = {
  panelKw: 3.2,
  sunHours: 5.5,
  batteryKwh: 5,
  minChargePct: 20,
  inverterKw: 3.6,
  chargePct: 82,
};

export const demoAppliances: Appliance[] = [
  { id: "fridge", name: "Refrigerator", watts: 150, hoursPerDay: 24, essential: true, flexible: false },
  { id: "fans", name: "Ceiling fans (3)", watts: 225, hoursPerDay: 10, essential: true, flexible: false },
  { id: "lights", name: "LED lights", watts: 90, hoursPerDay: 6, essential: true, flexible: false },
  { id: "router", name: "Wi‑Fi router", watts: 12, hoursPerDay: 24, essential: true, flexible: false },
  { id: "washer", name: "Washing machine", watts: 500, hoursPerDay: 1, essential: false, flexible: true },
  { id: "iron", name: "Iron", watts: 1000, hoursPerDay: 0.5, essential: false, flexible: true },
  { id: "pump", name: "Water pump", watts: 750, hoursPerDay: 0.5, essential: false, flexible: true },
  { id: "ac", name: "Inverter AC", watts: 1200, hoursPerDay: 3, essential: false, flexible: true },
];

export const demoCuts: PowerCut[] = [
  { id: "c1", start: "08:00", durationHours: 1 },
  { id: "c2", start: "14:00", durationHours: 1 },
  { id: "c3", start: "20:00", durationHours: 2 },
];

// Hourly estimated solar output (kW) and planned load (kW), 6am–9pm.
export const demoHourly = Array.from({ length: 16 }, (_, i) => {
  const h = i + 6;
  const solar = Math.max(0, Math.sin(((h - 6) / 13) * Math.PI)) * 2.5;
  const load = 0.45 + (h >= 10 && h <= 13 ? 0.9 : 0) + (h >= 19 ? 0.4 : 0);
  return { hour: `${h}:00`, solar: +solar.toFixed(2), load: +load.toFixed(2) };
});
