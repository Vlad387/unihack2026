# Agenți AI – Bordos (rol A)

Ce s-a făcut în `backend/app/agents/`, pe scurt, pentru toată echipa.

| Agent | Ce face | Stare |
|---|---|---|
| `intake` | împarte și filtrează răspunsurile cetățenilor | ✅ gata, în `dev` (PR #9) |
| `mediate` | scrie compromisul între tabere | ✅ gata (vezi secțiunea 8) |
| `critic` | verifică dacă compromisul e corect și echilibrat | ⏳ încă stub (date false) |
| `proxy` | simulează vocea unui grup care lipsește (opțional) | ❌ neînceput |

Secțiunile 1–7 sunt despre `intake`; secțiunea 8 e despre `mediate`.

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

- **Python 3.12** + **Gemini Flash** (`gemini-3.5-flash`) prin SDK-ul `google-genai`.
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
| `__init__.py` | exportă `intake`, `mediate`, `critic`, `AgentError` (mediate/critic încă stub) |
| `intake_agent.py` | agentul intake |
| `gemini.py` | partea comună pentru toți agenții: client Gemini, retry, modele, `AgentError` |
| `prompts/intake.md` | instrucțiunile pentru Gemini |
| `demo_intake.py` | script de test live pe răspunsurile din `seed/` |
| `../../tests/test_intake.py` | teste intake (fără internet) |
| `../../tests/conftest.py` | înlocuiește Gemini cu un fals în **toate** testele |

Modulul se numește `intake_agent.py` (nu `intake.py`) ca să nu se bată cap în cap
cu funcția `intake` exportată din `__init__.py`. La fel vor fi `mediate_agent.py`, `critic_agent.py`.

---

## 5. Modele Gemini – IMPORTANT pentru toți

- **Cheia API e bună.** Problema e doar numele modelului.
- `gemini-2.5-flash` (cel din RULES.md) și `gemini-2.5-pro` **nu mai merg pentru chei noi** (404).
- Folosiți **`gemini-3.5-flash`**.
- Niciun model **Pro** nu merge pe cheia noastră → și `mediate` va folosi Flash.
- Se pot schimba fără cod, din `.env`: `GEMINI_FLASH_MODEL=...`, `GEMINI_PRO_MODEL=...`.
- Modelele de **embeddings** (pentru clustering) nu au fost testate.

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

## 8. `mediate` – compromisul

**Ce face:** primește taberele (de la clustering), punctele comune (`bridges`),
criticile cetățenilor la propunerea anterioară și vocile simulate (proxy), și scrie
**o propunere de compromis** + pentru **fiecare tabără** ce **câștigă** și la ce **cedează**.
Frontend-ul afișează asta pe ecranul 4 („Câștigă:" / „Cedează:").

```python
from app.agents import mediate, AgentError

proposal = mediate(camps, bridges, critiques, proxies)  # -> Proposal
# proposal.text, proposal.tradeoffs (exact câte unul per tabără, în ordinea taberelor)
```

**Reguli importante (pentru Rares):**
- Argumentele unei tabere = afirmațiile **scrise** de membrii ei (`author_id in member_ids`),
  fără cele cu `flag`, maxim 20 per tabără.
- `critiques` = textele criticilor din runda trecută (gol în runda 1). Runda 2 le ia în calcul.
- `proxies` sunt trimise ca **voci simulate**: Gemini le folosește doar ca să nu uite
  un grup; nu primesc tabără și nu contează ca voturi.
- `proposal.round` e mereu 1 → **API-ul îl suprascrie** cu runda reală.
- `AgentError` dacă: nu există nicio tabără, Gemini pică, sau Gemini uită o tabără.
  Atunci reîncearcă mai târziu.
- Durează **25–60 s** (gândire „high", sarcina e grea) → doar în fundal.
- Model: `GEMINI_PRO_MODEL`, care momentan = `gemini-3.5-flash` (Pro nu merge pe cheia noastră).

**Fișiere:** `mediate_agent.py`, `prompts/mediate.md`, `demo_mediate.py`, `tests/test_mediate.py`.

**Test live** (3 tabere făcute de mână din seed, până e gata `cluster()` real):

```bash
uv run python -m app.agents.demo_mediate      # runda 1
uv run python -m app.agents.demo_mediate 2    # runda 2, cu critici
```

Rezultat runda 1 (prescurtat): muzica pe terase până la 23, terase până la 24 în weekend,
interior până la 02 cu controale de zgomot, autobuze și patrule de noapte, curățenie dimineața.
În runda 2, după critici („02 e prea târziu", „cine plătește?", „localurile mici ≠ cluburi"),
a coborât interiorul la 01, a spus că plătesc taxele de autorizare și a separat restaurantele de cluburi.

**Probleme cunoscute:** uneori în „cedează" adaugă un detaliu care nu e în textul propunerii
(ex. „autobuzele doar pe arterele principale"). Asta e treaba `critic`-ului să prindă.
