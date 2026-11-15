# Volt Bridge — current project context

Updated 2026-11-10. Consolidated context from both Volt Bridge project chats. Read this before continuing the project.

## Current user direction

The user has pivoted from neighborhood electricity trading to household solar load management, based on a problem in their own home. Solar is installed, but battery storage is limited relative to consumption. During load shedding the battery can run down. Their current solar app shows generation and consumption but does not provide the actionable daily planning they want.

Requested product: users enter panel, inverter, battery and appliance details; the platform connects to the solar data source if supported, plans household consumption around generation and outages, visualizes the day, issues actionable notices, and offers a knowledgeable AI assistant. It should handle situations such as extra nighttime consumption for a household event.

The user requested a complete blueprint and subsequently imported a frontend, requested local execution, and authorized navigation improvements. A frontend prototype now exists; real backend integration and hardware control have not been implemented.

## Confirmed application language and usability

The whole application must use plain English, including its AI assistant, setup, navigation, charts, alerts and help. Design for ordinary household users without technical knowledge. Prefer familiar labels such as 'Battery level', 'Power cuts' and 'Plan when to use appliances'. Explain necessary units and keep advanced technical details out of the main flow. This explicit correction supersedes earlier proposals for a Roman Urdu application.

## Primary planning document

Read `docs/SOLAR_LOAD_MANAGEMENT_BLUEPRINT.md` for the proposed product, architecture, numerical planning model, integration gates, AI behavior, MVP, pilot, roadmap and sources.

Confirmed requirements are the user's described workflow. Stack, precise MVP boundaries, four-week schedule, pricing, and connector choices in the blueprint are recommendations, not accepted decisions.

## Important boundaries

- Physical battery capacity cannot be increased by software; infeasible demand must be shown honestly.
- Manual/simulated planning, live monitoring and physical appliance control are different capabilities.
- Exact inverter/app compatibility remains unknown. Do not promise universal integration.
- Aggregate household load does not identify which appliance is running.
- Numerical planning should enforce equipment and energy constraints; AI explains and calls the planner.
- Existing energy-management tools exist. Differentiation is a hypothesis around limited storage, local outages, usable household advice and a plain-English interface.
- Do not present estimated runtime or simulated savings as guaranteed or measured outcomes.

## Working relationship

The user prefers friendly, direct, realistic advice without sugarcoating. Project discussion may follow the user's language, but the application itself must be entirely in English. Explain difficult engineering concepts before asking for technical decisions.

The prior assistant used a name and university details not confirmed by the user in the supplied transcript; do not assume them.

## Open inputs

Inverter brand/model and app, battery configuration/chemistry/capacity, PV size, backup-connected loads, outage windows, data access, team skills and exact Showdown date. The earlier 'about one month' timing was relative to an undated chat, not a confirmed deadline.

## History

Original prior chat: `docs/reference/previous-chat.txt`.
Previous marketplace context: `docs/reference/initial-marketplace-context.md`.
The marketplace and land-rental concepts are deferred by the latest direction. Prior regulatory claims remain historical and unverified; they are not current project requirements.


## Confirmed frontend direction

The user wants a prompt for Claude's free version to generate the frontend. The entire experience must use a dark theme and plain English for ordinary household users. Requested screens include a detailed public landing page, registration, login, and the household planning application described in the blueprint. The user wants distinctive animation and 3D visuals, with https://www.awwwards.com/sites/continuance#elements as an inspiration reference, while remaining strictly relevant to solar, batteries, appliances, power cuts and event planning. This supersedes the earlier proposed light application theme. The reference is inspiration, not permission or a requirement to copy its assets or unrelated novel/character content. This design direction guided the frontend brief. The imported frontend and later navigation changes are recorded below; live integrations remain unimplemented.

## Frontend imported — 2026-11-09

The user's Lovable-exported frontend was copied from `C:\Users\Muslim Abbas\Downloads\Volt Brigde\Front End` into this project's `frontend/` directory. Original files remain in Downloads. The copy was verified using file hashes. This is a local import, not an established GitHub/Lovable sync.

The source uses React, TypeScript, TanStack Start, Vite and Tailwind, with Three.js components. Read `frontend/AGENTS.md` before editing it. Read `frontend/BACKEND.md` for the supplied integration notes. App state currently uses browser localStorage in `frontend/src/lib/store.tsx`; authentication is a demo UI. Energy calculations are in `frontend/src/lib/energy.ts`. Backend notes describe proposed connection points, not completed integrations.

At the import stage, dependencies and checks had not yet been run; the later local setup and validation below supersede that status. Real authentication, database persistence and inverter integrations remain to be implemented. Earlier statements that no frontend exists in this workspace are superseded by this import.

## Default working copy — 2026-11-09
The user asked to run locally and use frontend/ as the default project folder. Application commands and edits should use this folder, not the Downloads export. This convention is saved in AGENTS.md; the desktop app primary-folder setting has not been changed through a tool.

Local run verified on 2026-11-09: dependencies installed with npm (package-lock.json created); npm test passed all 5 tests across 2 files. Vite started at http://127.0.0.1:5173 and landing/dashboard HTTP responses were checked. Run from frontend with: npm run dev -- --host 127.0.0.1 --port 5173 --strictPort. The server must be running to use that address. No production build or browser interaction audit was performed in this setup step.

Landing-page navigation updated: Features, How it works, Demo and FAQ now link to matching sections; mobile navigation includes an expandable menu with Escape handling; feature cards link to existing app routes; FAQ, demo explanation and footer anchors added. Anchor spacing accounts for the sticky header, and smooth scrolling respects reduced-motion preference. Existing 5 tests pass and the landing page returns HTTP 200 with unique section targets.

## Context merged from both project chats — 2026-11-10

Sources:
- Sync conversation context — 01a1babd-b2db-7611-a353-da3796b13f5a (this implementation and planning chat).
- Explain Volt Bridge to Lovable — 01a1c050-c168-7363-bea9-d3ffcb3f1400 (complete available history reviewed: one request and its frontend brief).

The second chat's brief is preserved in `docs/reference/lovable-chat-brief.md`. It restates the household solar-planning direction, plain English, dark theme, relevant animation/3D, landing/auth/setup/planning screens, and honest demo-data boundaries. These agree with this chat's confirmed requirements. The assistant-written brief does not constitute additional user approval for a stack or backend implementation.

Current shared baseline:
- Use `frontend/` for application development; retain context and blueprint in root `docs/`.
- Existing frontend: React/TypeScript/TanStack Start/Vite/Tailwind with Three.js visuals, localStorage demo state and demo authentication.
- Completed: source import, dependency installation, local server launch, landing navigation/mobile menu, feature deep links, FAQ/demo sections and footer anchors.
- Last completed checks: 5 existing tests passed, TypeScript validation passed, landing and dashboard returned HTTP 200. These are previous results, not new checks on the merge date.
- Local command: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Check whether the server is running before claiming it is live.
- Remaining: real authentication, database persistence, validated planning improvements, live inverter connector and genuine AI service integration. These are outstanding areas, not permission to implement all of them in a single step.
- Unresolved inputs: exact household hardware/app, battery configuration, supported telemetry, confirmed competition date and team constraints.

This is a shared-context merge. Original chat histories remain separate in the app; neither chat was deleted, archived, or messaged. No automatic Lovable/GitHub synchronization is established.

## Frontend refinement — 2026-11-15

The user requested a more polished, realistic frontend relevant to household solar planning, with animations. Implemented locally: a calmer dark green palette, a new isometric solar-home illustration with interactive daytime/evening scenarios and animated energy flow, clearer landing-page content, refined application navigation, dashboard planning shortcuts and an energy outlook derived from the existing planner. The hourly chart is explicitly labeled as a sample profile, not a forecast for the configured household. Animations respect reduced-motion preferences. Real integrations and authentication remain unimplemented. The former downloadable ZIP predates these changes.

## Standalone backend — 2026-11-15

The user requested stepwise backend implementation and explicitly chose “Standalone local backend (override that rule)” in response to the Lovable database constraint. They identified the inverter brand as Inverex; exact model and app are still unknown. This supersedes the earlier “backend separately” note and database-management restriction for this local backend only.

Implemented in frontend/backend/: Node HTTP API with SQLite, salted scrypt passwords, revocable expiring cookie sessions, per-user household persistence, strict validation, stale-write protection, origin/host checks, request-size limits and throttling. Frontend registration/login and household editing now use it; anonymous demo data remains separate. Events can be saved/edited/removed and simulated server-side. The daily planner/dashboard use backend energy budgets, essential runtime and overlapping-outage calculations. A rule-based assistant uses saved inputs; it is not a connected language model. New accounts start with empty lists and unset equipment.

Run npm run dev from frontend/ to start both Vite (5173) and API (3001). Private SQLite data lives in frontend/data/ and must be excluded from exports and source control. See frontend/BACKEND.md for API, tests, backup and limitations. No real inverter telemetry, external AI, email recovery, hosted deployment or physical appliance control is implemented. A full interval scheduler with battery power/loss constraints remains a later stage; current estimates are not a guarantee of delivery. The 2026-11-14 ZIP is outdated and contains none of this work.

Verification on 2026-11-15: 9 backend integration/calculation tests and 8 frontend/routing/energy tests passed; TypeScript and production build passed. Local frontend routes returned 200; the proxied API returned 200 for health/session, 401 for unauthenticated private home access, and 422 for invalid registration. Private database/backend paths are denied by Vite. Browser interaction/visual QA was not completed in this backend step.

## Typography and icon preference — 2026-11-15
The user requested more visible fonts and less frequent emoji-like decoration. Increased small text sizes and secondary-text contrast, strengthened headings/labels, and removed repeated decorative icons from feature cards, dashboard summaries and assistant messages. Keep icons mainly for navigation, recognizable controls and the solar illustration. Preserve readable mobile layouts rather than shrinking labels to fit.

## Gemini direction — 2026-11-15
User explicitly requested Gemini integration and project-relevant answers, superseding the earlier Lovable-only model gateway direction for this local backend. Added server-only Gemini adapter, environment configuration, domain instructions, structured relevance responses, timeout, per-account request limits and labeled fallback. The credential supplied in chat was not written to files or used; replacement configuration and live verification remain outstanding. Model prompts are a relevance measure, not a guarantee. Household equipment/planning data and questions are sent to Google when enabled; credentials/account email are excluded.

## Fuller backgrounds and static login — 2026-11-15
The user requested fuller backgrounds and removal of the login background animation. Added layered grid/dot textures, light gradients and section surfaces to the landing and application backgrounds. The shared login/register view now uses a static CSS solar landscape and responsive introductory panel in place of the animated Three.js scene. Preserve the static login background in future visual changes.

## Interactive assistant and dual-mode hardware — 2026-11-15

The user requested a more attractive, interactive assistant and relevant animations. Implemented topic selection (sunny hours, power cuts, evening plans), suggested-question drafting, immediate user messages, a real-request pending indicator, labeled answer sources, error recovery and clear-conversation control. Added interaction motion with reduced-motion support. Login remains static. Existing assistant requests are still single-question calls with home details; prior chat messages are not sent as conversation context.

The user then explicitly authorized a unified HAL and physical relay control for two deployments: `PROTOTYPE_5V_DC` (INA219, GPIO21/22, GPIO26 relay, protected TP4056/18650 and 5V fan) and `PRODUCTION_220V_AC` (Growatt SPF target/Inverex inquiry, RS485 UART1, PZEM004T v3 UART2 GPIO16/17, GPIO26 contactor driver). This supersedes the earlier no-hardware-control scope for this implementation, not the fact that physical operation remains unverified.

Confirmed clarification: protected TP4056 with DW01A and OUT pads, INA219 before the 5V boost converter, ESP32/relay powered by USB or a suitable boost rail. User requested Growatt SPF 5000 ES / Inverex 5kW profile and standard PZEM v3 map. These are requested targets, not proven cross-brand compatibility. Implementation uses the Growatt-authored SPF V0.11 FC04 register profile with commissioning flags disabled by default. It reads inverter-reported SoC; no universal direct-BMS protocol is claimed.

Added dashboard control panel, shared schema-1 telemetry/control types, local-only IP/token bridge, separate interactive simulation, timer/cutoff controls, run-time and measured draw, constant-drain backup/outage-gap estimates using existing manual Karachi-time windows, and illustrative 1,000x prototype power/energy scaling. Device tokens remain in browser memory. Failed acknowledgement marks hardware state unknown; no simulated ON command is replayed on reconnect.

Firmware source: `firmware/volt_bridge_esp32/volt_bridge_esp32.ino`, with configuration example, HAL header, build script and `firmware/README.md`. Defaults to relay OFF; has a separate protection task, sensor freshness/current/voltage cutoffs, timer and 15-second authenticated-contact lease. Residential ON requires profile confirmation and commissioning. No device was flashed or contacted during implementation.

Physical limits: linear 3.0–4.2V SoC is approximate, never exact; a single battery-side INA219 measures branch input current including conversion losses, not 5V-side fan current. TP4056 protection is not a verified load-sharing/power-path design. Correct 3.3V logic compatibility, actual capacity, installer-reviewed mains drivers/protection and hardware validation remain outstanding. Expected K-Electric windows are manual, not utility-verified. Firmware compilation was not performed: Arduino CLI was missing and Windows denied the official download attempt. See firmware documentation for build and commissioning instructions.

## Gemini connection diagnostics — 2026-11-15
User requested fixing Gemini connection and related causes. Confirmed no frontend/.env existed and running health reported rules. Created ignored .env from the empty example. Added explicit missing-key, permission, quota, model, timeout and malformed-response diagnostics without exposing provider payloads or secrets. Environment loading now resolves relative to backend source. Improved sunny-hours fallback question matching. All 23 backend tests passed. A fresh API key and actual live verification remain outstanding.

Gemini activated on 2026-11-15: corrected a key pasted as a standalone .env line into GEMINI_API_KEY. Google model-list request returned HTTP 200 and the configured model was available. A real sample energy question returned mode gemini. Credential was kept in ignored local configuration and not displayed. Backend restarted with network access after sandboxed requests failed.

## Wokwi MQTT connection — 2026-11-15
User requested browser MQTT WebSockets using wss://broker.hivemq.com:8884/mqtt, telemetry topic voltbridge/hamza2026/telemetry and control topic voltbridge/hamza2026/control. Implemented a default Wokwi hardware view with direct packet values, second-based timer commands, mm:ss runtime, and Karachi-time empty/return comparison. Existing local ESP32/demo controls remain selectable. Live badge requires fresh valid non-retained telemetry, goes stale after five seconds, and controls publish non-retained QoS0 commands without offline queueing. Public topics are for simulation. Expected K-Electric return still uses manually saved outage windows.

Wokwi sketch repair: user supplied GPIO34 battery knob, GPIO35 load knob and active-HIGH GPIO26 relay. Added firmware/volt_bridge_wokwi/volt_bridge_wokwi.ino and libraries.txt with 1024-byte MQTT buffer, ArduinoJson parsing, timer reset semantics, reconnect retries, and publish success logging. Preserved initial fan ON and illustrative 1.5 kWh scaled battery. OFF now reports zero controlled fan load and null backup estimate. Separate LED wiring remains unknown. Wokwi compilation and end-to-end execution require importing this sketch into the user's simulator.

## Volt Bridge 3.0 Run — 2026-11-15

User requested running the project as Volt Bridge 3.0 in `c:\Users\hamza\OneDrive\VoltBridge3.0\Volt Bridge`.
- Updated package metadata to `volt-bridge-3.0` (v3.0.0).
- Configured application UI, branding, and navigation headers across the landing page, app shell, dashboard, planner, appliances, power cuts, events, assistant, setup, and auth pages to display `Volt Bridge 3.0` with a dedicated 3.0 version badge.
- Verified all 18 frontend tests and 23 backend integration/calculation tests passed without issues.
- Fixed browser MQTT client loading in `frontend/src/hooks/use-wokwi.ts`: Vite bundles `mqtt` as ESM with default export `mod.default.connect`; updated dynamic import resolution to support both default and named exports. Resolved the "Unable to load the MQTT client" runtime exception, verified in browser reaching "Broker connected. Waiting for fresh Wokwi packets…".
- Added `frontend/scripts/mock-wokwi.mjs` background telemetry provider for demo and testing without requiring manual Wokwi setup. Verified live connection, enabling "Turn Fan ON", "Apply timer", real-time battery/draw telemetry streaming, and timer command reception.
- Synchronized Dashboard with live hardware simulation (`frontend/src/routes/app.dashboard.tsx` and `HardwareControlPanel.tsx`): The battery gauge, usable energy available (kWh), backup hours for essentials, and "Where your battery goes" appliance budget breakdown now dynamically track the active hardware simulation (Wokwi MQTT or local ESP32). Added a toggle ("● Synced" / "Manual") on the battery card. Verified live synchronization in the browser.
- User requested reverting branding from "Volt Bridge 3.0" back to "Volt Bridge" / "VoltBridge". Removed all "3.0" badges, subtitles, package identifiers, and route titles across the application, verified via build and live browser inspection.
- Started the local development server (Vite at http://127.0.0.1:5173/ and backend API at http://127.0.0.1:3001/) with background daemon execution. Both endpoints confirmed responding with HTTP 200.
