# CityMind – unde suntem și ce mai trebuie (pentru toată echipa)

Scris de Vladut (C) după checkpoint-ul din 14 noiembrie. Citiți-l pe tot, durează 5 minute.
Regulile de lucru rămân cele din [RULES.md](RULES.md) și [PLAN.md](PLAN.md).

---

## 1. Ce merge acum ✅

Totul e în `dev` **și** în `main` (PR #27, #28). Nu e niciun PR deschis.

Testat cap-coadă pe un Mac Intel, cu Gemini real:

```
răspuns pe telefon
  → intake (gemini-3.5-flash-lite) transformă răspunsul în afirmații, ~20 s
  → oamenii votează afirmațiile
  → clustering real (Eidrien): 3 tabere pe hartă
  → organizatorul apasă „Generează propunerea”
  → mediate + critic (Bordos), ~15 s: fidelă ✓ echilibrată ✓ fezabilă ✓
  → cetățenii votează compromisul pe ecranul 4
  → sprijinul se actualizează live pe ecranul mare, fără reload
```

| Verificare | Rezultat |
|---|---|
| Teste backend | **83/83** |
| Frontend | lint + typecheck + build OK |
| Intel Mac | `uv sync` merge (fix-urile lui Rares, PR #12) |

**Ia ultima versiune** (fiecare pe branch-ul lui):

```sh
git checkout <numele-tau>        # rares / bordos / eidrien / vladut
git pull origin dev
cd backend && uv sync && uv run pytest     # → 83 passed
```

---

## 2. Gemini: NU facem billing 💸

Decizia echipei: rămânem pe planul **gratuit**, cu modelele **flash-lite**.

- Fiecare model are **cota lui pe zi**, care se resetează zilnic.
- `intake` și `critic` merg deja pe `gemini-3.5-flash-lite`. La eroarea **429** (cotă epuizată) trec automat pe `gemini-3.1-flash-lite` (PR #22).
- `mediate` e singurul încă pe `gemini-3.5-flash`. Bordos îl mută pe flash-lite (vezi secțiunea 4).
- **Calcul:** 1 răspuns = 1 apel AI, 1 rundă de compromis = 2 apeluri. 30 de oameni + 2 runde ≈ **34 de apeluri pe zi**.
- **Răspunsurile nu se pierd** când se termină cota: stau în coadă și se reîncearcă singure, iar organizatorul are buton de „Reîncearcă” (PR #26).
- **Nu folosim chei de pe mai multe conturi** ca să ocolim limita: încalcă regulile Google și riscăm să ne blocheze cheia exact la demo.

**Cum economisim cota:**
1. Testul de sâmbătă și demo-ul de duminică sunt în **zile diferite**, deci cota se resetează între ele.
2. La demo **pornim cu datele de seed** ale lui Eidrien (50 de afirmații, 737 de voturi, încărcate **fără** Gemini). Harta e plină din prima secundă, iar AI-ul lucrează doar pentru răspunsurile live și 1–2 runde.
3. Fără apeluri Gemini inutile duminică dimineață. Testele automate (`pytest`) folosesc un Gemini fals, deci nu consumă cota.

---

## 3. Calendar ⏰

| Când | Ce |
|---|---|
| **Sâmbătă seara** | Test cu 20–30 de oameni de la UniHack. Avem nevoie **obligatoriu** de: **deploy** + **demo loader cu seed** |
| **Duminică 11:00** | Feature freeze, doar bug-uri după ora asta |
| **Duminică 11–13** | Pitch |
| **Duminică 13:00** | Stop code |

Ordinea în care tăiem dacă nu ajungem (PLAN.md): Proxy + auditor → raport PDF. Nucleul (răspuns → hartă live → compromis votat) **nu se taie**.

---

## 4. Ce are de făcut fiecare

### 🔧 Rares – backend + infra (în ordinea priorității)

1. **Deploy pe Vultr cu HTTPS + domeniu.**
   - Fără HTTPS, microfonul nu merge pe telefoane.
   - QR-ul trebuie să ducă la un link public.
   - Trimite-i lui Vladut: URL frontend, URL API (`https://…`) și WebSocket (`wss://…/ws`), ca să seteze `NEXT_PUBLIC_API_URL` și `NEXT_PUBLIC_WS_URL`.
   - De decis: frontend-ul rulează pe același server sau separat?
2. **Demo loader + reset DB.**
   - Încarcă `seed/statements.json` + `seed/votes.json` (de la Eidrien) **fără Gemini**.
   - Șterge datele de test (în DB-ul local al lui Vladut sunt ~25 de participanți `e2e-*`).
   - Spune-ne comanda exactă.
3. **`ORGANIZER_TOKEN`** pe server → îl trimiți lui Vladut **în privat**.
4. **Snapshot de nume în propunere.** În `proposal.tradeoffs[]` adaugă și `camp_name` (numele taberei la momentul rundei). Dacă o tabără se împarte, ecranul 4 arată acum „Tabără” în loc de nume. Detalii în [seed/HANDOFF_PITCH.md](seed/HANDOFF_PITCH.md).
5. **Endpoint-uri care în frontend sunt încă mock:**
   - `GET` / `POST` consultare (`question`, `context`, `threshold`). Acum întrebarea e hardcodată în frontend.
   - `GET` coadă de moderare + `POST` aprobă/respinge (afirmațiile cu `flag` de la intake).
   - `GET /kpis`: voturi, afirmații, câte au flag, apeluri AI / latență (cifre pentru pitch).
6. **Bug raportat de Eidrien** (HANDOFF_PITCH.md): după timeout la așteptarea primei hărți, statusul rundei e o eroare goală.
7. **Rate limiting + lista de securitate**: CORS restrâns la domeniul final.

### 🤖 Bordos – agenți AI

1. **Totul pe flash-lite:**
   - Pe server: `GEMINI_MEDIATE_MODEL=gemini-3.5-flash-lite` (override-ul există deja, nu trebuie cod nou).
   - Testează o rundă pe seed: e propunerea încă bună cu flash-lite?
   - Verifică limita reală pe zi pentru `3.5-flash-lite` și `3.1-flash-lite` la https://ai.dev/rate-limit (logat cu contul cheii) și spune-ne cifrele.
2. **Nume reale de tabere.** Acum sunt „Tabăra 1/2/3” + „Participanți cu poziții similare”.
   - Un agent mic care numește tabăra din afirmațiile membrilor (ex. „Liniște pentru locuitori”).
   - Apelat **doar când apare o tabără nouă**, ca să nu consume cota.
   - ID-urile rămân ale lui Rares, tu dai doar `name` / `description`.
   - Contează mult la demo.
3. **Întrebarea consultării trimisă la intake** (plănuit).
4. **Dedup.** Dacă același răspuns vine de 2 ori, ies afirmații aproape identice și se consumă cota de 2 ori. Frontend-ul blochează deja dublu-tap-ul, dar trebuie și pe server.
5. *Stretch, doar dacă e timp și cotă:* **Proxy** (vocea grupurilor absente), mereu marcat „simulat” și **niciodată** numărat în procente.
6. **Pentru pitch:** latența medie intake / mediate / critic. Costul: 0 lei pe free tier, spus ca atare.

### 📊 Eidrien – data

1. **Puncte comune.** În testul real (3 tabere, una mică) au ieșit 0 bridges. Verifică pragul de 70% când o tabără are 3–5 oameni, ca la demo să apară puncte comune reale, nu doar pe seed.
2. **Stabilitatea hărții.** În raportul tău, worst ARI = 0.5: taberele pot sări la un vot nou, iar pe ecranul mare pare că harta „sare”. Se poate porni UMAP din pozițiile anterioare?
3. **Demo loader, cu Rares**, din `seed/votes.json` (ID-urile tale stabile). E esențial: fără billing, seed-ul ne salvează cota Gemini.
4. **Cifrele pentru pitch** din [seed/PITCH_NUMBERS.md](seed/PITCH_NUMBERS.md) → textul final pentru slide (silhouette, latență).
5. **Descrierile taberelor, cu Bordos** (acum sunt generice).
6. *Stretch:* auditul de reprezentare (cine lipsește din consultare).

### 🎨 Vladut – frontend (ca să știți)

1. **Culori stabile pe ID de tabără** (acum depind de ordinea taberelor, nota lui Eidrien).
2. **Pagina de organizator:** răspunsuri în așteptare/eșuate + buton „Reîncearcă” (`/responses/stats` și `/responses/retry`, din PR #26). Util exact când se termină cota.
3. **Conectez consultare / moderare / KPI** imediat ce Rares are endpoint-urile.
4. **Styling final + configurarea pentru deploy.**

---

## 5. Cele 3 lucruri care deblochează cel mai mult

1. **Deploy cu HTTPS** (Rares): fără el nu avem test sâmbătă, nici microfon pe telefon, nici link pentru juriu.
2. **Demo loader cu seed** (Rares + Eidrien): fără billing, e singurul mod de a avea o hartă plină fără să ardem cota.
3. **Totul pe flash-lite + nume reale de tabere** (Bordos): ca demo-ul să nu se oprească la cotă și să arate ca un produs, nu ca un test.

---

## 6. Reguli scurte

- 🔑 **Cheia Gemini și `ORGANIZER_TOKEN` doar în privat.** Niciodată pe grup sau în git (repo-ul e public).
- ❗ **Conflict la `git pull`?** Nu forțați nimic, scrieți pe grup.
- 🔀 Fiecare lucrează doar pe branch-ul lui → PR în `dev`. Vladut face `dev → main` la checkpoint-uri.
- 🔁 După ce 3 încercări la aceeași eroare eșuează: stop, scrieți pe grup ce ați încercat și eroarea exactă.
