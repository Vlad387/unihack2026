# CityMind – setup pas cu pas

Faceți pașii **în ordine**. Unde scrie „Mac” / „Windows”, faceți doar varianta voastră.
Comenzile se rulează în **Terminal** (Mac) sau **PowerShell** (Windows).

Cine e cine (vezi [PLAN.md](PLAN.md)): **A** agenți AI · **B** data science · **C** frontend · **D** backend & infra.

---

## Partea 1 – TOȚI (≈ 30 min)

### 1. Git
- **Mac:** `xcode-select --install` → Install. (Dacă zice „already installed”, e ok.)
- **Windows:** descarcă de pe https://git-scm.com/download/win → Next la tot.

Verificare: `git --version`

### 2. GitHub CLI (`gh`)
- **Mac:** descarcă `gh_..._macOS_universal.pkg` de pe https://github.com/cli/cli/releases/latest → dublu-click.
  Dacă macOS îl blochează: Configurări sistem → Confidențialitate și securitate → jos la Securitate → **Deschide oricum**.
- **Windows:** `winget install --id GitHub.cli` (apoi închide și redeschide PowerShell)

Verificare: `gh --version`

### 3. Logare în GitHub
```
gh auth login --web --git-protocol https
```
Copiezi codul din terminal → Enter → îl lipești în browser → **Authorize**.

### 4. Numele pe commit-uri
```
git config --global user.name "USERNAME_GITHUB"
git config --global user.email "USERNAME_GITHUB@users.noreply.github.com"
```

### 5. Acceptă invitația la repo
Vlad te adaugă ca colaborator → accepți pe https://github.com/Vlad387/unihack2026/invitations

### 6. Clonează proiectul
```
cd ~/Desktop
git clone https://github.com/Vlad387/unihack2026.git
cd unihack2026
git checkout dev
```

### 7. VS Code
Descarcă de pe https://code.visualstudio.com → deschide folderul `unihack2026` (File → Open Folder).
Extensii (tab-ul Extensions, stânga): **Python**, **Ruff**, **ESLint**, **Tailwind CSS IntelliSense**, **Docker**.

### 8. Docker Desktop
Descarcă de pe https://www.docker.com/products/docker-desktop → instalează → **pornește aplicația** (trebuie să ruleze când lucrați).
Windows: acceptă instalarea WSL dacă ți-o cere și repornește.

Verificare: `docker --version`

### 9. Cheia Gemini
O singură persoană face cheia pe https://aistudio.google.com/apikey și o trimite **pe privat** celorlalți (nu pe grup public, nu în cod).
În folderul proiectului, fiecare creează fișierul `.env`:
```
GEMINI_API_KEY=cheia_aici
DATABASE_URL=postgresql+psycopg://citymind:citymind@localhost:5432/citymind
```
`.env` e deja în `.gitignore`, deci **nu ajunge pe GitHub**. Nu-l scoateți de acolo.

---

## Partea 2 – Python (doar A, B, D)

### 10. Instalează `uv` (gestionează Python și pachetele)
- **Mac:** `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Windows:** `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

Închide și redeschide terminalul, apoi:
```
uv python install 3.12
```

### 11. Instalează pachetele backend-ului
(după ce D a făcut pasul D1 și a dat push)
```
git pull
cd backend
uv sync
```
Rulezi orice script Python cu `uv run ...` (ex: `uv run python script.py`) – folosește automat mediul corect.

⚠️ **Nu adăugați pachete singuri** (`uv add`). Cereți-i lui D, ca `pyproject.toml` să nu aibă conflicte.

---

## Partea 3 – pe roluri

### D – Backend & infra (face primul, vineri seara)

**D1. Proiectul backend** (o singură dată, apoi push):
```
cd ~/Desktop/unihack
git checkout dev && git pull
git checkout -b d/setup
uv init backend --python 3.12
cd backend
uv add fastapi "uvicorn[standard]" pydantic sqlalchemy "psycopg[binary]" pgvector google-genai python-dotenv numpy scikit-learn umap-learn
uv add --dev ruff pytest
mkdir -p app/api app/agents app/clustering
```
(`HDBSCAN` e inclus în `scikit-learn`, nu mai trebuie pachet separat.)

**D2. Baza de date** – `docker-compose.yml` în rădăcina proiectului:
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
Pornire: `docker compose up -d` · Oprire: `docker compose down`

**D3. Contractul comun** – `backend/app/schemas.py` (Statement, Vote, Camp, ClusterResult, Proposal, Verdict) + stub-urile:
`app/agents/__init__.py` (`intake`, `mediate`, `critic`) și `app/clustering/__init__.py` (`cluster`, `bridges`) care returnează date false.

**D4. Push + PR în dev**, anunță pe grup „gata, dați `git pull` + `uv sync`”.

**Rulare API:** `cd backend && uv run uvicorn app.main:app --reload` → http://localhost:8000/docs

**Mai târziu:** cont pe https://www.vultr.com (întrebați organizatorii de credite UniHack), server Ubuntu în Frankfurt, Docker pe el, deploy.

---

### A – Agenți AI

1. Pașii 1–11.
2. Branch: `git checkout dev && git pull && git checkout -b a/intake`
3. Lucrezi **doar** în `backend/app/agents/`.
4. Test rapid că merge Gemini – `backend/try_gemini.py`:
   ```python
   from dotenv import load_dotenv; load_dotenv("../.env")
   from google import genai
   client = genai.Client()
   print(client.models.generate_content(model="gemini-2.5-flash", contents="Salut!").text)
   ```
   `uv run python try_gemini.py`
5. Înlocuiești stub-urile cu cod real, în ordinea: `intake` → `mediate` → `critic`. Păstrezi exact semnăturile din `schemas.py`.
6. Pentru output structurat, dai lui Gemini modelul Pydantic ca `response_schema` (vezi docs google-genai „structured output”).
7. Ține prompturile în fișiere separate (`agents/prompts/*.md`) – metodologia trebuie să fie publică.

---

### B – Data science

1. Pașii 1–11.
2. Branch: `git checkout dev && git pull && git checkout -b b/seed`
3. **Primul lucru:** `seed/responses.json` – 40–60 de răspunsuri realiste la „Ce facem cu viața de noapte din centru?”
   (patroni, localnici, studenți, vârstnici, turiști…; amestecați opinii).
4. Lucrezi **doar** în `backend/app/clustering/` și `seed/`.
5. Opțional pentru experimente: în VS Code instalezi extensia **Jupyter**, apoi `uv add --dev ipykernel` (prin D).
6. Înlocuiești stub-urile:
   - `cluster()`: embeddings Gemini → `umap.UMAP(n_components=2)` → `sklearn.cluster.HDBSCAN` → tabere + x,y
   - `bridges()`: afirmațiile cu % „de acord” mare în **toate** taberele
7. După: ajuți la cifrele din pitch (cost, latență, calitatea grupării).

---

### C – Frontend

1. Pașii 1–9 (fără Python).
2. **Node.js 22 LTS:** descarcă de pe https://nodejs.org → instalează. Verificare: `node --version`
3. **pnpm:** `npm install -g pnpm` · Verificare: `pnpm --version`
4. Branch: `git checkout dev && git pull && git checkout -b c/setup`
5. Creezi proiectul (o singură dată, din rădăcina repo-ului):
   ```
   pnpm create next-app@latest frontend --ts --tailwind --eslint --app --src-dir --use-pnpm
   cd frontend
   pnpm dlx shadcn@latest init
   pnpm add d3 qrcode.react
   pnpm add -D @types/d3
   ```
6. Rulare: `pnpm dev` → http://localhost:3000
7. Lucrezi **doar** în `frontend/`. Până e gata API-ul lui D, folosești date false dintr-un fișier `src/mock.ts`.
8. Ordinea ecranelor: 1 (răspuns + microfon) → 2 (vot afirmații) → live board (D3) → 3 → 4 → organizator.
9. API-ul: `http://localhost:8000` (documentația live la `/docs`).

---

## Partea 4 – în fiecare zi, pentru toți

```
git checkout dev
git pull
git checkout -b litera/ce-faci        # ex: c/live-board
# ... lucrezi ...
git add .
git commit -m "ce ai făcut"
git push -u origin litera/ce-faci
gh pr create --base dev --fill        # deschide Pull Request în dev
```
Merge-ul îl faceți pe GitHub (butonul **Merge pull request**). Apoi toți: `git checkout dev && git pull`.

**Probleme frecvente**
- `docker: command not found` / nu se conectează la bază → Docker Desktop nu e pornit.
- `GEMINI_API_KEY` lipsă → nu ai `.env` sau nu e în folderul corect.
- Conflict la `git pull` → nu panica, scrie pe grup; nu folosi `git push --force`.
