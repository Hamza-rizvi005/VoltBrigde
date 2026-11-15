import { geminiAnswer } from './gemini.mjs';
import { hardwareRequest } from './hardware.mjs';
import { loadEnvFile } from 'node:process';
try { loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { credentialsSchema, blankHome, homeSchema, patchSchema, eventSchema } from './contracts.mjs';
import { makePlan, simulateEvent, answerQuestion } from './planning.mjs';

const derive = promisify(scrypt);
const hash = s => createHash('sha256').update(s).digest('hex');
const lifetime = 7 * 24 * 3600;
const fail = (status, message) => Object.assign(new Error(message), { status });
const passwordHash = async (password, salt) => (await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');

export function createBackend({ database = resolve('data/voltbridge.sqlite'), origins = ['http://127.0.0.1:5173', 'http://localhost:5173'], secureCookies = false, authLimit = 20 } = {}) {
  if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS homes (user_id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS plans (user_id TEXT PRIMARY KEY REFERENCES users(id), revision INTEGER NOT NULL, snapshot TEXT NOT NULL, result TEXT NOT NULL);
    PRAGMA user_version=1;`);
  const throttle = new Map();
  function limit(key, max) {
    const now = Date.now();
    for (const [k, v] of throttle) if (now > v.until) throttle.delete(k);
    const entry = throttle.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    entry.count++; throttle.set(key, entry);
    if (entry.count > max) throw fail(429, 'Too many attempts. Try again in 15 minutes.');
  }
  function session(req) {
    const token = /(?:^|;\s*)vb_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
    if (!token) return null;
    const row = db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires>?').get(hash(token), Date.now());
    return row ? { id: row.user_id, token } : null;
  }
  function envelope(userId) {
    const home = db.prepare('SELECT data, revision FROM homes WHERE user_id=?').get(userId);
    const user = db.prepare('SELECT id, email FROM users WHERE id=?').get(userId);
    return { user, state: JSON.parse(home.data), revision: home.revision };
  }
  function cookie(res, token, age = lifetime) {
    res.setHeader('Set-Cookie', `vb_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${secureCookies ? '; Secure' : ''}`);
  }
  function login(res, id) {
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), id, Date.now() + lifetime * 1000);
    cookie(res, token);
    return envelope(id);
  }
  const send = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Send JSON data.');
    let size = 0; const chunks = [];
    for await (const chunk of req.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > 128 * 1024) { req.resume(); throw fail(413, 'Request is too large.'); } chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw fail(400, 'Invalid JSON.'); }
  }
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const method = req.method;
      // This server is deliberately local-only. Reject browser cross-origin access and DNS rebinding hosts.
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host ?? '')) throw fail(403, 'Unrecognized host.');
      if (req.headers.origin && !origins.includes(req.headers.origin)) throw fail(403, 'Origin not allowed.');
      if (!['GET', 'HEAD'].includes(method) && !origins.includes(req.headers.origin)) throw fail(403, 'A trusted Origin header is required.');
      if (path === '/api/health' && method === 'GET') return send(res, 200, { ok: true, storage: 'sqlite', liveInverter: false, assistant: process.env.GEMINI_API_KEY ? 'gemini-configured' : 'rules' });
      const current = session(req);
      // Local console bridge, also available in demo mode. Trusted Origin is enforced above.
      // Device token is supplied per request and is never stored or logged.
      if (['/api/hardware/status', '/api/hardware/control'].includes(path) && method === 'POST') {
        limit(`hardware:${req.socket.remoteAddress}`, 1200);
        const input = await body(req);
        return send(res, 200, await hardwareRequest(input.connection, path.endsWith('/control') ? input.control ?? {} : undefined));
      }
      if (path === '/api/auth/session' && method === 'GET') return send(res, 200, current ? envelope(current.id) : { user: null });
      if (['/api/auth/register', '/api/auth/login'].includes(path) && method === 'POST') {
        limit(`auth:${req.socket.remoteAddress}`, authLimit);
        const input = credentialsSchema.parse(await body(req));
        let user = db.prepare('SELECT * FROM users WHERE email=?').get(input.email);
        if (path.endsWith('/register')) {
          if (user) throw fail(409, 'An account with this email already exists.');
          const id = randomUUID(), salt = randomBytes(16).toString('hex');
          const password = await passwordHash(input.password, salt);
          db.exec('BEGIN IMMEDIATE');
          try {
            db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id, input.email, salt, password);
            db.prepare('INSERT INTO homes VALUES(?,?,0)').run(id, JSON.stringify(blankHome(input.name || 'My home')));
            db.exec('COMMIT');
          } catch (e) { db.exec('ROLLBACK'); if (String(e).includes('UNIQUE')) throw fail(409, 'An account with this email already exists.'); throw e; }
          return send(res, 201, login(res, id));
        }
        const computed = await passwordHash(input.password, user?.salt ?? '00000000000000000000000000000000');
        if (!user || !timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(user.password_hash, 'hex'))) throw fail(401, 'Email or password is incorrect.');
        return send(res, 200, login(res, user.id));
      }
      if (!current) throw fail(401, 'Please sign in to access your saved home.');
      limit(`api:${current.id}`, 600);
      if (path === '/api/auth/logout' && method === 'POST') { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(current.token)); cookie(res, '', 0); return send(res, 200, { ok: true }); }
      if (path === '/api/home' && method === 'GET') return send(res, 200, envelope(current.id));
      if (path === '/api/home' && method === 'PATCH') {
        const { revision, changes } = patchSchema.parse(await body(req));
        const old = envelope(current.id);
        if (old.revision !== revision) throw fail(409, 'Your home changed in another tab. Reload before saving.');
        const next = homeSchema.parse({ ...old.state, ...changes });
        const result = db.prepare('UPDATE homes SET data=?, revision=revision+1 WHERE user_id=? AND revision=?').run(JSON.stringify(next), current.id, revision);
        if (!result.changes) throw fail(409, 'Your home changed. Reload before saving.');
        return send(res, 200, envelope(current.id));
      }
      const home = envelope(current.id);
      if (path === '/api/plan' && method === 'GET') {
        const plan = makePlan(home.state, home.revision);
        db.prepare('INSERT INTO plans VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,result=excluded.result').run(current.id, home.revision, JSON.stringify(home.state), JSON.stringify(plan));
        return send(res, 200, plan);
      }
      if (path === '/api/events/simulate' && method === 'POST') return send(res, 200, simulateEvent(home.state, eventSchema.parse(await body(req))));
      if (path === '/api/assistant' && method === 'POST') {
        const { question } = z.object({ question: z.string().trim().min(1).max(2000) }).strict().parse(await body(req));
        limit(`assistant:${current.id}`, 30);
        return send(res, 200, await geminiAnswer(home.state, question, home.revision));
      }
      throw fail(404, 'Endpoint not found.');
    } catch (error) {
      if (error instanceof z.ZodError) return send(res, 422, { error: 'Check the entered values.', issues: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
      if (!error.status) console.error('Backend request failed:', error.message);
      send(res, error.status ?? 500, { error: error.status ? error.message : 'Unable to complete the request.' });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return { server, db, close: () => new Promise((resolve, reject) => server.close(e => { db.close(); e ? reject(e) : resolve(); })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const backend = createBackend({ database: process.env['VOLT_DB_PATH'] || resolve('data/voltbridge.sqlite') });
  backend.server.listen(3001, '127.0.0.1', () => console.log('Volt Bridge API: http://127.0.0.1:3001'));
  backend.server.on('error', error => { console.error(error.message); process.exit(1); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => backend.close().then(() => process.exit(0)));
}
