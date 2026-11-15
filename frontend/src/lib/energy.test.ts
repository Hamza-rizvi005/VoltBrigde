import { describe, it, expect } from "vitest";
import { backupHours, cutCoverage, energyBalance, usableBatteryKwh } from "./energy";
import { demoAppliances, demoSystem } from "./demo-data";

describe("energy planning", () => {
  it("usable battery respects the reserve", () => {
    expect(usableBatteryKwh({ ...demoSystem, batteryKwh: 5, chargePct: 80, minChargePct: 20 })).toBe(3);
  });
  it("backup hours for 500W from 3 kWh usable is 6h", () => {
    expect(backupHours({ ...demoSystem, batteryKwh: 5, chargePct: 80, minChargePct: 20 }, 500)).toBe(6);
  });
  it("flags when planned consumption exceeds available energy", () => {
    expect(energyBalance(demoSystem, demoAppliances, 50).exceeds).toBe(true);
    expect(energyBalance(demoSystem, demoAppliances, 0).exceeds).toBe(false);
  });
  it("cut coverage fails when battery is near reserve", () => {
    expect(cutCoverage({ ...demoSystem, chargePct: 21 }, demoAppliances, [{ id: "x", start: "20:00", durationHours: 4 }]).covered).toBe(false);
  });
});
