import { z } from 'zod';
export const hardwareModeSchema = z.enum(['PROTOTYPE_5V_DC', 'PRODUCTION_220V_AC']);
export type HardwareMode = z.infer<typeof hardwareModeSchema>;
const reading = z.number().finite().nonnegative().nullable();
export const hardwareStatusSchema = z.object({
  schema_version: z.literal(1), device_id: z.string().min(1).max(64), mode: hardwareModeSchema,
  sample_age_ms: z.number().int().nonnegative(), sensor_ok: z.boolean(), control_enabled: z.boolean(), fault: z.string().max(200).nullable(),
  battery_voltage: reading, soc_pct: z.number().min(0).max(100).nullable(),
  soc_method: z.enum(['voltage_estimate', 'inverter_reported', 'bms', 'simulation']), capacity_wh: reading,
  battery_power_w: z.number().finite().nullable(), load_voltage: reading, load_current_a: reading,
  load_power_w: reading, energy_kwh: reading, relay_on: z.boolean(),
  uptime_seconds: z.number().nonnegative(), timer_remaining_seconds: reading,
  cutoff_pct: z.number().min(5).max(95),
});
export type HardwareStatus = z.infer<typeof hardwareStatusSchema>;
export const hardwareControlSchema = z.object({
  relay: z.boolean(), timer_minutes: z.number().int().min(0).max(1440),
  cutoff_pct: z.number().int().min(5).max(95), request_id: z.string().uuid(),
}).strict();
export type HardwareControl = z.infer<typeof hardwareControlSchema>;
export const hardwareConnectionSchema = z.object({
  ip: z.string().refine(ip => {
    if (!/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(ip)) return false;
    const a = ip.split('.').map(Number);
    if (a.some(n => n > 255) || a[3] === 0 || a[3] === 255) return false;
    return a[0] === 10 || (a[0] === 192 && a[1] === 168) || (a[0] === 172 && a[1]! >= 16 && a[1]! <= 31);
  }, 'Enter a private LAN IPv4 address, without a port or URL.'),
  token: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/, 'Use the device token configured in firmware (16–128 characters).'),
  mode: hardwareModeSchema,
}).strict();
export type HardwareConnection = z.infer<typeof hardwareConnectionSchema>;
