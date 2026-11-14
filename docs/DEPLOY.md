# Deploy: Vercel + Azure (for Students) + Supabase

```
phone ─► https://citymind-iota.vercel.app                 Vercel: the website (frontend/)
            │ fetch + WebSocket
            ▼
         https://citymind-api-dkab4.azurewebsites.net    Azure App Service B1 (Italy North): the API
            │                                             ─► Gemini (Google)
            ▼
         Supabase Postgres (eu-west-1)                   the data + Table Editor
```

- **Azure for Students** (Rares, UPT account): $100 credit, no card. B1 (~$13/month) + Container
  Registry Basic (~$5/month) in resource group `citymind-rg`. When the credit runs out, Azure
  stops the services instead of charging.
- The API is our Docker image (`deploy/huggingface/Dockerfile`, which clones `main`), always on, with
  WebSockets on. Its secrets (`DATABASE_URL`, `GEMINI_API_KEY`, `ORGANIZER_TOKEN`, `CORS_ORIGINS`)
  are Azure **app settings**, never in git.
- The university only allows these regions: denmarkeast, germanywestcentral, swedencentral,
  italynorth, austriaeast. B1 had quota only in **italynorth**.
- Hugging Face is out (Docker Spaces need PRO); 512 MB free tiers are too small (API ~430 MB idle).
- Fallback if Azure is down: the API on Rares's laptop behind a Cloudflare tunnel (section 6).

**Never paste passwords or keys into chats, git or the group.** Private config lives in
`~/.config/citymind/` on Rares's laptop (outside the repo, readable only by its owner).

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

## 2. The API on Azure (Rares)

Already set up: `az login --use-device-code`, the registry (`~/.config/citymind/azure_acr`), the
app (`~/.config/citymind/azure_app`), the app settings, AcrPull through a managed identity
(no registry password), WebSockets + Always On.

**Deploy new backend code** (after `dev → main`), from the repo root, with Docker running:

```sh
deploy/azure-deploy.sh
```

It builds the image **locally**, because Azure for Students blocks cloud builds ("ACR Tasks not
permitted"). It skips Docker's cache so the GitHub clone is fresh, pushes the image, and restarts.
**A restart takes ~5 minutes** before the new version answers.

Change a secret: `az webapp config appsettings set -g citymind-rg -n <app> -o none --settings NAME=value`
(this restarts the app). Logs: `az webapp log tail -g citymind-rg -n <app>`.

## 3. Demo data into Supabase (Rares, ~1 min)

From your laptop, without Gemini, with the Supabase URL from step 1.4:

```sh
cd ~/unihack2026/backend
DATABASE_URL='postgresql+psycopg://…' uv run python -m app.api.demo load
```

Then **restart the API** (`az webapp restart -g citymind-rg -n <app>`, ~5 min), because it keeps
the live map in memory. The map should show 2 camps (35/15) and 4 bridges. In Supabase → **Table Editor**
you'll see `responses`, `statements`, `votes`.

## 4. Vercel: the website (Rares's laptop, ~3 min)

Live: **https://citymind-iota.vercel.app** (project `rares-projects3/citymind`).
It's deployed **from Rares's laptop with the Vercel CLI**, not linked to GitHub, so it only
changes when someone runs the deploy. That's safer before a pitch.

One-time (already done): `npx vercel login`, then in `frontend/`:
`npx vercel link --yes --project citymind`. The project has `ENABLE_EXPERIMENTAL_COREPACK=1`,
so Vercel uses the pnpm version from `package.json`.

1. The API addresses are set on the Vercel project (`NEXT_PUBLIC_API_URL` = the Azure URL,
   `NEXT_PUBLIC_WS_URL` = `wss://…/ws`). To change one, it must be removed first:
   `npx vercel env rm NAME production --confirm-name NAME`, then `echo -n value | npx vercel env add NAME production`.
2. Deploy, from the repo root:
   ```sh
   deploy/vercel-deploy.sh
   ```
   It deploys the **committed** `frontend/` of the current checkout from a clean copy, so
   `frontend/.env.local` (localhost URLs) never reaches Vercel, and **without build cache**:
   `NEXT_PUBLIC_*` values are baked into the build, and a cached build kept serving an old API
   address. Check out `main` first.

`NEXT_PUBLIC_*` values are baked in at build time: after changing them, deploy again.
Want auto-deploy on every push instead? Vladut can import the repo in his own Vercel account
(Root Directory `frontend`, the same env vars).

## 5. Test from a phone (everyone)

CORS on Azure is locked to `https://citymind-iota.vercel.app`.

1. On a **phone on mobile data**: open https://citymind-iota.vercel.app → answer with the
   **microphone** → vote → watch `/board` update live on another screen.
2. QR code: the organizer page generates it from the Vercel address.

## 6. Fallback: the API on the laptop (only if Azure is down)

Two APIs on one database would both process new answers, so stop Azure first:
`az webapp stop -g citymind-rg -n <app>`, then `deploy/laptop-server.sh --fallback`. It starts the
API + a Cloudflare quick tunnel and points Vercel at the tunnel. Back to Azure: stop the laptop
API, `az webapp start …`, set the Vercel env vars back to the Azure URL, `deploy/vercel-deploy.sh`.

## Updating

1. Vladut merges `dev → main`. Rares: `git checkout main && git pull`.
2. Backend changes: `deploy/azure-deploy.sh` (~5 min until live).
3. Frontend changes: `deploy/vercel-deploy.sh`.

## Pitch-day checklist

- [ ] `main` has everything (feature freeze at 11:00); both deploys done from `main`.
- [ ] Clean data (in `backend/`, `DATABASE_URL="$(cat ~/.config/citymind/supabase_url)"`):
      `uv run python -m app.api.demo reset --yes`, then `… demo load`, then
      `az webapp restart -g citymind-rg -n <app>`, and wait ~5 min.
- [ ] `https://<app>.azurewebsites.net/health/db` → ok; the board shows 2 camps.
- [ ] Phone test: answer → vote → board updates.
