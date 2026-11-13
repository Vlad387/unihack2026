# Agenți AI – Bordos (rol A)

Ce s-a făcut în `backend/app/agents/`, pe scurt, pentru toată echipa.

| Agent | Ce face | Stare |
|---|---|---|
| `intake` | împarte și filtrează răspunsurile cetățenilor | ✅ gata, în `dev` (PR #9) |
| `mediate` | scrie compromisul între tabere | ⏳ încă stub (date false) |
| `critic` | verifică dacă compromisul e corect și echilibrat | ⏳ încă stub (date false) |
| `proxy` | simulează vocea unui grup care lipsește (opțional) | ❌ neînceput |

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
    statements = intake(text="...", audio=None)   # sau audio=bytes, sau ambele
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
