# Volt Bridge local backend

## Run

Use Node.js 24.15 or later in the 24.x line. From frontend/:

    npm install
    npm run dev

Open http://127.0.0.1:5173. The command starts Vite on port 5173 and the API on 127.0.0.1:3001. Vite proxies /api to the backend. Stop with Ctrl+C. Use one instance; occupied ports cause startup to fail. Individual commands: npm run dev:web and npm run dev:api.

Create an account through /register (12–128 character password). New accounts have empty appliance/outage/event lists and zero equipment values until setup. No email verification or password-reset service is configured. Do not confuse this local account with Lovable or a deployed account.

## Implemented stages

1. **Local persistence and authentication.** SQLite users, household documents, sessions and latest plan snapshots. Passwords are salted and scrypt-hashed. Sessions use random tokens stored hashed in the database; browser cookies are HttpOnly/SameSite=Strict with seven-day expiry. Logout revokes the current session. Authentication attempts are throttled.
2. **Saved household data.** Equipment, appliances, recurring daily expected outages and events persist per account. Server validation rejects invalid values, duplicate IDs and unknown fields. Revision checks reject stale-tab writes. Failed saves remain visible; they do not display as successful. Demo data stays separate in localStorage and is never silently imported into an account.
3. **Server calculations.** Daily energy budget, essential backup estimate, merged overlapping/overnight outage duration, event simulation, inverter overload flags and actionable alerts. Latest plan stores its source snapshot and revision. Event simulation does not modify the saved home.
4. **Rule-based assistant.** Authenticated questions use the caller's saved household calculations. This is deliberately labeled rule-based; no external AI service is connected.

## API

All private resources are scoped to the session. No user/household ID is accepted from callers to choose a different owner.

- GET /api/health — capability/readiness status
- POST /api/auth/register — {email,password,name}
- POST /api/auth/login — {email,password}
- GET /api/auth/session — current user, home and revision, or user:null
- POST /api/auth/logout — revoke session
- GET /api/home — current home and revision
- PATCH /api/home — {revision,changes}; 409 on stale write
- GET /api/plan — calculated plan and assumptions; stores latest snapshot
- POST /api/events/simulate — {id,title,hours,extras:[{id,name,watts}]}
- POST /api/assistant — {question}; calculated guidance with mode:rules

Writes require a trusted Origin header: http://127.0.0.1:5173 or http://localhost:5173. JSON requests are capped at 128 KiB. Malformed/invalid requests return 400/422, unauthenticated requests 401, forbidden origins 403, and throttled requests 429. No arbitrary CORS origins are enabled.

## Storage and backup

Default database: frontend/data/voltbridge.sqlite (plus WAL/SHM files while active). VOLT_DB_PATH may select another path. This data directory and .env files are ignored by Git. Never include data/ in source ZIP exports: it contains private accounts and household records. For a simple backup, stop the API cleanly first and copy the database file to a protected location. For restore, stop the API before replacing the file. Do not delete the live database to reset a development problem.

## Verification

    npm run test:backend
    npm test
    npx tsc --noEmit
    npm run build

Backend tests use isolated in-memory/temporary databases and cover ownership, password hashing, authentication, revocation, expiry, validation, throttling, CSRF/origin protection, body size, conflict handling, persistent restart, overlap handling and event constraints.

## Remaining stages and boundaries

- Exact Inverex model, solar app and authorized interface are needed before adding telemetry. Manufacturer is user-confirmed; model and connection are unknown. No hardware control is implemented.
- Live AI needs a configured provider/gateway and server-side credentials. Do not enter secrets into frontend code or chat. The repository's Lovable gateway rule has not been overridden.
- The current planner is a manual energy-budget/scenario tool, not a validated 15-minute dispatch scheduler. It does not model conversion loss, battery charge/discharge limits, surge loads, forecast uncertainty, actual appliance timing or grid recharge. Daily surplus is not a guarantee of hourly supply. These are the next numerical-planning stage.
- Local service only. It listens on loopback and rejects non-local hosts. It is not a hosted deployment: the frontend production build does not bundle this API. Hosted operation requires an explicit deployment architecture, HTTPS/Secure cookies, durable hosted storage/backups, trusted origin settings, recovery/email flows and operational monitoring. Do not expose this development service to the internet.

References consulted: https://nodejs.org/api/sqlite.html and https://nodejs.org/docs/latest-v24.x/api/crypto.html. No new package dependencies were needed.

Gemini integration (2026-11-15): Copy .env.example to .env and set a replacement GEMINI_API_KEY locally. Restart npm run dev. Never use VITE_ for this key. The backend sends questions, equipment, appliance details and calculated plans to Google, excluding account email and password. Gemini answers are constrained by a domain-specific system instruction and structured relevance decision; this reduces off-topic responses but is not an absolute guarantee. Provider failures return explicitly labeled calculated fallback. No tool execution or hardware control is granted. Model is configurable with GEMINI_MODEL. Live authentication remains unverified until a valid replacement key is configured.
