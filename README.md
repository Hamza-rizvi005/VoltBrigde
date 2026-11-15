# Volt Bridge

A proposed household solar energy-planning assistant for homes with limited battery storage and load shedding, starting with the user's home in Karachi.

It aims to turn system and household data into daily load schedules, battery forecasts, actionable alerts and AI-assisted event planning.

- [Current project context](docs/PROJECT_CONTEXT.md)
- [Complete load-management blueprint](docs/SOLAR_LOAD_MANAGEMENT_BLUEPRINT.md)
- [Original previous chat](docs/reference/previous-chat.txt)
- [Earlier marketplace concept](docs/reference/initial-marketplace-context.md)

Status: frontend prototype and standalone local backend implemented. Accounts, saved household data, energy-budget calculations and event scenarios run locally. Live inverter/AI integrations and a full interval scheduler remain pending. Earlier electricity-trading and land-rental ideas are deferred.

Product requirement: the entire application and AI assistant use plain English that ordinary household users can understand.

Frontend source is now in `frontend/`. See [backend integration notes](frontend/BACKEND.md). Run `npm run dev` from `frontend/` to start the frontend and local API. Live inverter connections are not implemented.

Both project chats are consolidated in [shared project context](docs/PROJECT_CONTEXT.md). The second chat's [Lovable brief](docs/reference/lovable-chat-brief.md) is preserved as reference.
