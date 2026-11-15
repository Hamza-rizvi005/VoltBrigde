import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hardwareRequest } from './hardware.mjs';
const connection = { mode: 'PROTOTYPE_5V_DC', ip: '192.168.1.50', token: 'test_device_token_123' };
const status = { schema_version: 1, device_id: 'test', mode: connection.mode, sample_age_ms: 100, sensor_ok: true, control_enabled: true, fault: null, battery_voltage: 3.9, soc_pct: 75, soc_method: 'voltage_estimate', capacity_wh: 7.4, battery_power_w: .8, load_voltage: 3.9, load_current_a: .21, load_power_w: .8, energy_kwh: .001, relay_on: false, uptime_seconds: 0, timer_remaining_seconds: null, cutoff_pct: 20 };
const command = { relay: true, timer_minutes: 1, cutoff_pct: 20, request_id: 'a3d14f01-ffdf-4660-afce-55e4092df3aa' };
test('bridge only sends fixed paths to validated private IPs with token and rejects redirects', async () => {
  const calls = [];
  const mock = async (url, options) => { calls.push({ url, options }); return Response.json(status); };
  await hardwareRequest(connection, command, mock);
  assert.equal(calls[0].url, 'http://192.168.1.50/status');
  assert.equal(calls[1].options.method, 'POST');
  assert.match(calls[1].url, /relay=1&timer=1&cutoff=20/);
  assert.equal(calls[1].options.redirect, 'error');
  assert.equal(calls[1].options.headers['X-Device-Token'], connection.token);
  for (const ip of ['127.0.0.1', '169.254.169.254', '010.0.0.1', '192.168.1.5:3001']) await assert.rejects(hardwareRequest({ ...connection, ip }, command, mock));
  assert.equal(calls.length, 2);
});
test('mode mismatch, stale data and disabled commissioning block ON before control request', async () => {
  for (const change of [{ mode: 'PRODUCTION_220V_AC' }, { sample_age_ms: 6000 }, { sensor_ok: false }, { control_enabled: false }]) {
    let count = 0;
    await assert.rejects(hardwareRequest(connection, command, async () => { count++; return Response.json({ ...status, ...change }); }), e => e.status === 409);
    assert.equal(count, 1);
  }
});
test('OFF remains available with bad sensors; unreachable and malformed devices fail explicitly', async () => {
  let count = 0;
  await hardwareRequest(connection, { ...command, relay: false }, async () => { count++; return Response.json({ ...status, sensor_ok: false, control_enabled: false }); });
  assert.equal(count, 2);
  await assert.rejects(hardwareRequest(connection, undefined, async () => { throw Error('network'); }), e => e.status === 503);
  await assert.rejects(hardwareRequest(connection, undefined, async () => Response.json({ ok: true })), e => e.status === 502);
  await assert.rejects(hardwareRequest(connection, undefined, async () => new Response('x'.repeat(9000))), e => e.status === 502);
});
