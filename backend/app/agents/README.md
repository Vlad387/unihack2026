# Agenți AI – Bordos (rol A)

Ce s-a făcut în `backend/app/agents/`, pe scurt, pentru toată echipa.

| Agent | Ce face | Stare |
|---|---|---|
| `intake` | împarte și filtrează răspunsurile cetățenilor | ✅ gata, în `dev` (PR #9) |
| `mediate` | scrie compromisul între tabere | ✅ gata, în `dev` (PR #15) |
| `critic` | verifică dacă compromisul e corect și echilibrat | ✅ gata, în `dev` (PR #22) |
| `name_camps` | dă nume și descriere reale taberelor („Liniște și odihnă") | ✅ gata, în `dev` (PR #31), legat de hartă de Rares (`api/camp_names.py`) |
| `proxy` | simulează vocea unui grup care lipsește (opțional) | ❌ neînceput |

Secțiunile 1–7: `intake`; 8–10: `mediate`; 11–13: `critic`; 14: `name_camps`.
**Modele și cota gratuită: secțiunea 5.**

---

## 1. `intake` – ce face

Este „ușa de intrare" a aplicației. Primește răspunsul brut al unui cetățean
(scris sau vorbit) și îl transformă în **afirmații scurte, pe care alții pot vota**.

1. **Segmentează**: un răspuns cu mai multe idei devine mai multe afirmații,
   câte o idee fiecare (ca să poți fi de acord cu una și nu cu alta).
2. **Curăță**: scoate saluturile și bâlbâielile, pune diacritice, păstrează
   exact părerea omului (nu o îndulcește, nu adaugă argumente).
3. **Moderează**: pune un `flag` pe ce nu trebuie arătat direct la vot:
   - `abuse` – insulte, amenințări, ură
   - `personal_data` – nume de persoane private, telefoane, adrese, emailuri
   - `off_topic` – spam, reclame, subiecte fără legătură cu orașul

   Afirmațiile cu `flag` merg la moderator, **nu** la vot.

**Exemplu real (seed-002):**

> IN: „Nu vreau să dispară barurile din centru. Problema mea sunt oamenii care strigă sub geam după închidere, nu muzica din local."

> OUT 1: „Barurile din centru nu ar trebui să dispară."
> OUT 2: „Adevărata problemă o reprezintă oamenii care strigă pe stradă după închiderea localurilor, nu muzica din interior."

**Unde e în fluxul aplicației:**

```
cetățean răspunde → intake (segmentează + moderează) → alții votează
  → clustering face taberele (Eidrien) → mediate scrie compromisul → critic îl verifică
```

`intake` **nu** face taberele – le face clustering-ul lui Eidrien, din afirmațiile
produse de `intake` și din voturi.

---

## 2. Cum se folosește (pentru Rares / API)

```python
from app.agents import intake, AgentError

try:
    statements = intake(text="...", audio=None)  # sau audio=bytes, sau ambele
except AgentError:
    # Gemini a picat: păstrează răspunsul brut în DB și reîncearcă mai târziu.
    # Nu pierde niciodată răspunsul cetățeanului.
    ...
```

- Semnătura e exact cea din contract: `intake(text: str | None, audio: bytes | None) -> list[Statement]`.
- Returnează `Statement` cu `id` unic, `text`, `flag` (sau `None`) și **`author_id=None`**
  – API-ul pune `author_id` = id-ul participantului.
- Fără text și fără audio → `[]`, fără apel la Gemini.
- **Durează 5–30 secunde** (uneori mai mult când Google e aglomerat) → rulează-l
  în fundal (`BackgroundTasks`), nu în request-ul cetățeanului.
- **Audio**: trimite direct bytes-ii din `MediaRecorder` (webm pe Chrome, mp4 pe Safari).
  Formatul e detectat automat din primii bytes; nu e nevoie de transcriere separată.

---

## 3. Tech stack

- **Python 3.12** + **Gemini Flash-Lite** (`gemini-3.5-flash-lite`, vezi secțiunea 5) prin SDK-ul `google-genai`.
- **Structured output**: Gemini e obligat să răspundă în JSON cu formă fixă
  (`response_schema`), apoi rezultatul devine `Statement` din `schemas.py` (Pydantic v2).
- **Prompt** separat de cod: [`prompts/intake.md`](prompts/intake.md) (metodologia e publică).
- **Retry automat**: la 429 / 5xx („high demand") reîncearcă de 4 ori; dacă tot nu
  merge, aruncă `AgentError`.
- **Thinking `low`** pentru intake → mai rapid; sarcina e simplă.
- Cheia se citește din `.env` din rădăcina repo-ului (`GEMINI_API_KEY`).

---

## 4. Fișiere

| Fișier | Ce conține |
|---|---|
| `__init__.py` | exportă `intake`, `mediate`, `critic`, `name_camps`, `AgentError` |
| `gemini.py` | partea comună pentru toți agenții: client Gemini, modele, retry, rezervă la 429, `AgentError` |
| `intake_agent.py`, `mediate_agent.py`, `critic_agent.py`, `naming_agent.py` | cei 4 agenți |
| `prompts/*.md` | instrucțiunile pentru Gemini, câte una pe agent |
| `demo_*.py` | scripturi de test live (consumă din cota Gemini) |
| `../../tests/test_intake.py`, `test_mediate.py`, `test_critic.py`, `test_naming.py`, `test_gemini.py` | teste fără internet |
| `../../tests/conftest.py` | înlocuiește Gemini cu un fals în **toate** testele |

Modulele se numesc `*_agent.py` (nu `intake.py`) ca să nu se bată cap în cap
cu funcțiile `intake`, `mediate`… exportate din `__init__.py`.

---

## 5. Modele Gemini – IMPORTANT pentru toți

- **Cheia API e bună.** `gemini-2.5-*` și modelele **Pro** nu merg pe cheia noastră (404).
- **Cota gratuită e pe model și pe zi** (~20 cereri/zi la `gemini-3.5-flash`; limita exactă: https://ai.dev/rate-limit). Când se
  termină: eroare **429**. Fiecare model are cota lui, deci împărțim agenții pe modele:
- **Decizia echipei: fără billing → toți agenții pe Flash-Lite** (Flash a rămas fără cotă la teste).

| Agent | Model implicit | De ce | Schimbi din `.env` |
|---|---|---|---|
| `intake` | `gemini-3.5-flash-lite` | 1 apel la **fiecare** răspuns → cele mai multe apeluri | `GEMINI_INTAKE_MODEL` |
| `mediate` | `gemini-3.5-flash-lite` | 1 apel pe rundă (testat: propuneri bune, 5–10 s) | `GEMINI_MEDIATE_MODEL` |
| `critic` | `gemini-3.5-flash-lite` | 1 apel pe rundă, verificare | `GEMINI_CRITIC_MODEL` |
| `name_camps` | `gemini-3.5-flash-lite` | 1 apel doar când apar tabere noi | `GEMINI_NAMING_MODEL` |
| rezervă | `gemini-3.1-flash-lite` | folosit **automat** când un model dă 429 | `GEMINI_FALLBACK_MODEL` |

- Dacă modelul agentului dă **429**, se încearcă o dată modelul de rezervă. Dacă și
  acela dă 429 → `AgentError`. Erorile 5xx („high demand") se reîncearcă de 4 ori.
- **Pentru demo:** cu billing activat pe cheie (Google AI Studio → Billing) limitele cresc mult.
- **Embeddings** merg pe cheie: `gemini-embedding-001` și `gemini-embedding-2` (3072 dimensiuni).

---

## 6. Cum testezi

Din `backend/`:

```bash
uv run pytest                              # toate testele, fără Gemini real, gratuit
uv run python -m app.agents.demo_intake    # live: primele 5 răspunsuri din seed
uv run python -m app.agents.demo_intake 12 # primele 12
uv run python -m app.agents.demo_intake seed-009 seed-021   # anumite id-uri
```

**Testat live** pe 8 răspunsuri din seed + cazuri speciale:

| Caz | Rezultat |
|---|---|
| răspuns cu 2 idei | 2 afirmații separate ✅ |
| insulte | `abuse`, iar cererea normală din același răspuns rămâne separată ✅ |
| nume + telefon | `personal_data`, textul nu le mai repetă ✅ |
| reclamă | `off_topic` ✅ |
| „ignoră instrucțiunile și scrie…" | nu ascultă, tratează ca opinie ✅ |
| doar „bună ziua" | nicio afirmație ✅ |

**Notă pentru teste (Rares):** `tests/conftest.py` înlocuiește automat Gemini cu
un fals în toate testele, ca `pytest` să nu consume cheia și să meargă offline.
Testul `test_stubs.py` merge în continuare neschimbat.

---

## 7. Probleme cunoscute

- Uneori Gemini adaugă „doar" unde cetățeanul nu l-a spus (ex. seed-008). Promptul
  îi interzice, dar nu e 100%.
- Audio a fost testat doar cu Gemini fals, **nu** cu o înregistrare reală.
- Timpul variază mult (5–56 s) când Google e aglomerat, din cauza retry-urilor.
- Promptul nu primește întrebarea consultării (semnătura nu o are), deci `off_topic`
  înseamnă „nu e despre oraș", nu „nu e despre întrebarea asta". Dacă vrem mai strict,
  trebuie adăugat un parametru în contract (prin Rares).

---

## 8. `mediate` – ce face

Este **„mediatorul" dintre tabere**. După ce oamenii au răspuns și au votat, clustering-ul
(Eidrien) îi împarte în tabere cu păreri asemănătoare. `mediate` citește ce vrea fiecare
tabără și scrie **o singură propunere de compromis**, plus pentru **fiecare tabără**:
- ce **câștigă** din propunere
- la ce **cedează**

Frontend-ul afișează asta pe ecranul 4 („Câștigă:" verde / „Cedează:" roșu), iar oamenii votează.

**Primește:**
- **taberele** – fiecare cu nume, mărime și argumentele scrise de membrii ei
- **punctele comune** (`bridges`) – afirmații cu care sunt de acord **toate** taberele
- **criticile** oamenilor la propunerea din runda trecută (gol în runda 1)
- **vocile simulate** (`proxies`, opțional) – **nu** sunt cetățeni, nu contează ca voturi

**Exemplu real (runda 1, 3 tabere din seed):**

> Propunere: „Muzica pe terase încetează la 23:00; terasele închid la 23:00 în timpul săptămânii
> și la 24:00 în weekend. În interior, localurile pot funcționa până la 02:00 în weekend, cu
> controale de zgomot. Primăria introduce autobuze și patrule de noapte și curățenie dimineața."

> **Liniște pentru locuitori** – câștigă: oprirea muzicii pe terase la 23 și controale de zgomot ·
> cedează: acceptă terase până la 24 în weekend și interior până la 02.
>
> **Centru viu** – câștigă: interior până la 02 în weekend · cedează: renunță la muzica pe terasă după 23.
>
> **Siguranță și transport** – câștigă: autobuze și patrule de noapte · cedează: centrul rămâne
> aglomerat până târziu în weekend.

**Runda 2**, după 3 critici („02 e prea târziu", „cine plătește?", „localurile mici nu sunt cluburi"):
a coborât interiorul la **01**, a spus că plătesc **taxele de autorizare** și a **separat**
restaurantele de cluburi → chiar ține cont de critici.

**Unde e în fluxul aplicației:**

```
cetățean răspunde → intake → alții votează → clustering face taberele
  → mediate scrie compromisul → critic îl verifică → oamenii votează → runda 2
```

---

## 9. `mediate` – cum funcționează (pe 4 pași)

Este construit **exact ca `intake`**: aceeași rețetă, alte date.

```
1. strânge datele → 2. le trimite la Gemini cu instrucțiuni → 3. primește răspuns în format fix → 4. verifică
```

**Pasul 1 – strânge datele.** Din tabere face un „dosar" JSON pentru Gemini:

```json
{
  "camps": [
    {"id": "c1", "name": "Liniște pentru locuitori", "size": 8,
     "arguments": ["Terasele să închidă la 23...", "Am copil mic..."]}
  ],
  "common_ground": ["Este nevoie de transport public noaptea."],
  "critiques": [],
  "simulated_voices": []
}
```

Pe drum face 3 filtre: ia doar ce au **scris** membrii taberei (nu tot ce au votat),
**scoate** afirmațiile marcate (insulte, date personale), ia **maxim 20** de argumente pe tabără.

**Pasul 2 – instrucțiunile** ([`prompts/mediate.md`](prompts/mediate.md)), ca o „fișă de post":
o propunere concretă (ore, zone, cine plătește), pornește de la punctele comune, fiecare tabără
câștigă **și** cedează ceva, vocile simulate nu sunt cetățeni, nu inventa legi sau cifre.

**Pasul 3 – răspuns în format fix** (structured output), ca să-l putem citi sigur:

```json
{
  "text": "Propunem ca muzica pe terase să înceteze la 23...",
  "tradeoffs": [
    {"camp_id": "c1", "gains": "...", "gives_up": "..."},
    {"camp_id": "c2", "gains": "...", "gives_up": "..."}
  ]
}
```

**Pasul 4 – verificarea.** Are **fiecare** tabără câștig și cedare? Dacă Gemini a uitat o
tabără → eroare (`AgentError`), API-ul reîncearcă. Altfel devine un `Proposal` din `schemas.py`.

**`intake` vs `mediate`:**

| | `intake` | `mediate` |
|---|---|---|
| Primește | un răspuns de cetățean | tabere + puncte comune + critici |
| Instrucțiuni | „împarte în idei, marchează insultele" | „scrie un compromis corect" |
| Gemini răspunde | listă de afirmații | propunere + câștig/cedare pe tabără |
| Verificare | scoate afirmațiile goale | fiecare tabără trebuie să apară |
| Gândire | `low` → rapid (5–30 s) | `high` → 5–10 s pe flash-lite |

---

## 10. `mediate` – pentru Rares (API) și testare

```python
from app.agents import mediate, AgentError

try:
    proposal = mediate(camps, bridges, critiques, proxies)  # -> Proposal
except AgentError:
    # nicio tabără / Gemini a picat / Gemini a uitat o tabără → reîncearcă mai târziu
    ...
```

- `proposal.tradeoffs` are **exact câte unul per tabără**, în ordinea taberelor.
- `proposal.round` e mereu 1 → **API-ul îl suprascrie** cu runda reală.
- `critiques` = textele criticilor din runda trecută (listă de `str`).
- Durează **5–10 s (pe flash-lite; până la ~60 s când Google e aglomerat)** → rulează-l **în fundal**.
- Model: `gemini-3.5-flash-lite` (`GEMINI_MEDIATE_MODEL`, vezi secțiunea 5).

**Fișiere:** `mediate_agent.py`, `prompts/mediate.md`, `demo_mediate.py`, `../../tests/test_mediate.py`.

**Test live** (3 tabere făcute de mână din seed, până e gata `cluster()` real), din `backend/`:

```bash
uv run python -m app.agents.demo_mediate      # runda 1
uv run python -m app.agents.demo_mediate 2    # runda 2, cu critici
```

**Probleme cunoscute:** uneori în „cedează" adaugă un detaliu care nu e în textul propunerii
(ex. „autobuzele doar pe arterele principale"). Asta trebuie să prindă `critic` (următorul agent).

---

## 11. `critic` – ce face

Este **„al doilea cititor"** al propunerii. După ce `mediate` scrie compromisul, `critic`
îl citește **strict și corect**, înainte să-l vadă oamenii, și verifică dacă e bun.
E ca un profesor care corectează lucrarea mediatorului.

Răspunde la **3 întrebări cu da / nu** + o **notă scurtă** pentru cetățeni:

| Întrebare | Ce verifică, simplu |
|---|---|
| **fidelă?** (`faithful`) | spune propunerea ce au zis **de fapt** oamenii? câștigurile/cedările nu **inventează** detalii care nu sunt în text? |
| **echilibrată?** (`balanced`) | **fiecare** tabără câștigă ceva **și** cedează ceva? nu plătește o tabără pentru toți? |
| **realizabilă?** (`feasible`) | poate primăria chiar s-o facă, legal și practic? nu se contrazice? |
| **notă** (`notes`) | 1–3 propoziții în română, cu numele taberelor; dacă ceva e greșit, spune **concret ce** |

Verdictul apare **lângă propunere** în aplicație, ca verificare AI, iar oamenii votează
știind ce a găsit `critic`.

**De ce e nevoie de el?** Pentru că și AI-ul greșește. `mediate` a scris o dată la o tabără
„cedează: autobuzele vor circula doar pe arterele principale" – dar propunerea **nu spunea asta**.
Fără `critic`, oamenii ar fi votat pe o informație inventată.

**Exemplu real – `critic` prinde exact greșeala asta:**

> ❌ fidelă: **nu** · ✅ echilibrată · ✅ realizabilă
>
> Notă: „Propunerea este echilibrată și realizabilă, însă tabăra Siguranță și transport
> menționează că autobuzele vor circula doar pe arterele principale, un detaliu care
> nu apare în textul propunerii."

**Exemplu real – o propunere părtinitoare** („toate localurile închid la 22, muzica interzisă complet"):

> ❌ fidelă · ❌ echilibrată · ❌ realizabilă
>
> Notă: „…ignoră total nevoile taberelor «Centru viu» și «Siguranță și transport»,
> nefiind o soluție echilibrată sau viabilă."

**Unde e în fluxul aplicației:**

```
cetățean răspunde → intake → alții votează → clustering face taberele
  → mediate scrie compromisul → critic îl verifică → oamenii votează → runda 2
```

---

## 12. `critic` – cum funcționează (pe 4 pași)

**Aceeași rețetă ca `intake` și `mediate`**, alte date:

```
1. strânge datele → 2. le trimite la Gemini cu instrucțiuni → 3. primește răspuns în format fix → 4. verifică
```

**Pasul 1 – strânge datele.** Pune într-un „dosar" JSON propunerea și argumentele taberelor.
La propunere folosește **numele** taberelor (nu `c1`, `c2`), ca nota să fie pe înțelesul oamenilor:

```json
{
  "proposal": {
    "text": "Propunem ca muzica pe terase să înceteze la 23...",
    "tradeoffs": [
      {"camp": "Liniște pentru locuitori", "gains": "...", "gives_up": "..."}
    ]
  },
  "camps": [
    {"id": "c1", "name": "Liniște pentru locuitori", "size": 8,
     "arguments": ["Terasele să închidă la 23...", "Am copil mic..."]}
  ]
}
```

Argumentele trec prin **aceleași filtre ca la `mediate`**: doar ce au scris membrii taberei,
fără afirmațiile marcate, maxim 20 pe tabără.

**Pasul 2 – instrucțiunile** ([`prompts/critic.md`](prompts/critic.md)), „fișa de post":
cum se verifică fiecare din cele 3 întrebări, ce înseamnă „detaliu inventat",
cum se scrie nota (scurt, calm, cu numele taberelor, fără termeni tehnici).

**Pasul 3 – răspuns în format fix.** Gemini răspunde direct în forma `Verdict` din `schemas.py`:

```json
{"faithful": false, "balanced": true, "feasible": true, "notes": "..."}
```

**Pasul 4 – verificarea în cod.** Dacă o tabără **nu are deloc** câștig/cedare în propunere,
codul pune singur `balanced = false` și scrie în notă ce tabără lipsește – **nu ne bazăm pe AI**
pentru o regulă atât de clară.

**Cei 3 agenți, comparați:**

| | `intake` | `mediate` | `critic` |
|---|---|---|---|
| Primește | un răspuns de cetățean | tabere + puncte comune + critici | propunerea + taberele |
| Gemini răspunde | listă de afirmații | propunere + câștig/cedare pe tabără | 3 × da/nu + notă |
| Verificare în cod | scoate afirmațiile goale | fiecare tabără trebuie să apară | tabără lipsă → nu e echilibrată |
| Model | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` |
| Durează | 5–30 s | 5–10 s | 5–10 s |

---

## 13. `critic` – pentru Rares (API) și testare

```python
from app.agents import critic, AgentError

try:
    verdict = critic(proposal, camps)  # -> Verdict
except AgentError:
    # nicio tabără / Gemini a picat → publică propunerea fără verdict
    verdict = None
```

- Semnătura e cea din contract: `critic(proposal: Proposal, camps: list[Camp]) -> Verdict`.
- API-ul pune rezultatul în `Proposal.verdict` (deja făcut de Rares în `api/proposals.py`).
- Durează **5–10 s**.

**Test live** pe 3 propuneri salvate (nu consumă cota lui `mediate`), din `backend/`:

```bash
uv run python -m app.agents.demo_critic
```

| Caz | Rezultat (rulat de 3 ori, pe 2 modele) |
|---|---|
| propunere bună | ✅ fidelă, echilibrată, realizabilă – de fiecare dată |
| „cedează" cu detaliu inventat („autobuze doar pe arterele principale") | ❌ fidelă = nu, nota spune exact ce rând e greșit – de fiecare dată |
| propunere părtinitoare (totul închis la 22, muzică interzisă) | ❌ picată la toate 3 – de fiecare dată |

**Teste fără internet:** `../../tests/test_critic.py` (agentul) și `../../tests/test_gemini.py`
(modelele de rezervă la 429). `tests/conftest.py` înlocuiește Gemini și pentru `critic`.

**Probleme cunoscute:** o singură dată (din 9 rulări) nota a avut diacritice stricate
(„Siguranșă"). Nota are uneori puțin peste 60 de cuvinte.

**Fișiere:** `critic_agent.py`, `prompts/critic.md`, `demo_critic.py`.

---

## 14. `name_camps` – nume reale pentru tabere

**Ce face:** clustering-ul face taberele, dar le dă nume generice („Tabăra 1", „Tabăra 2").
`name_camps` citește ce au scris oamenii din fiecare tabără și îi dă un **nume scurt**
și o **descriere de o propoziție**, care apar pe harta de pe ecranul mare și pe telefoane.

**Exemplu real** – clustering-ul lui Eidrien pe tot seed-ul (50 de oameni, 737 de voturi),
apoi `name_camps`, **un singur apel, 1,5 s**:

| Înainte | După |
|---|---|
| Tabăra 1 (15 oameni) | **Viață de noapte activă** – „Vor program flexibil pentru terase și baruri deschise până târziu în centru." |
| Tabăra 2 (16 oameni) | **Liniște și odihnă** – „Cer ore stricte de liniște și măsuri ferme împotriva zgomotului nocturn." |
| Tabăra 3 (19 oameni) | **Curățenie și transport noaptea** – „Solicită transport nocturn, siguranță sporită și curățenie mai bună în centru." |

**Reguli din prompt** ([`prompts/naming.md`](prompts/naming.md)): 2–4 cuvinte, despre **ce vrea**
tabăra, nu despre **cine** e (niciodată „Bătrânii", „Studenții", „Patronii"), neutru, fără ironie,
nume clar diferite între ele.

**Cum funcționează** – aceeași rețetă în 4 pași:
1. **Strânge datele** – pentru fiecare tabără: argumentele scrise de membri (aceleași filtre ca la
   `mediate`) + numele deja folosite de alte tabere (`taken_names`).
2. **Instrucțiunile** – `prompts/naming.md`.
3. **Răspuns în format fix** – pentru fiecare tabără: `camp_id`, `name`, `description`.
4. **Verificare în cod** – o tabără pe care Gemini a sărit-o, sau al cărei nume se repetă
   (cu alta sau cu `taken_names`), **își păstrează numele vechi**. Taberele fără niciun argument
   scris nu sunt trimise la Gemini.

**Pentru Rares – cum îl legi de hartă** (✅ făcut în `api/camp_names.py`, PR #35):

```python
from app.agents import name_camps, AgentError

# în live.recompute(), DUPĂ camp_ids.stabilize():
new = [c for c in result.camps if c.name.startswith("Tabăra ")]   # doar cele încă nenumite
if new:
    taken = [c.name for c in result.camps if c not in new]
    try:
        named = {c.id: c for c in name_camps(new, taken)}          # 1 apel Gemini
        result = result.model_copy(update={"camps": [named.get(c.id, c) for c in result.camps]})
    except AgentError:
        pass   # rămân „Tabăra N"; se reîncearcă la următorul recompute
```

- **ID-urile, membrii și ordinea rămân neschimbate** – se schimbă doar `name` și `description`.
- `stabilize()` deja păstrează numele unei tabere care supraviețuiește → numele dat de AI
  rămâne la voturile următoare, deci **apelul se face doar când apare o tabără nouă**.
- Rulează-l în fundal (`asyncio.to_thread`), ca la ceilalți agenți. Durează ~1–2 s.

**Test live**, din `backend/`: `uv run python -m app.agents.demo_naming`
(pe cele 3 tabere făcute de mână din seed; `agents/` nu are voie să importe `clustering/`).

**Fișiere:** `naming_agent.py`, `prompts/naming.md`, `demo_naming.py`, `../../tests/test_naming.py`.
