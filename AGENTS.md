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

<!-- AGENT-MEMORY:BEGIN -->
- Backend logic lives in `src/lib/fh/*` (each exports `run(body, env)`), dispatched by one server function in `src/lib/fh.functions.ts`; why: kept the original edge-function modules intact.
- `src/lib/fh/gemini.ts` keeps the `geminiJSON()` name but calls the Lovable AI Gateway SDK; why: callers unchanged.
- Original pages use `src/app/lib/router-compat.tsx` to map react-router-style calls onto TanStack Router; why: minimal port.
- Workspace state lives in localStorage and, when signed in, syncs to the `workspaces` table (see Sign-in below); the provider renders children only after loading it to avoid hydration mismatch.
- Voice interview uses Lovable Live: relay `src/lib/live-relay.server.ts` (dispatched from `src/server.ts` and `live-vite-plugin.ts` in dev), hook `src/hooks/use-live-voice.ts`; goal travels as `/api/live?goal=`, typed answers as `app.text` commentary; why: one persistent relay per call, as the Live skill requires.
- Interview answers are extracted by `src/lib/interview.functions.ts` and normalized by `src/lib/interview.ts` (tested); stored as `ws.interview`.
- `/profile?find=1` auto-starts the online search; why: the walkthrough hands off into the existing prospects flow.
- Shared look lives in `src/styles.css` utilities (btn-primary, btn-secondary, panel) plus `src/components/look/` (Background in root shell, Ticker); why: parallel routes inherit it without per-page styling.
- `/pipeline` and `/road` are standalone full-page routes using shared ink/grain tokens; plan math lives in `src/app/lib/road.ts`; why: minimal screens without the shared header.
- Preview selection is normalized in `src/app/preview/selection.ts` and merged into workspace prospects before rendering; why: selected leads retain their films, drafts and pipeline stages.
- Interview extraction pending state lives only in the workspace context, with the waiting UI on walkthrough; why: navigation happens immediately without persisting a stale loading flag.
<!-- AGENT-MEMORY:END -->
- Outreach lives in `src/lib/fh/outreach.ts` (tested), exposed by `src/lib/outreach.functions.ts`: company suggestions for `/leads` (sites that don't load are dropped), the recipient (Hunter when the optional `HUNTER_API_KEY` secret is set, otherwise a pattern guess labelled as one), and the first email written from the interview answers; why: films and emails use the founder's own words.
- The sender (name, email, role, LinkedIn) is asked on the /interview start page (and editable on /walkthrough) as `ws.sender`, and used as the film sender, the reply contact and the email signature. The main flow is /interview → /leads → /preview → /pipeline; ending the interview skips /walkthrough.
- Sign-in: `src/app/lib/auth.tsx` (AuthProvider in the root shell, `RequireAuth` around /leads, /preview, /walkthrough, /pipeline and the `_app` pages; the /interview start page signs in first). Home stays public.
- Signed-in workspaces sync to `workspaces.data` (newer copy wins on load, debounced upsert) and `ws.sender` to `profiles`; signing out clears the local copy. Logic lives in `src/app/lib/store.tsx`.
- Limits live in `src/lib/limits.server.ts`: per-user daily caps (`LIMITS`), site-wide daily caps (`SITE_LIMITS`), the `FH_PAUSED=1` off switch and `FH_UNLIMITED_USER_IDS`. `spend()` checks, records, re-counts and takes the record back when over; `peek()` checks without recording. The voice interview is counted by the `/api/live` relay when the call opens (`startInterview` only peeks). Only the server writes `usage`; users can read their own rows (`drizzle/migrations/0001_lock_usage_writes.sql`). Why: AI and films run on the host's credits.
- Demo mode (`?demo=1`, kept per tab in sessionStorage until sign-in) bypasses sign-in via `RequireAuthOrDemo` in `src/app/lib/gate.tsx` and must make no server calls; demo prospects seed only in demo mode. Why: the public example costs nothing.
- Films are optional: without `COLDOPEN_API_KEY`, `startFilm` returns `{ disabled: true }` and /preview shows only the email.
- Supplied URLs are fetched with `safeFetch()` (`src/lib/fh/safe-url.ts`), which checks every redirect hop is a public http(s) address.
