# Deploy: Vercel + Hugging Face + Supabase (all free)

```
phone ─► https://<site>.vercel.app          Vercel: the Next.js website (frontend/)
            │ fetch + WebSocket
            ▼
         https://<user>-<space>.hf.space    Hugging Face Space: the FastAPI backend (Docker)
            │                               ─► Gemini (Google)
            ▼
         Supabase Postgres (Frankfurt)      the data + Table Editor
```

Both Vercel and the HF Space deploy the **`main`** branch, so the live site only changes
when Vladut merges `dev → main` at a checkpoint (RULES.md). Free tiers change: if a screen
looks different from this guide, follow the site's own wording.

**Never paste passwords or keys into chats, git or the group.** Only into the dashboards below.

---

## 1. Supabase: the database (Rares, ~5 min)

1. https://supabase.com → **Sign in with GitHub** → **New project**.
2. Name `citymind`, region **Central EU (Frankfurt)**, set a **database password**.
   Use letters + digits only, because special characters must be URL-encoded in the
   connection string. Save the password in your password manager.
3. Once the project is ready: **Connect** (top of the page) → **Session pooler**. Copy the URI:
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
   - Use the **Session pooler**, not the "Direct connection": the direct one is IPv6-only
     on the free plan, and Hugging Face may not reach it.
4. Turn it into our format: change `postgresql://` to **`postgresql+psycopg://`**, and put
   your password in place of `[YOUR-PASSWORD]`. That's the `DATABASE_URL` for step 2.

You don't create tables: the API creates them on its first start, with Row Level Security
turned on, so Supabase's public REST API can't read citizens' answers.

## 2. Hugging Face Space: the API (Rares, ~10 min + ~5 min build)

1. https://huggingface.co → sign up → **New** → **Space**.
   - Name `citymind`, **SDK: Docker** (Blank), **Hardware: CPU basic (free)**.
   - **Public.** A private Space needs a login, so the website couldn't call it.
     The code is public on GitHub anyway; the secrets stay hidden.
2. In the Space: **Files** → **Add file** → **Create a new file**. Create two files,
   copying them exactly from this repo:
   - `Dockerfile` ← `deploy/huggingface/Dockerfile`
   - `README.md` ← `deploy/huggingface/README.md` (replace the generated one)
3. **Settings** → **Variables and secrets** → **New secret**, one at a time:

   | Secret | Value |
   |---|---|
   | `DATABASE_URL` | from step 1.4 |
   | `GEMINI_API_KEY` | the team key |
   | `ORGANIZER_TOKEN` | a random password. Make one with `python3 -c "import secrets; print(secrets.token_urlsafe(24))"`, and send it to Vladut privately |
   | `CORS_ORIGINS` | leave it out for now; set it in step 5 |

4. The Space builds (~5 min) and starts (~1–2 min for the clustering warm-up).
   Your API address is **`https://<your-hf-username>-citymind.hf.space`**.
   Check `…/health` → `{"status":"ok"}` and `…/health/db` → `{"db":"ok"}`.

## 3. Demo data into Supabase (Rares, ~1 min)

From your laptop, without Gemini, with the Supabase URL from step 1.4:

```sh
cd ~/unihack2026/backend
DATABASE_URL='postgresql+psycopg://…' uv run python -m app.api.demo load
```

Then **restart the Space** (Settings → **Restart Space**), because it keeps the live map in
memory. The map should show 2 camps (35/15) and 4 bridges. In Supabase → **Table Editor**
you'll see `responses`, `statements`, `votes`.

## 4. Vercel: the website (Vladut, ~5 min)

The GitHub repo belongs to Vladut, so Vercel has to be connected from his account.

1. https://vercel.com → **Sign in with GitHub** → **Add New… → Project** → import
   `Vlad387/unihack2026`.
2. **Root Directory: `frontend`**. Framework: Next.js (detected).
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<hf-username>-citymind.hf.space` |
   | `NEXT_PUBLIC_WS_URL` | `wss://<hf-username>-citymind.hf.space/ws` |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (so Vercel uses the pnpm version in `package.json`) |

4. **Deploy.** Settings → Git: make sure the **Production Branch is `main`**.
   `NEXT_PUBLIC_*` values are baked in at build time: after changing them, **Redeploy**.

## 5. Lock it down + test (Rares)

1. HF Space → secret **`CORS_ORIGINS`** = the Vercel address, e.g. `https://citymind.vercel.app`
   (several addresses: comma-separated, no spaces) → Restart Space.
2. On a **phone** (mobile data, not the laptop): open the Vercel site → answer with the
   **microphone** → vote → watch `/board` update live.
3. QR code: the organizer page generates it from the Vercel address.

## Updating

1. Vladut merges `dev → main`.
2. Vercel redeploys by itself.
3. HF Space → Settings → **Factory rebuild** (it re-downloads `main`).

## Pitch-day checklist

- [ ] `main` has everything (feature freeze at 11:00).
- [ ] Clean data: `DATABASE_URL='…' uv run python -m app.api.demo reset --yes`, then
      `… demo load`, then **Restart Space**.
- [ ] `…hf.space/health/db` → ok, the board shows 2 camps.
- [ ] Open the Space URL ~5 min before the pitch: a Space that slept takes 1–2 min to wake up.
- [ ] Phone test: answer → vote → board updates.
