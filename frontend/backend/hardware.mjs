import { hardwareConnectionSchema, hardwareControlSchema, hardwareStatusSchema } from '../src/lib/hardware-contract.ts';
const fail = (status, message) => Object.assign(new Error(message), { status });
// Private numeric IP only; no DNS, redirects, arbitrary ports or arbitrary paths.
export async function hardwareRequest(input, control, fetchDevice = fetch) {
  const connection = hardwareConnectionSchema.parse(input);
  const command = control === undefined ? undefined : hardwareControlSchema.parse(control);
  const request = async (path, method = 'GET') => {
    let response;
    try {
      response = await fetchDevice(`http://${connection.ip}${path}`, {
        method, redirect: 'error', signal: AbortSignal.timeout(3000),
        headers: { 'X-Device-Token': connection.token },
      });
    } catch { throw fail(503, 'ESP32 is unreachable. Hardware state is unknown; simulated controls cannot switch the real load.'); }
    if (!response.ok) throw fail(502, `ESP32 rejected the request (${response.status}). Check the token, sensors and firmware settings.`);
    const reader = response.body?.getReader();
    if (!reader) throw fail(502, 'Empty hardware response.');
    let size = 0; const chunks = [];
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw fail(502, 'Hardware response too large.'); } chunks.push(value); } }
    catch (e) { if (e.status) throw e; throw fail(503, 'Hardware response interrupted; relay state is unknown.'); }
    let parsed;
    try { parsed = hardwareStatusSchema.parse(JSON.parse(Buffer.concat(chunks).toString())); }
    catch { throw fail(502, 'Unexpected hardware response. Install matching Volt Bridge firmware.'); }
    if (parsed.mode !== connection.mode) throw fail(409, 'Selected mode does not match the firmware. Read device status before attempting further controls.');
    return parsed;
  };
  const current = await request('/status');
  if (!command) return current;
  if (command.relay && (!current.control_enabled || !current.sensor_ok || current.sample_age_ms > 5000)) throw fail(409, 'Commissioned control and fresh, valid sensor readings are required before switching on.');
  const params = new URLSearchParams({ relay: command.relay ? '1' : '0', timer: String(command.timer_minutes), cutoff: String(command.cutoff_pct), request_id: command.request_id, mode: connection.mode });
  return request(`/control?${params}`, 'POST');
}
