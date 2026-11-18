# Moving First Hundred into Lovable (venue checklist)

Goal: the submitted project is a Lovable project, with credits spent on backend, auth and polish, not scaffolding.

## 1. Create and connect (about 5 min, ~1 credit)
1. Lovable → New project → first prompt: `Blank React + Vite + Tailwind app named First Hundred. Enable Lovable Cloud.`
2. Project settings → GitHub → Connect. Lovable creates a repo (e.g. `first-hundred-lovable`).
3. On a laptop:
   ```bash
   git clone <lovable-repo-url> lovable && cd lovable
   rsync -a --exclude .git --exclude node_modules --exclude src/integrations ../first-hundred/ ./
   git add -A && git commit -m "Import First Hundred" && git push
   ```
   Keep Lovable's own `src/integrations/supabase/*` and `.env` (it holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`). `src/lib/api.ts` picks those up automatically and calls the edge functions instead of the local dev API.

## 2. Backend (prompts, in this order)
- **Secrets:** Lovable Cloud → Secrets → add `GEMINI_API_KEY` (and `GEMINI_MODEL=gemini-flash-latest`).
- **Prompt A:** `Deploy the edge functions in supabase/functions: analyze-site, search-signals, score-signals, draft-message, event-signals, rehearse-call. They share code in supabase/functions/_shared. Set verify_jwt to false for all of them. Don't change their code.`
- **Prompt B (optional, switch AI to Lovable AI):** `In supabase/functions/_shared/gemini.ts, call the Lovable AI gateway instead of the Gemini API, keeping the geminiJSON() signature and JSON output.`

Test: open the published preview, run a URL, then add this event's Luma link.

## 3. Accounts and saved workspaces (~2-4 credits)
- **Prompt C:** `Add Google sign-in with Lovable Cloud auth. Apply supabase/migrations/20261117000000_workspaces.sql. In src/lib/store.tsx, when signed in, load the latest workspace row for the user on start and upsert the whole Workspace object into workspaces.data (debounced 1s) on every change; keep localStorage as the offline fallback. Add a small avatar menu in the header with Sign out. The home page works without signing in; prompt to sign in only when they mark someone as sent.`

## 4. Polish for the demo (~2-4 credits)
- **Prompt D:** `Demo polish: when a prospect moves to the last stage, animate the progress bar and show a short confetti burst. Add subtle skeleton loaders on Prospects while searching. Keep the existing design system in src/index.css.`
- Publish → copy the URL into the submission form.

## If something breaks
- Edge function 500 with "GEMINI_API_KEY is not set": the secret is missing.
- Reddit returns 0: Reddit blocks some cloud IPs. Hacker News and events still work. Say "Reddit is rate-limited from the venue wifi" and move on.
- Lovable preview blank: check the browser console; usually a missing env var. Ask Lovable "Fix the build error" (1 credit).
