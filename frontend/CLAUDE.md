# Frontend – notes for Claude (Vladut, role C)

Claude loads this file automatically when it works inside `frontend/`. The root `CLAUDE.md` (→ `RULES.md`, `PLAN.md`) still applies.
Team-wide status is in [`../FOREVERYONE.md`](../FOREVERYONE.md) (Romanian; partly outdated, this file wins for the frontend).

**Who I am:** Vladut, role C (Frontend) and repo owner. Branch `vladut`, PRs go into `dev`. **Feature freeze Sunday 15.11 at 11:00, stop code 13:00.**
**How I like to work:** explain in plain words (I'm new to some of this), tell me exactly which command to run and where, check every screen in the browser (also at 375px) before saying it's done, then commit + push to `vladut`. When I say "merge", open a PR into `dev` and merge it.
**`main`:** only when I explicitly say "merge to main". Then: test `dev` first (backend `ruff` + `pytest` in a throwaway worktree, frontend `pnpm lint` + `tsc` + `pnpm build`), open a `dev → main` checkpoint PR, merge it, pull `dev` back into `vladut`.
**Language:** I often write in Romanian; answer in the language I used. Code/commits/PRs English, UI text Romanian.

**Design taste (decided, don't undo):**
- Public site follows the Remote landing template (land-book link) ~90%, with OUR content and shapes, never Remote's logo/artwork.
- **Light is the DEFAULT theme** (html.light server-rendered); dark Midnight is opt-in via the sun/moon toggle (saved per browser, applied before first paint by the inline boot script in `app/layout.tsx`).
- Violet → ice gradient band at the top of public pages (behind the header) and ice → violet at the bottom; purple CTA panel; dark footer card on violet. Accent gradient used everywhere instead of black: `oklch(58% 0.25 300) → oklch(68% 0.15 235)` (logo tile, chat button, numbers, bars, menu pill, scroll bar).
- Wordmark "citymind" = custom geometric SVG lettering (`components/wordmark.tsx`), in the hero, header logo and footer.
- **Logo + tab icon = Bingus**, the purple cat with turquoise eyes (`public/brand/cat.png`, `app/icon.png`, 192px copies of `../mascot/citymind-cat.png`).
- Fonts: Inter Tight (headings + body), JetBrains Mono (small labels). Buttons: black + outlined (template look).
- No custom cursor, no intro/splash screen. Text must be clearly readable (I complained about grey text). Max 300 lines per file (`globals.css` is at 300: compact something before adding).

## 0. Where the last session stopped (2026-11-15, ~01:00)

- **Everything is in `main`** (last checkpoint **PR #67**). `main` == `dev` == `vladut`, working tree clean, no open PRs.
- PRs from this session (all merged): #41 stuck-answers card + normal cursor · #42/#44/#50/#52/#58/#65/#67 checkpoints into `main` · #49 template redesign + light default + wordmark · #51 proxy voices ("Voci care lipsesc") · #53 `/simulare` dashboard · #60 help chat · #64 Bingus (logo, icon, chat mascot) · #66 Rundele redesign, renames, active menu pill, Bingus welcome, Participă redesign.
- Teammates merged meanwhile: Rares #40 demo loader, #43 deploy (Vercel + Azure + Supabase), #45 proxy wiring, #54/#57 chat + reports API, #61 rate limits · Bordos #59/#62 assist agent (real chatbot) · Eidrien #55/#63 chatbot eval.
- **Live site is NOT up to date:** Rares must deploy from `main` (see section 2, task 1). Last check: live site had the #58 design, live API on Azure was older (`/chat` → 404).
- Local servers run from the preview tool (`.claude/launch.json`, backend on `--host 0.0.0.0`). Local DB = demo seed (50 people, 2 camps) **plus a round-2 proposal someone on the Wi-Fi created** – reset before practising (section 1).

---

## 1. Pages (UI names as in the menu)

| Route | Menu name | What | Main files |
|---|---|---|---|
| `/` | Acasă | Landing in template order: wordmark hero → feature cards → statement → steps → audience → numbers (synthetic, labeled) → live list + map → methodology cards → purple CTA → dark footer. 3px gradient scroll bar in the header. | `app/(site)/page.tsx`, `components/site/*` |
| `/cum-functioneaza` | Cum funcționează | Gradient band runs through the 6 steps; gradient step titles + numbers; the 4 citizen-journey phones (live iframes); "Regulile noastre" gradient card | `app/(site)/cum-functioneaza/page.tsx`, `components/site/citizen-journey.tsx` |
| `/board` | **Rundele** (projector) | Map first (sticky, capped to screen height, lavender→turquoise tint in light). Right column: logo + LIVE + question + participants + QR → **Sprijin pe runde** (big % of current round) → camps → common points → proposal (bold first sentence, highlighted times/durations/%) → "Voci care lipsesc" in its own dashed box | `app/board/page.tsx`, `components/live-board.tsx`, `components/opinion-map.tsx` |
| `/simulare` | Simulare | Pipeline dashboard: DEMO (fictional, browser-only: Pornește / Pauză / Continuă / Pas înainte / Resetează) and LIVE (real API + WebSocket, real votes, organizer round). Proposal = round title above the map; process + AI checks on the right | `components/simulation/*`, `lib/simulation.ts` (self-check `node src/lib/simulation.check.mjs`) |
| `/organizer` | **Admin** | Create consultation + QR, stuck-answers card (`/responses/stats` + retry), **Generează propunerea** | `components/create-consultation.tsx`, `organizer-controls.tsx`, `answer-queue.tsx`, `proposal-round.tsx` |
| `/organizer/moderation`, `/kpi`, `/report` | (admin bar) | Moderation (mock), KPI dashboard (mock analytics), final report (print-to-PDF) | `components/moderation-queue.tsx`, `kpi-dashboard.tsx`, `app/organizer/report/page.tsx` |
| `/demo` | **Admin Demo** | Live previews of every page | `app/(site)/demo/page.tsx`, `components/page-preview.tsx` |
| `/participa` | Participă (CTA) | Step 1: full site menu, gradient band, 4-step progress bar, glass card with mic + text form (prefilled by the chat via sessionStorage) | `app/participa/page.tsx`, `components/answer-form.tsx`, `mic-button.tsx` |
| `/vote`, `/me`, `/proposal` | – | Steps 2–4 (phone screens): vote statements, "Tu" on the map, vote + critique the compromise (+ simulated voices) | `vote-deck.tsx`, `where-you-are.tsx`, `proposal-vote.tsx` |
| every page except `/board` | – | **Bingus** chat: floating semi-3D cat head with a "Chatbot" label, welcomes once per visit, native modal `<dialog>` (focus trap, Esc), `POST /chat` + `POST /reports`, actions never auto-submit | `components/chat-widget.tsx`, `chat-actions.tsx`, `lib/draft.ts` |

Menu: `components/site-header.tsx` (list `siteLinks`) + `components/nav-link.tsx` (glass pill on the current page, `view-transition-name: nav-pill` so it slides between pages where supported).

**Plumbing**
- `src/lib/api.ts` – the ONLY place for REST. Real when `NEXT_PUBLIC_API_URL` is set, mock otherwise. Real: responses, statements, votes, clusters, bridges, proposal, proposal-votes, support, proposals + status, responses stats/retry, **chat, reports**. Still mock: consultation, moderation, kpis, analytics.
- `src/lib/ws.ts` – the ONLY WebSocket (`map_updated`, `bridges_updated`, `proposal_published`, `support_updated`). `src/hooks/use-consultation.ts` – the one state hook. `src/lib/types.ts` mirrors `backend/app/schemas.py` (incl. `ProxyOpinion`, chat types).
- `src/lib/colors.ts` – camp colors `--series-1..8` assigned by camp ID (self-check `node src/lib/colors.check.mjs`).
- `src/app/globals.css` – theme tokens: `.brand` (dark) and `html.light .brand` (default light), `.on-dark` (text on purple/dark panels), `.band-top/.band-bottom`, `.cta-panel`, `.footer-card`, `.board` card styles (map tint), `bingus-float` keyframes.
- `frontend/.env.local` (not in git): `NEXT_PUBLIC_API_URL=http://10.0.10.159:8000`, `NEXT_PUBLIC_WS_URL=ws://10.0.10.159:8000/ws` (my Mac's Wi-Fi IP, `ipconfig getifaddr en0`; was 192.168.1.105 on the other network). If the IP changes: update `.env.local` AND `allowedDevOrigins` in `next.config.ts`, restart the frontend. Phone: `http://<IP>:3000`.

**Running locally** (repo root): Docker Desktop open → `docker compose up -d` → backend `cd backend && uv sync && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000` (no `--reload`) → `cd frontend && pnpm dev`. Or the preview tool with `.claude/launch.json`. `.env` in the repo root has `GEMINI_API_KEY` + `DATABASE_URL` (never print or commit).
**Demo data (local):** from `backend/`: `uv run python -m app.api.demo reset --yes` (deletes ALL local data), `uv run python -m app.api.demo load` (50 seed people, no Gemini), then restart the backend.
**Live:** site https://citymind-iota.vercel.app (deployed from Rares's laptop with `deploy/vercel-deploy.sh`, not linked to GitHub), API https://citymind-api-dkab4.azurewebsites.net (`deploy/azure-deploy.sh`, builds from `main`), data in Supabase, CORS locked to the Vercel site. Organizer actions need `ORGANIZER_TOKEN` from Rares (private only, typed into the "Parolă organizator" field, never in git/chat).
**Gemini:** free tier only (team decision). Each chat message / answer = 1 call, a round ≈ 3 calls (mediate, critic, proxy). Rate limits on the server: 20 answers/min per IP, 40 global; chat 10/min per participant.

---

## 2. What's left, in order

1. **Rares deploys from `main`:** `git checkout main && git pull` → `deploy/azure-deploy.sh` (API: chat, assist agent, proxy, rate limits) → `deploy/vercel-deploy.sh` (site). Then check live: new design, Rundele layout, Bingus answers (not "Asistentul nu răspunde acum"), `/simulare`, "Voci care lipsesc" after a round.
2. **Phone test on mobile data** on the live site: answer with the **microphone** (needs HTTPS) → vote → map → proposal → Rundele updates live. Get `ORGANIZER_TOKEN` from Rares privately to run a round.
3. **Before the pitch:** Rares resets live data (`demo reset --yes`, `demo load`, restart the Space/App, wait ~5 min); board must show 2 camps, 4 common points, no old proposal. Reset my local DB too if I practise locally.
4. Pitch numbers are synthetic: always say so (`seed/PITCH_SLIDE.md`, `seed/CHAT_EVAL_NUMBERS.md`).
5. After the freeze only bug fixes. Ideas NOT done (only if asked): menu pill on the Admin bar, the full site menu on `/vote` `/me` `/proposal`, a chat/reports screen for organizers (`GET /reports`), connecting consultation/moderation/KPI when Rares adds endpoints.

---

## 3. Lessons (don't repeat these bugs)

- **Never build in a copied folder that includes `node_modules`** (pnpm relinks the ORIGINAL `node_modules` into the copy; deleting the copy broke the project). Build in place: Next 16 keeps dev output in `.next/dev`, so `pnpm build` doesn't disturb `pnpm dev`. If `next` can't be found: `pnpm install`, then `rm -rf .next`, then restart.
- **iCloud Desktop sync** creates `… 2.ts` files in `.next/` (also `.next/dev/types`) that break `tsc`: `find .next -name "* 2*" -prune -exec rm -rf {} +`.
- **Stale CSS in dev:** if a CSS change doesn't show, stop the frontend, `rm -rf .next`, start again.
- **React Strict Mode runs effects twice in dev:** don't "use up" a one-time thing (like the Bingus greeting flag) before it really happens; mark it inside the timeout that shows it.
- **`cacheComponents` keeps the previous page hidden in the DOM:** `document.querySelector` can pick the hidden copy (size 0). Filter by `getBoundingClientRect().width > 0`. Never style `html/body` with `:has(.page-class)`.
- **Testing UI that needs data the backend doesn't have** (proposal, chat actions): comment the two `NEXT_PUBLIC_*` lines in `.env.local`, restart the frontend (mock mode), test, restore, restart. Never leave it in mock mode.
- **next/script `beforeInteractive` runs too late** for the theme boot script (dark flash): it's a raw inline `<script>` in the root `<head>`.
- **ESLint `react-hooks/set-state-in-effect`:** no synchronous `setState` in `useEffect` (use a callback/timeout/event listener).
- **d3:** always `const t = d3.transition()` + `.transition(t)`; CSS-var colors set with `.style("fill")`, not tweened.
- **Server pages can't call functions from `"use client"` files**; shared helpers go in `src/lib/`. Page files may only export Next's allowed names: shared data goes in a component/lib file (see `citizen-journey.tsx`).
- **Browser preview pane** throttles animations: screenshots can look empty mid-animation; check the DOM first.
- **Privacy:** a citizen's text never goes in a URL (chat → form uses sessionStorage).
- **New backend tables / endpoints** need a backend restart after pulling.
- **Before every push:** `pnpm lint && pnpm exec tsc --noEmit` (and `pnpm build` for bigger changes).

---

## 4. Ready-to-paste prompts

**Start of a new session**
```
Read frontend/CLAUDE.md. On my branch vladut run git pull origin dev, tell me what changed (new PRs,
backend endpoints, docs/tips/FRONTEND_TIPS.md), check that backend + frontend start (Docker first), check
the live site (citymind-iota.vercel.app + the Azure API /health/db and /chat), and suggest what to do next
from section 2. Don't merge into main unless I say so.
```

**Teammate opened a PR**
```
Test PR #<n>: run the backend tests on dev merged with it in a throwaway worktree, tell me the result and
whether it affects the frontend. Merge into dev only if it passes and I say so.
```

**Before the demo**
```
Full demo run: /participa → /vote → /me → /proposal at 375px, /board (Rundele) at 1440px, /simulare,
all Admin pages, Bingus chat, and one real round if Gemini quota allows. List anything broken and fix it.
```

**Merge everything**
```
Commit anything left, push vladut, PR into dev and merge; then test dev and checkpoint dev → main.
```
