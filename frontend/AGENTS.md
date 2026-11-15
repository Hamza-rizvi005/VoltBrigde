<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- Energy maths lives in `src/lib/energy.ts` (pure TS, tested); UI only displays it — keeps estimates consistent and testable.
- App data is demo state in `src/lib/store.tsx` (localStorage) until a backend is added — user is building the backend separately.
- Landing 3D scene (`src/components/three`) is lazy-loaded client-only via SceneBackground — avoids SSR of WebGL.

## Project continuity
This is the default application development folder. Read ../docs/PROJECT_CONTEXT.md for current requirements and decisions; maintain shared context there. This local import has no verified automatic Lovable sync.

## Standalone backend override — user confirmed 2026-11-15
The user explicitly selected a standalone local backend and overrode the Lovable-managed database restriction for this work. Local database code is in backend/ and private SQLite files are in ignored data/. Do not create Supabase/Drizzle migrations or assume any Lovable synchronization. The existing AI gateway rule remains: no live model integration has been configured. Browser localStorage is now for demo mode only; authenticated homes use the local API. Use npm run dev to start both processes.
