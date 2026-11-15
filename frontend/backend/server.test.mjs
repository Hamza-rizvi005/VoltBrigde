import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackend } from './server.mjs';
import { outageHours, simulateEvent } from './planning.mjs';
import { blankHome } from './contracts.mjs';

const password = 'test-only-password-42';
async function fixture(t, options = {}) {
  const app = createBackend({ database: ':memory:', authLimit: 100, ...options });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.server.address().port}`;
  const request = async (path, method = 'GET', data, cookie, headers = {}) => {
    const res = await fetch(url + '/api' + path, { method, headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], headers: res.headers };
  };
  const register = email => request('/auth/register', 'POST', { email, password, name: 'Test home' });
  return { ...app, request, register };
}
const equipment = { panelKw: 3, sunHours: 5, batteryKwh: 5, chargePct: 80, minChargePct: 20, inverterKw: 3 };
const appliance = { id: 'fridge', name: 'Fridge', watts: 150, hoursPerDay: 24, essential: true, flexible: false };

test('registration, hashed passwords, session restoration, login failure and logout revocation', async t => {
  const f = await fixture(t);
  const a = await f.register('person@example.com');
  assert.equal(a.status, 201); assert.deepEqual(a.data.state.appliances, []);
  assert.match(a.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const row = f.db.prepare('SELECT * FROM users').get();
  assert.notEqual(row.password_hash, password); assert.equal(row.password_hash.length, 128);
  assert.equal((await f.request('/auth/session', 'GET', undefined, a.cookie)).data.user.email, 'person@example.com');
  assert.equal((await f.request('/auth/login', 'POST', { email: 'person@example.com', password: 'incorrect-password' })).status, 401);
  assert.equal((await f.request('/auth/logout', 'POST', {}, a.cookie)).status, 200);
  assert.equal((await f.request('/home', 'GET', undefined, a.cookie)).status, 401);
  assert.equal((await f.request('/auth/login', 'POST', { email: 'PERSON@example.com', password })).status, 200);
});
test('household isolation and revision conflicts prevent cross-account and stale writes', async t => {
  const f = await fixture(t), a = await f.register('a@example.com'), b = await f.register('b@example.com');
  const update = await f.request('/home', 'PATCH', { revision: 0, changes: { system: equipment, appliances: [appliance], setupDone: true } }, a.cookie);
  assert.equal(update.status, 200); assert.equal(update.data.revision, 1);
  assert.equal((await f.request('/home', 'GET', undefined, b.cookie)).data.state.appliances.length, 0);
  assert.equal((await f.request('/home', 'PATCH', { revision: 0, changes: { userName: 'old edit' } }, a.cookie)).status, 409);
  assert.equal((await f.request('/home', 'PATCH', { revision: 0, changes: { user_id: a.data.user.id } }, b.cookie)).status, 422);
  assert.equal((await f.request('/home')).status, 401);
});
test('validation rejects impossible values, duplicate IDs and invalid outage times', async t => {
  const f = await fixture(t), a = await f.register('valid@example.com');
  for (const changes of [{ system: { ...equipment, chargePct: 101 } }, { appliances: [appliance, appliance] }, { appliances: [{ ...appliance, watts: -1 }] }, { cuts: [{ id: 'x', start: '25:00', durationHours: 2 }] }, { setupDone: true }]) {
    assert.equal((await f.request('/home', 'PATCH', { revision: 0, changes }, a.cookie)).status, 422);
  }
  assert.equal((await f.request('/home', 'GET', undefined, a.cookie)).data.revision, 0);
});
test('origin enforcement, body limits, credentials limits and session expiry', async t => {
  const f = await fixture(t), a = await f.register('security@example.com');
  assert.equal((await f.request('/auth/logout', 'POST', {}, a.cookie, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.request('/auth/logout', 'POST', {}, a.cookie, { Origin: '' })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => { const req = httpRequest({ host: '127.0.0.1', port: f.server.address().port, path: '/api/home', headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); req.end(); });
  assert.equal(hostStatus, 403);
  assert.equal((await f.request('/assistant', 'POST', { question: 'x'.repeat(140000) }, a.cookie)).status, 413);
  assert.equal((await f.request('/auth/register', 'POST', { email: 'short@example.com', password: 'short' })).status, 422);
  f.db.prepare('UPDATE sessions SET expires=0').run();
  assert.equal((await f.request('/home', 'GET', undefined, a.cookie)).status, 401);
});
test('authentication attempts are rate limited', async t => {
  const f = await fixture(t, { authLimit: 1 });
  await f.register('rate@example.com');
  assert.equal((await f.register('another@example.com')).status, 429);
});
test('event save, server calculation, plan snapshot and assistant use owned home', async t => {
  const f = await fixture(t), a = await f.register('planner@example.com');
  const event = { id: 'dinner', title: 'Dinner', hours: 4, extras: [{ id: 'kettle', name: 'Kettle', watts: 3500 }] };
  await f.request('/home', 'PATCH', { revision: 0, changes: { system: equipment, appliances: [appliance], events: [event], setupDone: true } }, a.cookie);
  const result = await f.request('/events/simulate', 'POST', event, a.cookie);
  assert.equal(result.data.overloaded, true); assert.equal(result.data.shortfallKwh, 11.6);
  assert.equal((await f.request('/home', 'GET', undefined, a.cookie)).data.revision, 1); // simulation is read-only
  const plan = await f.request('/plan', 'GET', undefined, a.cookie);
  assert.equal(plan.data.events[0].title, 'Dinner'); assert.equal(plan.data.backupHours, 20);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM plans').get().n, 1);
  assert.match((await f.request('/assistant', 'POST', { question: 'How long will backup last?' }, a.cookie)).data.answer, /20 hours/);
  const result2 = await f.request('/home', 'PATCH', { revision: 1, changes: { events: [] } }, a.cookie);
  assert.deepEqual(result2.data.state.events, []);
});
test('overlapping and overnight cuts are counted once', () => {
  assert.equal(outageHours([{ start: '23:00', durationHours: 3 }, { start: '01:00', durationHours: 2 }]), 4);
  assert.equal(outageHours([{ start: '08:00', durationHours: 24 }, { start: '20:00', durationHours: 4 }]), 24);
});
test('reserve and inverter constraints remain visible in event scenarios', () => {
  const home = { ...blankHome('test'), system: { ...equipment, chargePct: 10 }, appliances: [appliance] };
  const result = simulateEvent(home, { title: 'test', hours: 1, extras: [] });
  assert.equal(result.availableKwh, 0); assert.equal(result.shortfallKwh, .15); assert.equal(result.feasible, false);
});
test('account, session and household changes survive closing and reopening SQLite', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'voltbridge-test-'));
  const database = join(directory, 'test.sqlite');
  // Cleanup is restricted to the freshly-created test directory, never application data.
  const first = createBackend({ database });
  await new Promise(r => first.server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${first.server.address().port}`;
  const res = await fetch(origin + '/api/auth/register', { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'persist@example.com', password, name: 'Persistent home' }) });
  const cookie = res.headers.get('set-cookie').split(';')[0]; await res.json(); await first.close();
  const second = await fixture(t, { database });
  t.after(() => { if (!directory.startsWith(join(tmpdir(), 'voltbridge-test-'))) throw new Error('Unsafe test cleanup path'); rmSync(directory, { recursive: true, force: true }); });
  assert.equal((await second.request('/home', 'GET', undefined, cookie)).data.state.userName, 'Persistent home');
});

test('hardware bridge enforces local origin and rejects bad inputs before contacting devices', async t => {
  const f = await fixture(t);
  const data = { connection: { ip: '127.0.0.1', token: 'test_device_token_123', mode: 'PROTOTYPE_5V_DC' } };
  assert.equal((await f.request('/hardware/status', 'POST', data, undefined, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.request('/hardware/status', 'POST', data)).status, 422);
  assert.equal((await f.request('/hardware/control', 'POST', { connection: { ...data.connection, ip: '192.168.1.50' }, control: { relay: true, timer_minutes: -1 } })).status, 422);
});
