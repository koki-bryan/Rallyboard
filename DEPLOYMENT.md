# Deploy Rallyboard on Vercel and Render

This setup uses Vercel Hobby for the static frontend and a Render Free web service plus Render Free Postgres for the API. The browser calls `/api` on the Vercel domain; Vercel forwards those requests to Render. This keeps sign-in cookies on the frontend domain.

## Before deploying

Push this repository to GitHub or GitLab. Do not commit `backend/.env` or any database password. The local PostgreSQL password is unrelated to the hosted database; Render creates a new password and connects the API through `DATABASE_URL`.

The hosted database starts empty. This guide creates a new admin account; it does not copy your local events or scores.

## 1. Create the Vercel project

1. Import the repository into Vercel and select the **Hobby** plan. Set the **Root Directory** to `frontend`.
2. The included `frontend/vercel.json` runs `npm run build`, publishes `build/client`, and rewrites `/api/*` to `https://rallyboard-api.onrender.com/api/*`. Leave `VITE_API_URL` unset so the production build calls the same-origin `/api/v1` path.
3. Deploy and copy the production URL, such as `https://your-project.vercel.app`. The API will not respond until Render is running.

If your Render service's actual URL differs from `https://rallyboard-api.onrender.com`, replace that hostname in `frontend/vercel.json` and redeploy Vercel. Keep the `/api/:path*` portion intact. The API rewrite must remain before the SPA fallback rewrite.

## 2. Create Render services

1. In Render, create a **Blueprint** from the same repository. It reads `render.yaml` at the repository root and creates a Free Python web service and a Free PostgreSQL database.
2. Enter these environment values when prompted:

   | Variable | Value |
   | --- | --- |
   | `FRONTEND_ORIGIN` | The exact production Vercel origin, for example `https://your-project.vercel.app` (no trailing slash). |
   | `BOOTSTRAP_ADMIN_NAME` | Name of the first coach/admin. |
   | `BOOTSTRAP_ADMIN_EMAIL` | Email for the first admin account. |
   | `BOOTSTRAP_ADMIN_PASSWORD` | A unique account password with at least 8 characters. |

   The Blueprint supplies `DATABASE_URL` from Render Postgres and sets `COOKIE_SECURE=true`. Do not put any of these secrets in `render.yaml`.
3. Deploy. Render installs the locked Python dependencies and starts `uvicorn` on its assigned port. The API creates its tables and first admin on startup. Open `https://rallyboard-api.onrender.com/docs` to confirm it is live. If your service URL differs, update the Vercel rewrite as described above.
4. After the first admin is created, remove `BOOTSTRAP_ADMIN_PASSWORD` from the Render service's Environment settings. It is only needed for the initial bootstrap. Sign in from the Vercel site with the admin email and password you chose.

## 3. Check the complete flow

1. Open the Vercel site and sign in as the admin. Refresh the page; you should still be signed in.
2. Create an event, add players, and generate its schedule.
3. Create a second account. Open the event and enter its event password. Verify that scores and standings become visible.

If sign-in fails, check that `FRONTEND_ORIGIN` matches the Vercel production URL exactly, `COOKIE_SECURE` is `true`, and `frontend/vercel.json` points to the live Render API. Vercel preview domains are different origins; this setup authorizes the production URL only.

## Free-plan limits

Render Free web services spin down after 15 minutes without traffic, so the first API request after inactivity can take about a minute. Render Free Postgres **expires after 30 days**, has a 1 GB limit, and has no managed backups. Export your data before expiry or move the database to a longer-lived plan/provider if you want to keep rankings beyond that period. Vercel Hobby is intended for personal, non-commercial use. See [Render Free limits](https://render.com/docs/free) and [Vercel Hobby limits](https://vercel.com/docs/plans/hobby).

## Source documentation

- [React Router SPA mode](https://reactrouter.com/how-to/spa)
- [Vercel SPA rewrites](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites)
- [Render Blueprints](https://render.com/docs/infrastructure-as-code)
- [Render FastAPI deployment](https://render.com/docs/deploy-fastapi)
