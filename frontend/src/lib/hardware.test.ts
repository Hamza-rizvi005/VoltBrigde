import { describe, it, expect } from 'vitest';
import { initialSimulation, simulateControl, simulateTick, remainingSeconds, nextOutage, outageGap, formatRuntime } from './hardware';
import { hardwareConnectionSchema, hardwareControlSchema } from './hardware-contract';
const command = { relay: true, timer_minutes: 1, cutoff_pct: 20, request_id: 'a3d14f01-ffdf-4660-afce-55e4092df3aa' };
describe('unified hardware model', () => {
  it.each(['PROTOTYPE_5V_DC', 'PRODUCTION_220V_AC'] as const)('enforces timer and freezes run time after shutdown in %s', mode => {
    const on = simulateControl(initialSimulation(mode), command);
    expect(on.load_power_w).toBeGreaterThan(0);
    const off = simulateTick(on, 75);
    expect(off.relay_on).toBe(false); expect(off.uptime_seconds).toBe(60);
    expect(off.load_power_w).toBe(0); expect(off.load_current_a).toBe(0);
    expect(simulateTick(off, 20).uptime_seconds).toBe(60);
    expect(simulateControl(off, { ...command, timer_minutes: 0 }).uptime_seconds).toBe(0);
  });
  it('applies low-battery cutoff and rejects starting below reserve', () => {
    const s = { ...initialSimulation('PROTOTYPE_5V_DC'), soc_pct: 20.001 };
    const stopped = simulateTick(simulateControl(s, { ...command, timer_minutes: 0 }), 60);
    expect(stopped.relay_on).toBe(false); expect(stopped.soc_pct).toBe(20);
    expect(stopped.fault).toContain('cutoff'); expect(stopped.uptime_seconds).toBeLessThan(60);
    expect(() => simulateControl(stopped, command)).toThrow();
  });
  it('does not invent infinite backup for off, charging, stale or missing-capacity data', () => {
    const s = initialSimulation('PRODUCTION_220V_AC');
    expect(remainingSeconds(s)).toBeNull();
    expect(remainingSeconds({ ...s, battery_power_w: -200 })).toBeNull();
    expect(remainingSeconds({ ...s, battery_power_w: 500, capacity_wh: null })).toBeNull();
    expect(remainingSeconds({ ...s, battery_power_w: 500, sample_age_ms: 6000 })).toBeNull();
    expect(remainingSeconds({ ...s, battery_power_w: 500 })).toBeCloseTo(20643.84);
  });
  it('merges overlapping midnight outages using Karachi time regardless of host timezone', () => {
    const now = Date.parse('2026-11-15T00:30:00+05:00');
    const cuts = [{ id: 'a', start: '23:30', durationHours: 2 }, { id: 'b', start: '00:00', durationHours: 2 }];
    expect(nextOutage(cuts, now)).toEqual({ start: Date.parse('2026-11-14T23:30:00+05:00'), end: Date.parse('2026-11-15T02:00:00+05:00') });
    const s = simulateControl(initialSimulation('PROTOTYPE_5V_DC'), command);
    expect(outageGap(s, cuts, now)?.gapSeconds).toBe(89 * 60);
    expect(nextOutage([], now)).toBeNull();
  });
  it('handles next-day windows and invalid schedules', () => {
    const now = Date.parse('2026-11-15T21:00:00+05:00');
    expect(nextOutage([{ id: 'a', start: '19:00', durationHours: 1 }], now)?.start).toBe(Date.parse('2026-11-16T19:00:00+05:00'));
    expect(nextOutage([{ id: 'a', start: '27:00', durationHours: 1 }], now)).toBeNull();
    expect(formatRuntime(3752)).toBe('01h 02m 32s');
  });
  it('rejects unsafe network destinations and invalid commands', () => {
    const connection = { mode: 'PROTOTYPE_5V_DC', token: 'test_device_token_123' };
    for (const ip of ['127.0.0.1', '169.254.169.254', '8.8.8.8', 'example.com', 'http://192.168.1.2', '192.168.1.2:80', '192.168.1.999', '010.0.0.1', '192.168.01.1']) expect(hardwareConnectionSchema.safeParse({ ...connection, ip }).success).toBe(false);
    expect(hardwareConnectionSchema.safeParse({ ...connection, ip: '192.168.1.50' }).success).toBe(true);
    for (const bad of [{ timer_minutes: -1 }, { timer_minutes: 1441 }, { cutoff_pct: 0 }, { cutoff_pct: 19.5 }]) expect(hardwareControlSchema.safeParse({ ...command, ...bad }).success).toBe(false);
  });
});
