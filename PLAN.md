# CityMind – plan de lucru pentru 4 oameni

Stop code: **duminică, 13:00**. Nucleul care nu se taie: **răspuns → hartă live → compromis votat**.

## 1. Regula de aur: lucrăm în paralel prin contracte + stub-uri

Fiecare om are **folderul lui**. Între foldere comunicăm doar prin:
- `backend/app/schemas.py` – modelele Pydantic comune (le scrie D vineri, se schimbă doar prin PR anunțat pe grup)
- funcțiile de mai jos, care la început returnează **date false (stub)**, ca nimeni să nu aștepte după altcineva

```python
# backend/app/agents/   (A)
intake(text: str | None, audio: bytes | None) -> list[Statement]
mediate(camps, bridges, critiques, proxies) -> Proposal
critic(proposal, camps) -> Verdict

# backend/app/clustering/   (B)
cluster(statements, votes) -> ClusterResult   # tabere + coordonate x,y pentru fiecare participant
bridges(votes, camps) -> list[Statement]      # puncte comune
```

Evenimente WebSocket (D le trimite, C le ascultă): `map_updated`, `bridges_updated`, `proposal_published`, `support_updated`.

## 2. Cine ce face

| Om | Rol | Folder | Livrează |
|---|---|---|---|
| **A** | Agenți AI | `backend/app/agents/` | Intake, Mediator, Critic, (Proxy), prompturi, apeluri Gemini |
| **B** | Data science | `backend/app/clustering/`, `seed/` | embeddings, UMAP + HDBSCAN, Bridge-finder, cele 40–60 de răspunsuri seed, evaluări |
| **C** | Frontend | `frontend/` | ecranele 1–4 (mobil), live board cu D3, creare consultare + moderare |
| **D** | Backend & infra | `backend/app/api/`, `docker-compose.yml`, `.github/` | FastAPI, Postgres, WebSocket, legarea funcțiilor A+B, deploy Vultr |

## 3. Pe ore

| Când | A – Agenți | B – Data | C – Frontend | D – Backend |
|---|---|---|---|---|
| **Vineri → 23:00** | cheie Gemini, prompt Intake pe 5 exemple | scrie seed-ul (CH-19, 40–60 răspunsuri) | `create-next-app`, ecranul 1 pe date mock | `schemas.py`, `docker compose up` (api + postgres), stub-uri A+B |
| **Sâmbătă → 12:00** | Intake real (text + audio direct în Gemini) | `cluster()` pe seed, coordonate x,y | ecranele 1 + 2 legate de API | `POST /responses`, `POST /votes`, Intake în fundal |
| **Sâmbătă → 18:00** | Mediator (Gemini Pro) | `bridges()` | ecranul 3 + live board (D3) pe WebSocket | WebSocket live, primul deploy Vultr |
| **Sâmbătă seara** | bucla Mediator ↔ vot, 2 runde | reclustering pe date reale | ecranul 4 (vot compromis) | QR, test cu 20–30 de oameni de la UniHack |
| **Sâmbătă noaptea** | Critic, (Proxy) | (Auditor reprezentare), scor evaluări | creare consultare + moderare, raport | raport final, rate limiting |
| **Duminică → 11:00** | feature freeze | cifrele pentru pitch | lustruit live board | test încărcare, video backup |
| **Duminică 11–13** | pitch | pitch | pitch | pitch |

`()` = stretch, se taie primul. Ordinea de tăiat: Auditor + Proxy → Critic → raport PDF.

## 4. Simplificări propuse față de document (48h sunt puține)

| În document | Propunere | De ce |
|---|---|---|
| Celery + Redis pub/sub | `BackgroundTasks` din FastAPI + broadcast WebSocket în același proces | un singur server la demo, mai puține piese care pică |
| Whisper separat | audio direct în Gemini | un serviciu în minus |
| LangGraph | funcții Python simple; LangGraph doar dacă rămâne timp | bucla are 2–3 pași, nu are nevoie de graf |
| MinIO | audio salvat pe disc sau nesalvat deloc | nu e nevoie la demo |
| Langfuse, Prometheus, Grafana, Sentry, OpenTelemetry | doar logare simplă (tokeni, latență, cost) într-un tabel | cifrele pentru pitch se obțin și așa |
| Auth0 | doar dacă vreți premiul Auth0, și doar pentru login organizator | cetățenii intră fără cont oricum |

Păstrăm: Next.js, FastAPI, Postgres + pgvector, Gemini, Vultr (premii pentru Gemini și Vultr).

## 5. Git – cum nu ne călcăm pe picioare

1. `git checkout dev && git pull`
2. `git checkout -b a/intake` (prefixul = litera ta)
3. commit des, `git push -u origin a/intake`
4. Pull Request în `dev`, merge rapid (fără review obligatoriu, e hackathon)
5. **Nimeni nu dă push direct pe `main`.** Vlad face merge `dev → main` la fiecare checkpoint care merge.

Fișierele comune (`schemas.py`, `docker-compose.yml`, `package.json`) – anunțați pe grup înainte să le modificați.
