import { z } from 'zod';

const number = (max) => z.number().finite().min(0).max(max);
const id = z.string().min(1).max(80);
export const systemSchema = z.object({
  panelKw: number(1000), sunHours: number(24), batteryKwh: number(10000),
  minChargePct: number(100), chargePct: number(100), inverterKw: number(1000),
}).strict();
export const applianceSchema = z.object({
  id, name: z.string().trim().min(1).max(100), watts: number(100000).positive(),
  hoursPerDay: number(24), essential: z.boolean(), flexible: z.boolean(),
}).strict();
const unique = (rows) => new Set(rows.map(r => r.id)).size === rows.length;
const cutSchema = z.object({ id, start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), durationHours: number(24).positive() }).strict();
export const eventSchema = z.object({
  id, title: z.string().trim().min(1).max(100), hours: number(24).positive(),
  extras: z.array(z.object({ id, name: z.string().trim().min(1).max(100), watts: number(100000) }).strict()).max(100).refine(unique, 'Duplicate appliance IDs'),
}).strict();
export const homeObject = z.object({
  userName: z.string().trim().min(1).max(100), system: systemSchema,
  appliances: z.array(applianceSchema).max(200).refine(unique, 'Duplicate appliance IDs'),
  cuts: z.array(cutSchema).max(48).refine(unique, 'Duplicate outage IDs'),
  events: z.array(eventSchema).max(100).refine(unique, 'Duplicate event IDs'), setupDone: z.boolean(),
}).strict();
export const homeSchema = homeObject.refine(h => !h.setupDone || h.system.inverterKw > 0, 'Enter a positive inverter size before completing setup');
export const patchSchema = z.object({ revision: z.number().int().nonnegative(), changes: homeObject.partial().strict() }).strict();
export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform(s => s.toLowerCase()),
  password: z.string().min(12, 'Use at least 12 characters for your password').max(128),
  name: z.string().trim().min(1).max(100).optional(),
}).strict();
export const blankHome = (name) => ({ userName: name, system: { panelKw: 0, sunHours: 0, batteryKwh: 0, minChargePct: 20, chargePct: 0, inverterKw: 0 }, appliances: [], cuts: [], events: [], setupDone: false });
