# Deploying

Backend on **Render**, frontend on **Vercel**. Both have free tiers that fit this app.

Deploy the backend first — the frontend needs its URL.

> **Read this before you start.** The deployed app calls a paid model using *your* API
> key, and anyone who has the URL can use it. See [Protecting your
> key](#protecting-your-key) at the bottom. Don't post the URL publicly unless you're
> comfortable paying for whoever finds it.

---

## 1. Backend → Render

1. Go to <https://dashboard.render.com> and sign in with GitHub.
2. **New → Web Service**, pick the `ai-interview-coach` repo.
3. Render reads [`render.yaml`](render.yaml), so most settings fill themselves in. Confirm:
   - **Root Directory** `backend`
   - **Build Command** `pip install -r requirements.txt`
   - **Start Command** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment**, add the two secrets marked `sync: false`:

   | Key                  | Value                                                        |
   | -------------------- | ------------------------------------------------------------ |
   | `OPENROUTER_API_KEY` | your key from <https://openrouter.ai/keys>                     |
   | `ALLOWED_ORIGINS`    | leave blank for now — you'll set it in step 3                  |

5. **Create Web Service** and wait for the first build.
6. Confirm it's alive: open `https://<your-service>.onrender.com/api/health`. You want

   ```json
   { "status": "ok", "provider": "OpenRouter", "model": "...", "api_key_configured": true }
   ```

   If `api_key_configured` is `false`, the env var didn't save — fix it and redeploy.

Copy the service URL. You need it next.

## 2. Frontend → Vercel

1. Go to <https://vercel.com/new> and import the same repo.
2. Set **Root Directory** to `frontend`. This matters — the repo root isn't a Next.js app,
   and the build fails without it. Framework preset should auto-detect as Next.js.
3. Add one environment variable:

   | Key                   | Value                                       |
   | --------------------- | ------------------------------------------- |
   | `NEXT_PUBLIC_API_URL` | `https://<your-service>.onrender.com`        |

   No trailing slash. This is baked in at build time, so changing it later means
   redeploying, not just restarting.
4. **Deploy.**

## 3. Point the backend back at the frontend

CORS is why this step exists: the browser will refuse to call your API until the API
names your frontend as an allowed origin.

1. Back in Render → your service → **Environment**.
2. Set `ALLOWED_ORIGINS` to your Vercel URL, e.g. `https://ai-interview-coach.vercel.app`
   (no trailing slash; comma-separate if you have several).
3. Save. Render redeploys automatically.

`ALLOWED_ORIGIN_REGEX` is already set to `^https://.*\.vercel\.app$` so preview
deployments work too. Tighten or drop it if you'd rather only the production URL worked.

## 4. Check it

Open your Vercel URL and run a full interview: start → a few answers → report.

If the first request hangs for ~50 seconds, that's Render's free tier waking from sleep —
see below.

---

## Things that will bite you

**Render free tier sleeps after ~15 minutes idle.** The first request after that takes
roughly 50 seconds while the container boots, and the frontend will likely show
*"Can't reach the server"* because the request times out. A second attempt works. Fixes:
upgrade to a paid instance, or ping `/api/health` on a schedule to keep it warm.

**"Can't reach the server" that never resolves** — usually CORS. Open your browser's
devtools console; a CORS failure says so explicitly. Check `ALLOWED_ORIGINS` exactly
matches your frontend origin, scheme included, no trailing slash.

**Frontend builds but every call 404s** — `NEXT_PUBLIC_API_URL` is wrong or wasn't set at
build time. Re-check it and redeploy.

**Vercel build fails immediately** — Root Directory isn't set to `frontend`.

---

## Protecting your key

The backend has a built-in per-IP rate limit (`RATE_LIMIT` requests per
`RATE_LIMIT_WINDOW_SECONDS`, default 30 per 5 minutes) on the endpoints that call the
model. It is a floor, not a wall:

- It's in-process memory, so it resets on redeploy and counts per instance.
- It keys on IP, which anyone determined can rotate.

If the URL is going anywhere public, also:

1. **Set a spend limit on the provider.** OpenRouter lets you cap credits per key —
   do this first, it's the only hard guarantee.
2. **Use a dedicated key** for the deployment so you can revoke it without touching local
   development.
3. Consider putting real auth in front if this becomes more than a demo.
