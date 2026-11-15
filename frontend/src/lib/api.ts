export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method, credentials: "same-origin", headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({ error: "The local backend is unavailable. Start it with npm run dev." }));
  if (!response.ok) throw new Error(data.issues?.length ? `${data.error} ${data.issues[0].field}: ${data.issues[0].message}` : data.error || "Request failed.");
  return data as T;
}
export type SavedEvent = { id: string; title: string; hours: number; extras: { id: string; name: string; watts: number }[] };
export type Plan = {
  revision: number; generatedAt: string; backupHours: number | null; outageHours: number; availableKwh: number; outageNeedKwh: number;
  balance: { solar: number; load: number; surplus: number; exceeds: boolean };
  alerts: { code: string; tone: "ok" | "warn" | "bad"; text: string }[];
  flexible: { id: string; name: string; hours: number; kwh: number; exceedsInverter: boolean }[];
  assumptions: string[];
  events: (EventResult & { id: string })[];
};
export type EventResult = { title: string; watts: number; availableKwh: number; neededKwh: number; shortfallKwh: number; overloaded: boolean; feasible: boolean; assumptions: string };
