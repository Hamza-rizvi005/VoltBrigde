# Volt Bridge — household solar load-management blueprint

Date: 2026-11-08. Status: proposed blueprint based on the user's newly stated problem; not an implemented product or verified household design.

## 1. Product and scope

A household energy-planning assistant for solar homes with limited battery storage and unreliable grid availability. It combines system specifications, household priorities, generation and demand data, expected outages, and planned events to recommend when to run or defer loads and preserve essential backup.

User-confirmed problem: the user's home has solar, but battery capacity is insufficient for its load across some outages. The existing app shows generation and consumption without the desired actionable household planning. The requested product includes equipment and appliance onboarding, solar-app integration, daily visual planning, proactive alerts, and an AI assistant that can plan for higher evening demand such as a household event.

Product promise: help households make informed load decisions with the energy available. Do not promise extra battery capacity, uninterrupted power, guaranteed savings, universal inverter compatibility, or automatic appliance control without compatible hardware.

The former household-to-household energy marketplace and land-rental extension are deferred. They are not part of this MVP.

## 2. Users and jobs

Initial pilot: the user's own home, followed by a small number of consenting households with similar constraints.

Primary jobs:
- Know whether essential loads are likely to survive the next outage.
- Choose an appropriate time for flexible tasks such as pumping water, laundry, or ironing.
- Preserve enough battery for the evening, while accounting for whether it can actually recharge.
- Plan an event with changed loads and duration.
- Respond to unexpected clouds, an outage extension, or increased demand.

Critical distinction: managing recommendations is feasible with manual inputs; observing actual behavior requires telemetry; operating appliances requires additional supported controls.

## 3. Onboarding and minimum data

### System profile

Collect inverter make/model, app name, firmware if available, rated continuous and surge power, backup output limits, and supported data interfaces. Collect PV array kWp, panel orientation/tilt if known, shading, and approximate location. Collect battery chemistry, model, bank voltage and Ah or kWh, wiring configuration, present state of charge, age/known usable capacity, manufacturer/installer-approved reserve and charge/discharge limits.

Battery Ah alone is insufficient to determine bank energy. Voltage and bank configuration matter. Do not infer accurate battery state of charge from voltage alone, particularly for lead-acid batteries. If data is unknown, use an explicit range and ask for label/manual confirmation.

Collect which circuits are on backup versus grid-only, grid charging capability and the user's permission to include it in recommendations, and any known source-priority configuration. Never assume every socket is powered during an outage.

### Appliance profile

For each appliance: name, quantity, circuit, running watts (measured or nameplate estimate), surge if relevant, expected duration/duty cycle, earliest/latest run window, whether interruptible, priority, and acceptable adjustment. Mark every power figure as measured or estimated.

Priorities: essential, important, flexible. User-specific constraints override generic categories. Do not automatically recommend turning off medical or other safety-critical equipment. Refrigeration, pumps, and compressors require appropriate operating constraints rather than arbitrary on/off switching.

### Outages and events

Start with user-entered recurring outage windows plus actual observed outages. Store expected and observed separately. No verified utility schedule API is assumed. Let users report early outages or delayed restoration.

Events: date, start/end, extra appliances and durations, guest count only as context, must-run loads, and flexible alternatives. Guest count alone cannot establish electrical demand. Store times consistently and display in Asia/Karachi.

### Data modes

- Manual: useful for what-if planning; no automatic real-time monitoring claim.
- Recorded replay: historical measurements, clearly labeled and time-shifted only for demos.
- Simulated: synthetic demo data, visibly labeled throughout.
- Live read-only: verified supported inverter/meter connection, with timestamps and freshness status.

## 4. Integration strategy and decision gate

Identify the exact inverter and existing app before promising a connector. Evaluate documented manufacturer API, authorized local interface such as Modbus, or an existing supported Home Assistant integration. The phone app may only be a viewer; the data source may instead be its cloud service or a local gateway.

Use read-only credentials/access where available. Request only needed permissions, keep credentials server-side, and offer disconnect/data deletion. Avoid exposing local inverter interfaces to the public internet. Home Assistant documentation notes that Modbus TCP lacks client authentication and encryption.

Initial integration acceptance: compare PV power, household load, battery SoC, grid state, and timestamps against the vendor app over a measured session; resolve unit and sign conventions. Device readings may have different update intervals. Report missing metrics explicitly.

If a connection is unavailable, ship manual and replay modes honestly while treating live alerts as blocked. CSV import is an option only if the actual vendor supports export. A total household meter cannot reliably identify individual appliance use; use declared schedules or optional per-device meters, and label attribution accordingly.

Hardware gateways and meters may add cost. Assess compatibility before purchasing or promising anything.

## 5. Planning engine

The numerical planner owns energy calculations. A language model cannot invent sensor readings, equipment limits, or feasible schedules.

Use 15-minute planning intervals over a rolling 24–48 hours. Replan after material measurement changes, outage changes, events, or user actions; acquisition frequency depends on the actual data source. A 15-minute interval does not replace instantaneous inverter-overload protection.

Inputs: current usable energy estimate, PV forecast, base-load forecast, appliance tasks, outage scenarios, equipment limits, user priorities, and optionally verified tariffs.

At a consistent AC bus, model power balance:

PV + grid import + battery discharge + unmet demand = scheduled load + battery charge + export + curtailed PV.

Track stored battery energy:

E_next = E_now + efficiency_charge * P_charge * dt - P_discharge * dt / efficiency_discharge.

Use kW and hours to obtain kWh. AC/DC measurements must be normalized so conversion losses are not counted twice. Bound battery energy by configured approved reserve and maximum; constrain charge/discharge power, inverter output, backup circuits, grid availability, task timing and duration. Do not simultaneously charge/discharge or import/export in contradictory ways. If not supported, export is zero.

Treat unmet essential demand as a visible infeasibility result, never as delivered energy. Hard equipment constraints must not be relaxed to make a schedule look successful.

Priority order:
1. Respect physical limits and essential service requirements.
2. Minimize essential unmet demand under conservative outage/PV scenarios.
3. Schedule important and flexible tasks within acceptable windows.
4. Minimize inconvenience and optional grid cost/cycling estimates.

First implement a transparent rule-based scheduler with an energy-balance validator. Consider mathematical optimization later if rules cannot handle competing tasks. Compare expected and conservative scenarios; label ranges as scenarios until calibrated probabilistic forecasts exist.

Cold start: declared appliance schedules and user-entered/available solar estimates. With history, compare recent comparable days, weather-adjusted predictions, and measured behavior. Calibrate usable battery estimates and forecast errors rather than presenting false precision.

## 6. AI assistant

Use an existing language model with structured tools and a curated, versioned knowledge base of supported equipment manuals and product rules. Training a new model is unnecessary for the MVP. Learning consumption patterns is a separate forecasting function; it does not mean training a general chatbot on every household's private data.

Tools: get_home_state, get_data_quality, get_day_plan, simulate_event, compare_scenarios, explain_alert, propose_plan_change. Every calculation returns inputs, timestamps, units, assumptions, and feasibility status.

Flow: understand request -> clarify missing material facts -> call planner -> explain results in plain English -> let user accept a schedule change. Read-only simulation can run immediately; saved plan changes should be explicit. No direct electrical switching or inverter-setting tool in the MVP.

Example: 'We have guests tonight from 8 pm to midnight' triggers a request for extra loads and duration, then normal/event/reduced-load scenarios. If energy is inadequate, explain the shortfall and tradeoffs. Never assure the user that a plan works simply to satisfy their request.

If the model service fails, dashboards, calculations, and rule alerts still work.

## 7. User experience

Screens:
1. Setup: home, system, backup circuits, appliance priorities, outage windows, data mode.
2. Today: current state, next outage, predicted essential-load coverage, data freshness, next action.
3. Day planner: PV/load curves, battery projection band, outage shading, appliance timeline, reserve line.
4. Appliances: priorities, schedules, power estimates, measured-versus-declared status.
5. Event planner: event inputs, alternatives, unmet demand, comparison with normal day.
6. Assistant: context-aware conversation with calculation cards.
7. Alerts/history: reason, proposed action, accept/dismiss feedback, and resulting updated estimate.

Display a visible 'Live readings', 'Entered by you', 'Recorded readings', or 'Demo data' badge. Distinguish 'Expected' values from 'Measured' values and values 'Entered by you'. Show when the battery level and electricity-supply status were last updated. Display estimated backup time as a conditional range, not an exact promise.

### Confirmed language and usability requirements

The user explicitly requires the whole application to be in English. This applies to navigation, setup, charts, notifications, assistant responses, help, validation messages, and errors. The language used in project discussions does not change the application's language.

Write for ordinary household users with no solar or electrical background. Use short sentences, familiar words, and clear actions. Show what is happening, why it matters, and what the user can do. Do not expose backend terms, acronyms, or engineering calculations in the main user flow. Technical detail can remain in this blueprint and in an optional 'System details' view.

Suggested product wording:

| Internal concept | Main interface wording |
|---|---|
| State of charge / SoC | Battery level |
| PV generation | Solar power now |
| Household load | Power your home is using |
| Load shedding | Power cuts |
| Grid availability | Electricity supply: available / off |
| Load scheduling | Plan when to use appliances |
| Essential loads | Appliances you need to keep running |
| Flexible loads | Appliances you can use later |
| Minimum reserve | Battery level to keep in reserve |
| Forecast | Expected solar power / expected battery level |
| Infeasible plan | There may not be enough power for this plan |
| Stale telemetry | Readings have not updated |

Keep units accurate and explain them when needed: kW is power being used or produced now; kWh is energy used or stored over time. Do not swap power and energy to simplify a label. Show backup estimates as 'About 3 hours at your current use', with assumptions accessible nearby.

Example notification: 'Your battery may not last through the next power cut. Try using the washing machine after the power returns.' Only recommend this when supported by the current plan. Do not claim an appliance is running unless measured or confirmed by the user.

Example missing-data message: 'We have not received new readings for 20 minutes. Your backup estimate may have changed.'

Example event prompt: 'What extra appliances will you use, and for how long?'

Offer 'I do not know' for unfamiliar setup details, with guidance for finding them on the equipment label or in the existing solar app. Never silently replace missing specifications with confident estimates. Keep advanced settings optional, use text alongside chart colors, and explain the main takeaway beside each chart.

## 8. Alerts and real-world exceptions

- Generation below plan: recompute evening reserve; suggest deferring a declared flexible task.
- Outage approaching: show expected reserve shortfall and options that are actually supported.
- Higher-than-expected load: request checking active appliances; do not invent appliance identification.
- Outage extended: conserve essentials and show revised service duration.
- Battery level uncertain or stale: stop claiming reliable live runtime; request an update.
- Internet/cloud failure: retain cached plan with a stale timestamp; notifications are not guaranteed offline.
- Infeasible evening event: quantify missing energy and propose shorter/lower-power alternatives.
- Equipment fault: surface available manufacturer fault information; do not diagnose battery damage from a single low reading.

Add persistence thresholds, hysteresis, cooldown, severity levels, and acknowledgement to avoid notification floods. In-app alerts are core; browser push requires user permission and delivery testing on target phones. SMS/other channels are later integrations with explicit consent and costs.

## 9. Worked illustration, not household sizing

Assume 5 kWh is the effective full battery capacity, current SoC 80%, approved illustrative reserve 20%, and discharge-path efficiency 90%. Available AC energy above reserve is approximately:

5 * (0.80 - 0.20) * 0.90 = 2.7 kWh.

With no solar or grid input and steady 450 W AC load including relevant overhead, estimated time to reserve is 2.7 / 0.45 = 6 hours. At 900 W, it is 3 hours. These values are illustrative and omit varying loads and uncertainty; the 20% reserve is not a recommendation for all batteries.

An evening event drawing a total average 900 W for 4 hours needs 3.6 kWh. Against 2.7 kWh available, the shortfall is 0.9 kWh before an uncertainty allowance. Moving 300 W of flexible demand out of the entire 4-hour window reduces demand to 2.4 kWh; that leaves only 0.3 kWh margin and must still be checked for peak power and actual earlier energy availability. Do not assume deferred consumption disappears.

## 10. Proposed software architecture

Mobile-friendly web/PWA -> authenticated backend -> telemetry normalization and storage -> forecast service -> deterministic planner -> alerts and dashboard.

Assistant calls the backend planner and approved knowledge retrieval. Optional future local gateway feeds telemetry; physical controls remain outside the MVP.

Pragmatic proposed stack: React/TypeScript frontend, Python/FastAPI backend, PostgreSQL storage, a simple background worker/scheduler, and a model API behind a provider adapter. These are proposals, not installed dependencies or final decisions; use the team's existing skills if that reduces build risk. Pin versions and verify official docs during implementation. Avoid microservices for the first build.

Core entities: users, homes, equipment, backup_circuits, appliances, telemetry_samples, outage_windows, forecasts, events, plans, plan_actions, alerts, consent_records. Scope all data by household and access rights. Store sources, quality flags, units, observed_at and received_at with measurements; store input snapshot and version with each generated plan.

Core API contracts: read home state; update declared appliance schedule; ingest authorized measurements; add expected/observed outage; simulate event; generate/read plan; acknowledge alert. Simulation must not mutate an accepted plan.

## 11. MVP boundaries and four-week proposal

This is a proposed four-week effort allocation, not a confirmed event deadline or delivery guarantee.

Week 1: verify equipment/data access, record home baseline, model appliance priorities and outages, build onboarding and energy-balance simulator. Decide whether the demo can include live telemetry; do not spend the entire month chasing a closed API.

Week 2: daily planner, battery graph, outage overlays, manual/replay data modes, and one read-only connector if feasible.

Week 3: event simulations, structured assistant tools, useful alert rules, and failure/data-quality states.

Week 4: household pilot/replay evaluation, forecast and usability corrections, demo preparation, and honest results reporting.

Must-have: one-home workflow, equipment/load entry, outage schedule, deterministic plan, visual comparison, event simulation, and actionable alerts in a clearly labeled data mode. Assistant should explain actual planner output.

Defer: universal inverter support, automatic mains switching, energy trading, land marketplace, billing/payment systems, own-model training, and complex appliance identification from total load.

## 12. Validation and success measures

Numerical tests: energy conservation and units; reserve and power bounds; empty/full battery; zero sun; absent grid; extended outage; no feasible solution; impossible task deadlines; stale/missing/duplicate readings; event cancellation; grid-only circuit during outage. Verify charge/discharge signs against source readings.

Assistant checks: no invented sensor values, asks for missing event loads, preserves household priorities, rejects unsafe/infeasible promises, treats retrieved text as reference not instructions, and does not change an accepted plan invisibly.

Evaluate battery-SoC and load forecast error on held-out recorded periods, reserve-breach warning lead time, false alert rate, user completion of suggested changes, and critical-load unmet energy in scenario replay. Track prediction coverage and data freshness.

Compare unchanged behavior and recommended schedules under the same weather, outage, and demand assumptions. Replay differences are simulated benefits, not proven real-world savings. Pilot results must disclose weather and behavior differences; do not advertise a percentage benefit before measurement.

Showdown demo: load a clearly labeled household scenario, display impending shortfall, add a nighttime event, show the deficit, accept a feasible reduced-load schedule, then simulate clouds or an extended outage and show replanning. Include an infeasible scenario to demonstrate honesty.

## 13. Business hypothesis and dependencies

Potential route: direct household planner, followed by installer partnerships for supported-system onboarding. Test whether households will use and pay for actionable planning before selecting subscription pricing. A free/manual tier and paid connected tier are hypotheses, not decisions.

Costs to estimate: hosting/database, model usage, forecast service, notification delivery, integration support, and optional gateway/meter hardware. Avoid quoting unverified prices or claiming hardware-free integration for every home.

Defensibility hypothesis: a simple, plain-English experience for nontechnical households, local outage planning, constrained-battery scenarios, and measured compatibility with selected common systems. The category already exists; differentiation and demand remain to be validated.

## 14. Evidence checked on 2026-11-08

- Victron Dynamic ESS describes scheduling using solar forecasts, consumption, battery constraints, and tariffs: https://www.victronenergy.com/media/pg/Dynamic_ESS/en/introduction.html . This is evidence of existing energy planning, not proof that it supports this user's system or proposed local workflow.
- Home Assistant Modbus documentation describes supported device connections and the protocol's network-security limits: https://www.home-assistant.io/integrations/modbus/ . Device-specific support still needs confirmation.
- Forecast.Solar describes location/orientation-based solar forecasts: https://forecast.solar/ . At lookup its page displayed a maintenance notice; provider availability, Karachi performance, terms, and fallback behavior must be checked before adoption.

## 15. Information needed next

Inverter brand/model and existing app; panel total kWp; battery model/chemistry/quantity/voltage/Ah or kWh; backup-connected loads and approximate usage; usual outage windows; any existing data export; team skills and confirmed event date. Do not request account passwords. Equipment-label photos can help if the user chooses to provide them.

