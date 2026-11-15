import type { HardwareControl, HardwareMode, HardwareStatus } from './hardware-contract';
import type { PowerCut } from './energy';
export const formatRuntime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
};
export function initialSimulation(mode: HardwareMode): HardwareStatus {
  return { schema_version: 1, device_id: 'SIMULATION', mode, sample_age_ms: 0, sensor_ok: true, control_enabled: true, fault: null,
    battery_voltage: mode === 'PROTOTYPE_5V_DC' ? 3.912 : 51.2, soc_pct: 76, soc_method: 'simulation',
    capacity_wh: mode === 'PROTOTYPE_5V_DC' ? 7.4 : 5120, battery_power_w: 0,
    load_voltage: mode === 'PROTOTYPE_5V_DC' ? 3.912 : 220, load_current_a: 0, load_power_w: 0,
    energy_kwh: 0, relay_on: false, uptime_seconds: 0, timer_remaining_seconds: null, cutoff_pct: 20 };
}
export function simulateTick(s: HardwareStatus, elapsedSeconds: number): HardwareStatus {
  if (!s.relay_on) return s;
  const dt = Math.max(0, elapsedSeconds);
  const drain = s.mode === 'PROTOTYPE_5V_DC' ? (s.battery_voltage ?? 3.7) * .215 : 800 / .9;
  const capacity = s.capacity_wh ?? 0;
  const untilCutoff = capacity > 0 ? Math.max(0, ((s.soc_pct ?? 0) - s.cutoff_pct) / 100 * capacity / drain * 3600) : 0;
  const active = Math.min(dt, s.timer_remaining_seconds ?? Infinity, untilCutoff);
  const soc = Math.max(s.cutoff_pct, (s.soc_pct ?? 0) - drain * active / 3600 / Math.max(capacity, .001) * 100);
  const voltage = s.mode === 'PROTOTYPE_5V_DC' ? 3 + 1.2 * soc / 100 : 51.2;
  const on = active >= dt && (s.timer_remaining_seconds === null || s.timer_remaining_seconds > dt) && untilCutoff > dt;
  const power = s.mode === 'PROTOTYPE_5V_DC' ? voltage * .215 : 800;
  return { ...s, soc_pct: soc, battery_voltage: voltage, load_voltage: s.mode === 'PROTOTYPE_5V_DC' ? voltage : 220,
    relay_on: on, battery_power_w: on ? drain : 0, load_current_a: on ? (s.mode === 'PROTOTYPE_5V_DC' ? .215 : 800 / 220) : 0,
    load_power_w: on ? power : 0, uptime_seconds: s.uptime_seconds + active,
    energy_kwh: (s.energy_kwh ?? 0) + (s.mode === 'PROTOTYPE_5V_DC' ? drain : 800) * active / 3_600_000,
    timer_remaining_seconds: s.timer_remaining_seconds === null ? null : Math.max(0, s.timer_remaining_seconds - active),
    fault: on ? null : untilCutoff <= active ? 'Low-battery cutoff' : 'Run-time limit reached' };
}
export function simulateControl(s: HardwareStatus, c: HardwareControl): HardwareStatus {
  if (c.relay && (s.soc_pct ?? 0) <= c.cutoff_pct) throw new Error('Battery is at or below the selected cutoff.');
  const next = { ...s, relay_on: c.relay, cutoff_pct: c.cutoff_pct, fault: null,
    uptime_seconds: c.relay && !s.relay_on ? 0 : s.uptime_seconds,
    timer_remaining_seconds: c.relay && c.timer_minutes > 0 ? c.timer_minutes * 60 : null };
  return c.relay ? simulateTick(next, 0) : { ...next, battery_power_w: 0, load_current_a: 0, load_power_w: 0 };
}
export function remainingSeconds(s: HardwareStatus): number | null {
  if (!s.sensor_ok || s.sample_age_ms > 5000 || s.soc_pct === null || !s.capacity_wh || s.battery_power_w === null || s.battery_power_w <= .01) return null;
  return Math.max(0, s.soc_pct - s.cutoff_pct) / 100 * s.capacity_wh / s.battery_power_w * 3600;
}
// Schedules are daily local wall-clock windows in Asia/Karachi (UTC+05:00), not fetched utility data.
// Merge overlaps, including a previous-day window spanning midnight.
export function nextOutage(cuts: PowerCut[], now: number): { start: number; end: number } | null {
  const offset = 5 * 3600_000;
  const day = Math.floor((now + offset) / 86400_000) * 86400_000 - offset;
  const ranges = [-1, 0, 1].flatMap(d => cuts.flatMap(c => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start) || c.durationHours <= 0 || c.durationHours > 24) return [];
    const [h = 0, m = 0] = c.start.split(':').map(Number);
    const start = day + d * 86400_000 + h * 3600_000 + m * 60_000;
    return [{ start, end: start + c.durationHours * 3600_000 }];
  })).sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) { const last = merged.at(-1); if (last && range.start <= last.end) last.end = Math.max(last.end, range.end); else merged.push({ ...range }); }
  return merged.find(r => r.end > now) ?? null;
}
export function outageGap(s: HardwareStatus, cuts: PowerCut[], now: number) {
  const outage = nextOutage(cuts, now), remaining = remainingSeconds(s);
  if (!outage || remaining === null) return null;
  const depletion = now + Math.min(remaining, s.timer_remaining_seconds ?? Infinity) * 1000;
  return { ...outage, depletion, gapSeconds: Math.max(0, (outage.end - Math.max(outage.start, depletion)) / 1000) };
}
