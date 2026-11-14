# Deploy: Vercel + laptop API (Cloudflare Tunnel) + Supabase (all free)

```
phone ─► https://citymind-iota.vercel.app      Vercel: the Next.js website (frontend/)
            │ fetch + WebSocket
            ▼
         https://<random>.trycloudflare.com    Cloudflare quick tunnel (free, no account)
            ▼
         API on Rares's laptop                 FastAPI + live worker (backend/)
            │                                   ─► Gemini (Google)
            ▼
         Supabase Postgres                     the data + Table Editor
```

**Why the API runs on a laptop:** Hugging Face Docker Spaces now need a paid PRO plan,
and our API uses ~430 MB of RAM idle (UMAP/numba), too close to the 512 MB free tiers.
`deploy/huggingface/` still works on any Docker host if the team pays for one.

**The laptop is the server:** during the test and the pitch, keep it plugged in, awake
(no sleep), and on stable internet (a phone hotspot is safer than venue Wi-Fi).

**Never paste passwords or keys into chats, git or the group.** Private config lives in
`~/.config/citymind/` on the laptop (outside the repo, readable only by its owner).

---

## 1. Supabase: the database (Rares, ~5 min)

1. https://supabase.com → **Sign in with GitHub** → **New project**.
2. Name `citymind`, region **Central EU (Frankfurt)**, set a **database password**.
   Use letters + digits only, because special characters must be URL-encoded in the
   connection string. Save the password in your password manager.
3. Once the project is ready: **Connect** (top of the page) → **Session pooler**. Copy the URI:
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
   - Use the **Session pooler**, not the "Direct connection": the direct one is IPv6-only
     on the free plan, and many networks can't reach it.
4. Turn it into our format: change `postgresql://` to **`postgresql+psycopg://`**, and put
   your password in place of `[YOUR-PASSWORD]`. That's the `DATABASE_URL` for step 2.

You don't create tables: the API creates them on its first start, with Row Level Security
turned on, so Supabase's public REST API can't read citizens' answers.

## 2. The API on the laptop + tunnel (Rares, one command)

One-time (done): `cloudflared` in `~/.local/bin`, `npx vercel login`, and in `~/.config/citymind/`:
`supabase_url` (step 1.4) and `organizer_token` (random; sent to Vladut privately).

From the repo root, **after every reboot** (and whenever in doubt):

```sh
deploy/laptop-server.sh
```

- It starts the API (on Supabase, CORS locked to the Vercel site, organizer token set)
  and the tunnel, but only the parts that aren't running.
- If the tunnel got a **new random address**, it updates the Vercel env vars and
  redeploys the website by itself (~2 min). The Vercel link and the QR code never change.
- Logs: `~/.config/citymind/api.log`, `~/.config/citymind/tunnel.log`.

## 3. Demo data into Supabase (Rares, ~1 min)

From your laptop, without Gemini, with the Supabase URL from step 1.4:

```sh
cd ~/unihack2026/backend
DATABASE_URL='postgresql+psycopg://…' uv run python -m app.api.demo load
```

Then **restart the API** (stop it, then `deploy/laptop-server.sh`), because it keeps the live
map in memory. The map should show 2 camps (35/15) and 4 bridges. In Supabase → **Table Editor**
you'll see `responses`, `statements`, `votes`.

## 4. Vercel: the website (Rares's laptop, ~3 min)

Live: **https://citymind-iota.vercel.app** (project `rares-projects3/citymind`).
It's deployed **from Rares's laptop with the Vercel CLI**, not linked to GitHub, so it only
changes when someone runs the deploy. That's safer before a pitch.

One-time (already done): `npx vercel login`, then in `frontend/`:
`npx vercel link --yes --project citymind`. The project has `ENABLE_EXPERIMENTAL_COREPACK=1`,
so Vercel uses the pnpm version from `package.json`.

1. The API addresses (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`) are set on the Vercel project
   by `deploy/laptop-server.sh` whenever the tunnel address changes. Nothing to do by hand.
2. Deploy, from the repo root:
   ```sh
   deploy/vercel-deploy.sh
   ```
   It deploys the **committed** `frontend/` of the current checkout from a clean copy, so
   `frontend/.env.local` (localhost URLs) never reaches Vercel. Check out `main` first.

`NEXT_PUBLIC_*` values are baked in at build time: after changing them, deploy again.
Want auto-deploy on every push instead? Vladut can import the repo in his own Vercel account
(Root Directory `frontend`, the same env vars).

## 5. Test from a phone (everyone)

CORS is already locked to `https://citymind-iota.vercel.app` by `deploy/laptop-server.sh`.

1. On a **phone on mobile data** (not the laptop's Wi-Fi): open https://citymind-iota.vercel.app
   → answer with the **microphone** → vote → watch `/board` update live on another screen.
2. QR code: the organizer page generates it from the Vercel address.

## Updating

1. Vladut merges `dev → main`. Rares: `git checkout main && git pull`.
2. Restart the API: stop it, then `deploy/laptop-server.sh` (backend changes).
3. `deploy/vercel-deploy.sh` (frontend changes).

## Pitch-day checklist

- [ ] Laptop plugged in, sleep **off**, stable internet (hotspot).
- [ ] `main` checked out and pulled (feature freeze at 11:00).
- [ ] Clean data (in `backend/`, with `DATABASE_URL="$(cat ~/.config/citymind/supabase_url)"`):
      `uv run python -m app.api.demo reset --yes`, then `… demo load`, then restart the API.
- [ ] `deploy/laptop-server.sh` → `ready`; the board shows 2 camps.
- [ ] Phone test: answer → vote → board updates.
