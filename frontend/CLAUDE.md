# Frontend – notes for Claude (Vladut, role C)

Claude loads this file automatically when it works inside `frontend/`. The root `CLAUDE.md` (→ `RULES.md`, `PLAN.md`) still applies; this file adds where the frontend stands and what comes next.

**Who I am:** Vladut, role C (Frontend) and repo owner. Branch `vladut`, PRs go into `dev`. Stop code: **Sunday 13:00**.
**How I like to work:** explain things in plain words (I'm new to some of this), tell me exactly which terminal command to run and where, check every screen in the browser (also at 375px) before saying it's done, then commit + push to `vladut`.

---

## 1. Status (all merged into `dev`, all on mock data)

| Route | What | Main files |
|---|---|---|
| `/` | Screen 1: answer by mic (MediaRecorder) or text, optional neighborhood/age | `components/answer-form.tsx`, `components/mic-button.tsx` |
| `/vote` | Screen 2: agree / disagree / don't know, one statement at a time | `components/vote-deck.tsx` |
| `/me` | Screen 3: "Tu" on the opinion map, your camp, common ground | `components/where-you-are.tsx` |
| `/proposal` | Screen 4: AI compromise, gains/gives up per camp, critique, Susțin / Nu susțin | `components/proposal-vote.tsx` |
| `/board` | Live board for the projector: D3 map, count, camps, common ground, proposal, support per round, QR | `components/live-board.tsx`, `components/opinion-map.tsx` |
| `/organizer` | Create consultation (question, context, threshold) + QR | `components/create-consultation.tsx`, `components/join-qr.tsx` |
| `/organizer/moderation` | Approve / reject AI-flagged statements | `components/moderation-queue.tsx` |
| `/organizer/report` | Final report, "Descarcă PDF" = browser print | `app/organizer/report/page.tsx` |

**Shared plumbing**
- `src/lib/api.ts` – the ONLY place for REST. Every function returns mock data right now.
- `src/lib/ws.ts` – the ONLY place for the WebSocket. With no `NEXT_PUBLIC_WS_URL` it uses `simulateEvents()` from `mock.ts` (a fake participant every 2 s). Auto-reconnects.
- `src/hooks/use-consultation.ts` – the one state hook, applies WebSocket events.
- `src/lib/types.ts` – **my guess** at `backend/app/schemas.py`. Sync it once Rares pushes the real one.
- `src/lib/mock.ts` – fake data (Romanian).
- `src/lib/participant.ts` – anonymous participant id in localStorage, sent with every answer/vote.
- `src/lib/colors.ts` – `campColor()`; same camp → same color everywhere.

---

## 2. Next tasks, in order

1. **Sync `types.ts` with Rares's `schemas.py`** as soon as it exists in `dev` (`git pull origin dev`, then compare). Fix every compile error the change causes.
2. **Connect to the real API, one endpoint at a time**, in `api.ts` only. Replace each mock body with `fetch(\`${API_URL}/...\`)`, keep the same function signature, and `throw` on a non-OK response (the screens already show an error and keep the user's input). Expected endpoints:
   - `POST /responses` – text and/or audio (multipart), neighborhood, age, `participant_id`
   - `GET` statements to vote, `POST /votes` – `participant_id`, `statement_id`, `value`
   - `GET` clusters, bridges, current proposal, support per round
   - `GET` my position – `{ participant_id, x, y, camp_id }`
   - `POST` proposal vote – `participant_id`, `proposal_id`, `support`, `critique`
   - organizer: create consultation, moderation queue, approve/reject
3. **Real WebSocket:** set `NEXT_PUBLIC_WS_URL` in `frontend/.env.local`. The message format must be `{ "type": "map_updated" | "bridges_updated" | "proposal_published" | "support_updated", "data": ... }`. If Rares's format differs, change only `ws.ts`.
4. **Deploy check (Vultr, HTTPS):** the mic only works on HTTPS or localhost. Test the full flow on a real phone via the QR.
5. **Stretch:** simulated proxy voices (different color, labeled "simulat", NEVER counted in percentages), organizer login (Auth0) only if time allows.

---

## 3. Lessons from building this (don't repeat these bugs)

- **d3 transitions:** `d3` is marked side-effect-free, so `selection.transition()` alone gets tree-shaken ("transition is not a function"). Always create `const t = d3.transition().duration(…)` and use `.transition(t)`.
- **Server pages can't call functions from `"use client"` files.** Shared helpers go in `src/lib/` (that's why `campColor` lives in `lib/colors.ts`).
- **ESLint `react-hooks/set-state-in-effect`:** don't call `setState` synchronously in `useEffect`. Use `useMemo`, `useSyncExternalStore`, or set state inside a promise callback.
- **Fonts:** `layout.tsx` loads Geist with `latin-ext` (for ș, ț, ă). In `globals.css`, `--font-sans` must point to `var(--font-geist-sans)`; shadcn init once broke this.
- **Dev server cache:** if a CSS change doesn't show up, restart `pnpm dev`.
- **Browser pane:** an unfocused preview pane slows down d3 animations. Wait or focus it before deciding the map is broken.
- **Before every push:** `pnpm lint && pnpm tsc --noEmit` from `frontend/`.

---

## 4. Ready-to-paste prompts

**Start of a work session**
```
Read frontend/CLAUDE.md. Run git pull origin dev on my branch vladut, tell me what changed in dev
(especially backend/app/schemas.py and new endpoints), and suggest what I should do next from section 2.
```

**Rares pushed schemas.py**
```
Rares pushed backend/app/schemas.py. Update frontend/src/lib/types.ts to mirror it exactly, fix everything
that breaks, update mock.ts to match, run lint + typecheck, check every screen in the browser, then commit and push.
```

**Connect one endpoint**
```
Rares's endpoint <METHOD /path> is live at <URL>. Replace the mock in src/lib/api.ts for it with a real fetch,
same signature, throw on non-OK responses. Test the screen that uses it in the browser, then commit and push.
```

**Turn on the real WebSocket**
```
Rares's WebSocket is at <ws://...>. Set NEXT_PUBLIC_WS_URL in frontend/.env.local, check the message format
matches ws.ts, open /board and /me and confirm live updates arrive. Explain anything that doesn't match.
```

**Before the demo**
```
Do a full demo run: / → /vote → /me → /proposal on 375px, /board at 1440px, all organizer pages.
List anything broken or ugly, fix it, and tell me what I must check on the real phone and projector.
```

**Open a PR**
```
Commit anything left, push vladut, open a PR into dev with a clear description and a "For Rares" section
listing any API changes the frontend expects.
```
