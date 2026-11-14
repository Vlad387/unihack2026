# Frontend – notes for Claude (Vladut, role C)

Claude loads this file automatically when it works inside `frontend/`. The root `CLAUDE.md` (→ `RULES.md`, `PLAN.md`) still applies.
Team-wide status and what everyone owes is in [`../FOREVERYONE.md`](../FOREVERYONE.md) (Romanian) – read it too.

**Who I am:** Vladut, role C (Frontend) and repo owner. Branch `vladut`, PRs go into `dev`. Stop code: **Sunday 13:00**, feature freeze Sunday 11:00.
**How I like to work:** explain in plain words (I'm new to some of this), tell me exactly which command to run and where, check every screen in the browser (also at 375px) before saying it's done, then commit + push to `vladut`. When I say "merge", open a PR into `dev` and merge it.
**⚠️ Never merge into `main` unless I say so explicitly.** (`main` was last updated by checkpoint PRs #27/#28; I asked to leave it alone after that.)

---

## 1. Status (2026-11-14): everything is on the REAL backend

Last end-to-end test with real Gemini on my Intel Mac passed: answer → intake (~20 s) → votes → real clustering (3 camps) → organizer "Generează propunerea" → mediate + critic (~15 s) → vote on screen 4 → board support updates live.

| Route | What | Main files |
|---|---|---|
| `/` | Landing page | `app/(site)/page.tsx` |
| `/cum-functioneaza` | Methodology page | `app/(site)/cum-functioneaza/page.tsx` |
| `/demo` | Live previews of every page | `app/(site)/demo/page.tsx`, `components/page-preview.tsx` |
| `/participa` | Screen 1: answer (mic or text) – the QR points here | `components/answer-form.tsx`, `components/mic-button.tsx` |
| `/vote` | Screen 2: vote statements (loads in the browser, retries every 3 s while AI processes) | `components/vote-deck.tsx` |
| `/me` | Screen 3: "Tu" on the map, your camp | `components/where-you-are.tsx` |
| `/proposal` | Screen 4: AI compromise, tradeoffs, critic verdict, vote + critique | `components/proposal-vote.tsx`, `components/verdict.tsx` |
| `/board` | Projector board (dark), D3 map with hover cards, QR | `components/live-board.tsx`, `components/opinion-map.tsx` |
| `/organizer` | Create consultation + QR + **Generează propunerea** (round control) | `components/create-consultation.tsx`, `components/proposal-round.tsx` |
| `/organizer/moderation` | Moderation queue (still mock) | `components/moderation-queue.tsx` |
| `/organizer/kpi` | Full KPI dashboard with filters (analytics still mock) | `components/kpi-dashboard.tsx`, `components/kpi/*`, `components/charts/*`, `lib/kpi.ts` |
| `/organizer/report` | Final report, print-to-PDF | `app/organizer/report/page.tsx` |

**Plumbing**
- `src/lib/api.ts` – the ONLY place for REST. Real calls when `NEXT_PUBLIC_API_URL` is set, mock data otherwise. Real: responses, statements, votes, clusters, bridges, proposal, proposal-votes, support, proposals (start round) + status. **Still mock:** consultation, moderation, kpis, analytics.
- `src/lib/ws.ts` – the ONLY WebSocket. Real when `NEXT_PUBLIC_WS_URL` is set, otherwise `simulateEvents()`. `{type, data}` events: map_updated, bridges_updated, proposal_published, support_updated.
- `src/lib/types.ts` – mirrors `backend/app/schemas.py` (synced; includes `Statement.flag`, `Camp.member_ids`, `Point.text`, `Proposal.verdict`).
- `src/hooks/use-consultation.ts` – the one state hook.
- `src/lib/colors.ts` – camp colors as CSS vars `--series-1..8` (validated palette, separate dark steps in `globals.css`), assigned by camp ID (hash home slot; the browser remembers slots so a new camp never steals one). Self-check: `node src/lib/colors.check.mjs`.
- **Public site design** (`/`, `/cum-functioneaza`, `/demo` via `app/(site)/layout.tsx`): dark brand theme `.brand` in `globals.css` built on 4 colors (Cyan Pulse #00D1B2, Midnight Grid #001F3F, Pure Signal #FFFFFF, Carbon Core #2E2E2E, tints derived in oklch), fonts Syne / Plus Jakarta Sans / JetBrains Mono, fluid `text-hero|display|title|lead|meta`. Landing sections in `components/site/*`; WebGL waves `site/wave-field.tsx` (raw shader, no three.js); custom cursor `site/cursor.tsx`; GSAP motion `site/motion.tsx`, driven by `data-split|hero-fade|reveal|stagger|speed|count|step*` attributes. Citizen screens, board and organizer keep their own themes. Camp colors stay the validated `--series-*` (dataviz exception to the 4-color rule).
- `src/app/loading.tsx` – Suspense fallback so pages reading live API data pass `next build` with `cacheComponents`.
- `frontend/.env.local` (not in git): `NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws`. Comment them out to go back to mock data.

**Running everything locally** (repo root): Docker Desktop open → `docker compose up -d` → `cd backend && uv sync && uv run uvicorn app.main:app --port 8000` (**no `--reload`**: it restarts on .venv changes and kills background AI jobs) → `cd frontend && pnpm dev`. `.env` in the repo root has `GEMINI_API_KEY` + `DATABASE_URL` (never print or commit the key). `.claude/launch.json` has both servers for the preview tool.

**Gemini:** no billing (team decision). Free tier ≈ 20 requests/day per model; intake + critic on `gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`. Don't burn quota on unnecessary real calls; tests use a fake Gemini. A 429 shows a clear message on the organizer page.

**Local DB** has ~25 test participants (`e2e-*`) from my end-to-end test. Rares is building a demo loader + reset.

---

## 2. Next tasks, in order

1. ~~Stable camp colors by camp ID~~ done (`9f60a39`). ~~Landing redesign~~ done (dark brand site, no intro screen: I asked to skip it).
2. **Organizer page: stuck answers** – show `GET /responses/stats` (`{pending, failed, done}`) and a "Reîncearcă" button for `POST /responses/retry` (both need the organizer token on the server). See `docs/tips/FRONTEND_TIPS.md`.
3. **Screen 4 historical camp names**: when Rares adds `camp_name` to `proposal.tradeoffs[]`, prefer it over looking up current camps (fallback "Tabără" today).
4. **Connect the rest when Rares adds endpoints**: consultation (question is hardcoded in `mock.ts` today), moderation queue, `/kpis`.
5. **Deploy config**: when Rares gives the HTTPS URLs, set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` for production and test the mic + QR on a real phone.
6. **Styling**: public site done in the brand palette; decide whether the citizen screens (`/participa` … `/proposal`) should move to it too.
7. Stretch: proxy voices (labeled "simulat", different color, NEVER counted in percentages).

---

## 3. Lessons (don't repeat these bugs)

- **d3 transitions:** `d3` is side-effect-free for the bundler, so `selection.transition()` gets tree-shaken. Always `const t = d3.transition()…` and `.transition(t)`.
- **CSS var colors can't be tweened by d3** – set them with `.style("fill", …)`, not in a transition.
- **Server pages can't call functions from `"use client"` files** – shared helpers go in `src/lib/`.
- **ESLint `react-hooks/set-state-in-effect`:** no synchronous `setState` in `useEffect`.
- **`<details>` (or any block element) inside `<p>` = hydration error.** Use `<div>`.
- **Typecheck:** use `pnpm typecheck` (runs `next typegen` first), not bare `tsc`.
- **iCloud Desktop sync** creates `… 2.ts` duplicates in `.next/` that break typecheck – delete them (`find .next -name "* 2*" -delete`).
- **Dev server cache:** if a CSS/layout change doesn't show, restart `pnpm dev`. If it STILL serves old CSS, stop it and `rm -rf .next` (Turbopack's cache survives restarts).
- **GSAP + streaming:** mount `<Motion />` inside the page, never the layout: the page hydrates later (its own Suspense boundary) and GSAP touching unhydrated HTML = hydration error. Use `fromTo` with explicit end values, and never CSS-transition `opacity` on elements GSAP reveals.
- **Never style `html`/`body` with `:has(.some-page-class)`:** with `cacheComponents` Next keeps the previous page hidden in the DOM, so the rule still matches on the next page (this painted /organizer dark behind dark text).
- **WebGL in Strict Mode:** don't `loseContext()` in effect cleanup; the re-run gets the same dead context back.
- **`<details>` menu:** Chrome makes `<details>` the containing block of its content, so the panel needs an explicit width (`inset-x-0` collapses to the icon width).
- **Browser preview pane:** background/unfocused tabs throttle d3 animations and screenshots can look empty – check the DOM before assuming the map is broken. A hidden pane may draw NO frames after a navigation (`document.timeline.currentTime` stays 0), so the landing hero looks empty until a screenshot forces frames.
- **Real clustering with few people** puts everyone at the same spot and returns no camps – the map fans out stacked dots; messages explain camps appear later. Zero bridges with few voters is sparse voting, not a bug (`uv run python -m app.api.diagnose_bridges` shows why).
- **New backend tables** are created at backend startup – restart the backend after pulling backend PRs.
- **Before every push:** `pnpm lint && pnpm typecheck` (and `pnpm build` for bigger changes).

---

## 4. Ready-to-paste prompts

**Start of a new session**
```
Read frontend/CLAUDE.md and FOREVERYONE.md. On my branch vladut run git pull origin dev, tell me what
changed (new PRs, backend endpoints, docs/tips/FRONTEND_TIPS.md), check that backend + frontend start,
and suggest what to do next from section 2. Don't touch main.
```

**Teammate opened a PR**
```
Test PR #<n> like before: run the backend tests on dev merged with it in a throwaway worktree, tell me
the result and whether it affects the frontend. Merge into dev only if it passes and I say so.
```

**Rares added an endpoint**
```
Rares added <METHOD /path> (see docs/tips/FRONTEND_TIPS.md). Wire it in src/lib/api.ts (mock fallback stays),
update types.ts if schemas.py changed, test it in the browser against the local backend, commit and push.
```

**Before the demo**
```
Full demo run on the real backend: /participa → /vote → /me → /proposal at 375px, /board at 1440px, all
organizer pages, and one real round if Gemini quota allows. List anything broken or ugly and fix it.
```

**Open a PR**
```
Commit anything left, push vladut, open a PR into dev with a clear description and a "For Rares" section
if the frontend needs API changes, then merge it. Not into main.
```
