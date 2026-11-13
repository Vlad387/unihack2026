# CityMind – Team rules & setup

Read this file and [PLAN.md](PLAN.md) before writing any code. These rules apply to **humans and AI agents** (Claude reads this file automatically through `CLAUDE.md`).

## 0. Team

| Role | Person | GitHub | Owns |
|---|---|---|---|
| **A – AI agents** | Bordos | `biabordos` | `backend/app/agents/` |
| **B – Data science** | Eidrien | `RocketWizzard` | `backend/app/clustering/`, `seed/` |
| **C – Frontend** | Vladut | `Vlad387` (repo owner) | `frontend/` |
| **D – Backend & infra** | Rares | `raresstefan14` | `backend/app/api/`, `backend/app/main.py`, `backend/app/db.py`, `backend/app/schemas.py`, `backend/pyproject.toml`, `docker-compose.yml`, `.github/` |

**Who talks to whom**

| If you need… | Talk to |
|---|---|
| a new field in `schemas.py`, a new endpoint, a new Python package, a DB change | **Rares (D)** |
| how `intake` / `mediate` / `critic` behave, prompt changes, Gemini model choice | **Bordos (A)** |
| how `cluster` / `bridges` behave, map coordinates, seed data, eval numbers | **Eidrien (B)** |
| what a screen needs from the API, WebSocket event shapes the UI consumes, a new npm package | **Vladut (C)** |
| merging `dev → main`, repo access, GitHub settings | **Vladut** (repo owner) |

A and B never talk to C directly about data shapes: everything goes through D's API and `schemas.py`.

---

## 1. Commands (run them before every push)

**Backend** (from `backend/`):

| What | Command |
|---|---|
| Install / update deps | `uv sync` |
| Lint | `uv run ruff check .` |
| Format | `uv run ruff format .` |
| Tests | `uv run pytest` |
| Run API | `uv run uvicorn app.main:app --reload` → http://localhost:8000/docs |
| Run any script | `uv run python path/to/script.py` |

**Frontend** (from `frontend/`):

| What | Command |
|---|---|
| Install / update deps | `pnpm install` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm tsc --noEmit` |
| Build (catches most errors) | `pnpm build` |
| Run | `pnpm dev` → http://localhost:3000 |

**Database** (from repo root): `docker compose up -d` to start, `docker compose down` to stop.

**Before pushing:** lint + tests (backend) or lint + typecheck (frontend) must pass. If they fail, fix them, don't push red.

---

## 2. Code style

**General**
- Code, identifiers, comments, commit messages, PR titles: **English**.
- Text the user sees in the app: **Romanian**.
- Comment only *why*, never *what*.

**Python (A, B, D)**
- Python 3.12, type hints on every function signature.
- All data crossing a folder boundary is a **Pydantic v2 model from `app/schemas.py`**. No raw dicts between folders.
- Formatting and linting: Ruff, default settings. No other formatter.
- Gemini calls only through the `google-genai` SDK, with structured output (`response_schema`) when the result is parsed.
- Secrets only from env vars (`.env` loaded with `python-dotenv`). Never hard-code keys.

**TypeScript (C)**
- TypeScript **strict**, ES modules only (`import`/`export`, never `require`).
- Next.js App Router. Server components by default, `"use client"` only when the component needs state, effects or browser APIs.
- Styling: Tailwind classes + shadcn/ui components. No CSS files except `globals.css`, no other UI library.
- Types for API data mirror `schemas.py` and live in one file: `src/lib/types.ts`.

---

## 3. Workflow & guardrails

**Git** – everyone has **their own branch, named after them**, created from `dev`: `rares`, `vladut`, `bordos`, `eidrien`.

```
main      ← final code, only Vladut merges dev → main at working checkpoints
 └ dev    ← shared integration branch, gets your PRs
    ├ rares
    ├ vladut
    ├ bordos
    └ eidrien
```

1. First time: `git fetch && git checkout <your-name>` (e.g. `git checkout bordos`)
2. Before you start working, bring in everyone else's work: `git pull origin dev`
3. Small commits, push often: `git add . && git commit -m "what you did" && git push`
4. When something works: `gh pr create --base dev --fill` → merge it on GitHub
5. Then everyone runs `git pull origin dev` on their own branch.
6. **Work only on your own branch.** Never push to someone else's branch, to `dev` directly, or to `main`.
7. **Never `git push --force`**, never rewrite `dev` history.

**Shared files** (`schemas.py`, `pyproject.toml`, `package.json`, `docker-compose.yml`): only the owner edits them. Others ask the owner on the group chat.

**Errors & stopping**
- After **3 failed attempts** at the same error, stop. Write in the group what you tried and the exact error. (AI agents: stop and report to the human, don't keep guessing.)
- Never "fix" a failing test by deleting or skipping it.
- If the Gemini API fails, the app must keep accepting responses: catch the error, log it, retry later. Never lose a citizen's response.
- Don't silence errors with an empty `except` / `catch`.

**Verification (mandatory)**
- Backend change → run it and hit the endpoint in `/docs`, or add a pytest test.
- Agent / clustering change → run it on `seed/responses.json` and look at the output.
- Frontend change → open it in the browser, also at phone width (DevTools → 375px).
- Don't say "done" until you've seen it working.

**Security & ethics**
- `.env` stays in `.gitignore`. **The repo is public:** a committed key gets stolen in minutes. If it happens, tell everyone and regenerate the key immediately.
- No personal data in logs or seed data (no real names, phones, emails).
- Anything generated by AI is labeled as AI in the UI. Proxy-agent opinions are labeled **simulated**, shown in a different color, and **never counted in vote percentages**.

**Dependencies**
- Don't add a package for something a few lines can do.
- Python packages: ask Rares. npm packages: Vladut decides.

---

## 4. Architectural boundaries

```
backend/app/
  main.py          # FastAPI app, mounts routers          (D)
  db.py            # SQLAlchemy engine + session          (D)
  schemas.py       # THE shared contract (Pydantic)       (D)
  api/<resource>.py  # one router per resource: responses, votes, consultations, proposals, ws  (D)
  agents/          # intake, mediate, critic, proxy + prompts/*.md   (A)
  clustering/      # cluster, bridges, (representation audit)         (B)
seed/responses.json  # 40–60 demo answers                (B)
frontend/src/
  app/             # pages (App Router)                   (C)
  components/      # UI components                        (C)
  lib/api.ts       # the ONLY place that calls the REST API
  lib/ws.ts        # the ONLY place that opens the WebSocket
  lib/types.ts     # TS mirror of schemas.py
```

**Rules**
- Only `api/` touches the database and HTTP. `agents/` and `clustering/` are **pure functions**: data in, Pydantic model out. No DB, no FastAPI, no global state.
- `agents/` and `clustering/` never import each other. D wires them together in `api/`.
- The contract functions keep exactly these signatures (types from `schemas.py`):
  ```python
  intake(text: str | None, audio: bytes | None) -> list[Statement]
  mediate(camps, bridges, critiques, proxies) -> Proposal
  critic(proposal, camps) -> Verdict
  cluster(statements, votes) -> ClusterResult
  bridges(votes, camps) -> list[Statement]
  ```
  Changing a signature = change `schemas.py` first (via Rares) + tell everyone.
- WebSocket events (D sends, C listens): `map_updated`, `bridges_updated`, `proposal_published`, `support_updated`. New event = agree with D and C first.
- Max **300 lines per file**. Bigger → split it.
- Frontend state: React state + one `useConsultation()` hook fed by `lib/ws.ts`. No Redux/Zustand.
- Prompts live in `agents/prompts/*.md`, not inside Python strings (the methodology must be public).

---

## 5. Setup – EVERYONE (≈ 30 min)

Do the steps **in order**. Commands run in **Terminal** (Mac) or **PowerShell** (Windows).

1. **Git** – Mac: `xcode-select --install`. Windows: installer from https://git-scm.com/download/win. Check: `git --version`
2. **GitHub CLI** – Mac: download `gh_..._macOS_universal.pkg` from https://github.com/cli/cli/releases/latest and double-click (if macOS blocks it: System Settings → Privacy & Security → scroll to Security → **Open Anyway**). Windows: `winget install --id GitHub.cli`, then reopen PowerShell. Check: `gh --version`
3. **Log in** – `gh auth login --web --git-protocol https` → copy the code from the terminal → Enter → paste it in the browser → **Authorize**.
4. **Commit name**
   ```
   git config --global user.name "YOUR_GITHUB_USERNAME"
   git config --global user.email "YOUR_GITHUB_USERNAME@users.noreply.github.com"
   ```
5. **Accept the repo invite** – https://github.com/Vlad387/unihack2026/invitations
6. **Clone**
   ```
   cd ~/Desktop
   git clone https://github.com/Vlad387/unihack2026.git
   cd unihack2026
   git checkout <your-name>      # rares / vladut / bordos / eidrien
   ```
7. **VS Code** – https://code.visualstudio.com → File → Open Folder → `unihack2026`. Extensions: **Python**, **Ruff**, **ESLint**, **Tailwind CSS IntelliSense**, **Docker**.
8. **Docker Desktop** – https://www.docker.com/products/docker-desktop → install → **keep it running** while you work. Windows: accept the WSL install and restart. Check: `docker --version`
9. **Gemini key** – Bordos creates it at https://aistudio.google.com/apikey and sends it **privately** to the others. In the repo root, everyone creates `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   DATABASE_URL=postgresql+psycopg://citymind:citymind@localhost:5432/citymind
   ```

### Python setup (Bordos, Eidrien, Rares)

10. **uv** – Mac: `curl -LsSf https://astral.sh/uv/install.sh | sh`. Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`. Reopen the terminal, then `uv python install 3.12`.
11. After Rares has pushed the backend: `git pull`, `cd backend`, `uv sync`.

### Node setup (Vladut)

10. **Node.js 22 LTS** from https://nodejs.org. Check: `node --version`
11. **pnpm** – `npm install -g pnpm`. Check: `pnpm --version`

---

## 6. First tasks per person

### Rares – D, Backend & infra (goes FIRST, Friday night)
1. On branch `rares`, create the backend:
   ```
   uv init backend --python 3.12
   cd backend
   uv add fastapi "uvicorn[standard]" pydantic sqlalchemy "psycopg[binary]" pgvector google-genai python-dotenv numpy scikit-learn umap-learn
   uv add --dev ruff pytest
   mkdir -p app/api app/agents app/clustering
   ```
   (HDBSCAN is built into scikit-learn, no separate package.)
2. `docker-compose.yml` in the repo root:
   ```yaml
   services:
     db:
       image: pgvector/pgvector:pg16
       environment:
         POSTGRES_USER: citymind
         POSTGRES_PASSWORD: citymind
         POSTGRES_DB: citymind
       ports: ["5432:5432"]
   ```
3. `app/schemas.py` (Statement, Vote, Camp, ClusterResult, Proposal, Verdict) + **stubs** in `app/agents/__init__.py` and `app/clustering/__init__.py` returning fake data with the contract signatures.
4. `app/main.py` with a `/health` endpoint. PR into `dev`, then tell the group: "pull + `uv sync`".
5. Then: `POST /responses`, `POST /votes`, WebSocket, background jobs, Vultr deploy (ask organizers for UniHack credits; Ubuntu server in Frankfurt).

### Bordos – A, AI agents
1. Create the Gemini key, share it privately.
2. On branch `bordos`, quick check that Gemini works (`backend/try_gemini.py`, don't commit it):
   ```python
   from dotenv import load_dotenv; load_dotenv("../.env")
   from google import genai
   client = genai.Client()
   print(client.models.generate_content(model="gemini-2.5-flash", contents="Salut!").text)
   ```
   `uv run python try_gemini.py` (use whatever Flash model AI Studio lists if this name changed)
3. Replace the stubs in order: `intake` → `mediate` → `critic` → (`proxy`). Same signatures, prompts in `agents/prompts/*.md`.

### Eidrien – B, Data science
1. On branch `eidrien`. **First:** `seed/responses.json` with 40–60 realistic answers to *„Ce facem cu viața de noapte din centru?”* (bar owners, residents, students, elderly people, tourists; mixed opinions; in Romanian).
2. Replace the stubs: `cluster()` = Gemini embeddings → `umap.UMAP(n_components=2)` → `sklearn.cluster.HDBSCAN` → camps + x,y. `bridges()` = statements with high agreement in **every** camp.
3. Then: eval numbers for the pitch (clustering quality, cost, latency), help C or the pitch.

### Vladut – C, Frontend
1. On branch `vladut`, from the repo root:
   ```
   pnpm create next-app@latest frontend --ts --tailwind --eslint --app --src-dir --use-pnpm
   cd frontend
   pnpm dlx shadcn@latest init
   pnpm add d3 qrcode.react
   pnpm add -D @types/d3
   ```
2. Build on fake data from `src/lib/mock.ts` until Rares's API is up.
3. Screen order: 1 (answer + mic) → 2 (vote statements) → live board (D3) → 3 (where you are) → 4 (vote compromise) → organizer pages.

---

## 7. Common problems
- `docker: command not found` / can't connect to DB → Docker Desktop isn't running.
- `GEMINI_API_KEY` missing → no `.env`, or it's not in the repo root.
- Conflict on `git pull` → don't panic, write in the group. Never `--force`.

---

## 8. Claude prompts – one per person

Open Claude Code in **your clone of the repo, on your branch**, and paste your prompt as the first message. Claude also reads this file automatically (through `CLAUDE.md`).

### Prompt – Rares (D, Backend & infra)
```
I'm Rares, role D (Backend & infra) on the CityMind team for UniHack 2026. Stop code is Sunday 13:00.
First read RULES.md and PLAN.md in this repo and follow them strictly.

My job: FastAPI backend, PostgreSQL + pgvector (docker-compose), the shared contract backend/app/schemas.py,
WebSocket live updates, background jobs, and later the Vultr deploy.
I own: backend/app/api/, main.py, db.py, schemas.py, backend/pyproject.toml, docker-compose.yml, .github/.
I work only on my branch `rares`; I open PRs into `dev`.

Do this first, in order (RULES.md section 6, Rares):
1. uv backend project with the listed packages, docker-compose.yml with pgvector, `docker compose up -d` working.
2. schemas.py with Statement, Vote, Camp, ClusterResult, Proposal, Verdict (Pydantic v2).
3. Stubs in app/agents/__init__.py (intake, mediate, critic) and app/clustering/__init__.py (cluster, bridges)
   with EXACTLY the signatures in RULES.md section 4, returning realistic fake data, so A, B and C can start.
4. main.py with /health. Run ruff + pytest, then help me open the PR into dev.
Then: POST /responses, POST /votes, WebSocket events map_updated / bridges_updated / proposal_published / support_updated.

Who I talk to: Bordos (A) about agent behavior, Eidrien (B) about clustering output, Vladut (C) about what screens
need from the API and the WebSocket event shapes. Don't edit agents/, clustering/ or frontend/ beyond the initial stubs.
Verify every endpoint actually works before saying it's done. If the same error fails 3 times, stop and tell me.
```

### Prompt – Bordos (A, AI agents)
```
I'm Bordos, role A (AI agents) on the CityMind team for UniHack 2026. Stop code is Sunday 13:00.
First read RULES.md and PLAN.md in this repo and follow them strictly.

My job: the AI agents, using Gemini through the google-genai SDK with structured output:
- intake(text, audio) -> list[Statement]: clean a citizen's answer (text or audio sent directly to Gemini),
  split it into short atomic statements, flag abuse / personal data / off-topic.
- mediate(camps, bridges, critiques, proxies) -> Proposal: write a compromise + what each camp gains and gives up.
- critic(proposal, camps) -> Verdict: is it faithful to real arguments, balanced, legal and possible?
- (stretch) proxy: simulated view of a missing group, ALWAYS labeled simulated.
I own only backend/app/agents/ (prompts go in backend/app/agents/prompts/*.md). I work on my branch `bordos`.

Rules: agents are pure functions – no database, no FastAPI, no imports from clustering/. Keep EXACTLY the
signatures from RULES.md section 4 and the models in app/schemas.py. I must not edit schemas.py or pyproject.toml:
if I need a new field or package, tell me so I can ask Rares.
Gemini Flash for intake and critic, Gemini Pro for mediate. If Gemini fails, raise a clear error – never lose input.

Start with intake, test it on seed/responses.json (from Eidrien) or on 5 sample Romanian answers, then mediate, then critic.
Who I talk to: Rares (D) for schemas, packages and how the API calls my functions; Eidrien (B) for what camps/bridges
look like. If the same error fails 3 times, stop and tell me.
```

### Prompt – Eidrien (B, Data science)
```
I'm Eidrien, role B (Data science) on the CityMind team for UniHack 2026. Stop code is Sunday 13:00.
First read RULES.md and PLAN.md in this repo and follow them strictly.

My job:
1. FIRST: seed/responses.json – 40–60 realistic answers in Romanian to "Ce facem cu viața de noapte din centru?"
   (bar owners, residents, students, elderly, tourists, mixed opinions, no real personal data).
2. cluster(statements, votes) -> ClusterResult: Gemini embeddings -> umap.UMAP(n_components=2) ->
   sklearn.cluster.HDBSCAN -> camps (with a short name/description) + x,y coordinates per participant for the live map.
3. bridges(votes, camps) -> list[Statement]: statements with high agreement in EVERY camp.
4. Later: eval numbers for the pitch (clustering quality / silhouette, cost, latency); stretch: representation audit.
I own only backend/app/clustering/ and seed/. I work on my branch `eidrien`.

Rules: pure functions – no database, no FastAPI, no imports from agents/. Keep EXACTLY the signatures from
RULES.md section 4 and the models in app/schemas.py. I must not edit schemas.py or pyproject.toml: if I need a new
field or package, tell me so I can ask Rares. Make it work with 40–60 answers (small data: tune UMAP/HDBSCAN params).

Who I talk to: Rares (D) for schemas, packages and how the API calls my functions; Bordos (A) because the intake agent
produces the statements I cluster; Vladut (C) for what the map needs (x,y range, camp colors).
If the same error fails 3 times, stop and tell me.
```

### Prompt – Vladut (C, Frontend)
```
I'm Vladut, role C (Frontend) and repo owner on the CityMind team for UniHack 2026. Stop code is Sunday 13:00.
First read RULES.md and PLAN.md in this repo and follow them strictly.

My job: Next.js (App Router, TypeScript strict) + Tailwind + shadcn/ui in frontend/:
- Mobile screens (citizens arrive from a QR code, UI text in Romanian):
  1 answer (big mic button with MediaRecorder + text field, optional neighborhood/age),
  2 vote on others' statements (agree / disagree / don't know),
  3 "where you are" on the opinion map, 4 vote + critique the compromise.
- Live board for the big screen: animated D3 opinion map, participant count, common ground, support per round.
- Organizer pages: create consultation (question, context, threshold, QR), moderation, final report.
I own only frontend/. I work on my branch `vladut`.

Rules: REST calls only in src/lib/api.ts, WebSocket only in src/lib/ws.ts, API types in src/lib/types.ts mirroring
backend/app/schemas.py. State: React state + one useConsultation() hook, no Redux/Zustand. Until Rares's API is up,
use fake data from src/lib/mock.ts. AI content is labeled as AI; simulated proxy voices use a different color and are
never counted in percentages. Check every screen in the browser, also at 375px width.

Start with the project setup from RULES.md section 6, then screen 1, screen 2, then the live board.
Who I talk to: Rares (D) for endpoints and WebSocket events. Bordos and Eidrien only through Rares's API.
If the same error fails 3 times, stop and tell me.
```
