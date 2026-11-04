# Deploy Rallyboard on Vercel Hobby

Rallyboard is live as two Vercel projects on the Hobby plan:

- Frontend: <https://rallyboard-web.vercel.app> (`frontend/`)
- FastAPI backend: <https://rallyboard-api.vercel.app> (`backend/`)
- Database: Neon Free Postgres, provisioned through the Vercel Marketplace and connected to `rallyboard-api`

The frontend serves a React Router SPA. Its `/api/*` rewrite forwards requests to the API project so browser sign-in uses a cookie on the frontend domain. `frontend/vercel.json` holds that rewrite. The backend uses Vercel's FastAPI preset and the `main:app` entrypoint declared in `backend/pyproject.toml`.

## Redeploy after local changes

The two Vercel projects are linked to their local directories. Deploy each changed part from this checkout:

```sh
cd backend && vercel deploy --prod
cd ../frontend && vercel deploy --prod
```

These are CLI deployments. Neither project is connected to Git for automatic deployments, so pushing to GitHub alone will not update the live site. The `.vercel/` link files and `.env.local` files are local and ignored by Git; on another machine, run `vercel link` in each directory and select `rallyboard-api` or `rallyboard-web` respectively.

## Production environment

The API project has `DATABASE_URL` from its Neon integration, `COOKIE_SECURE=true`, and `FRONTEND_ORIGIN=https://rallyboard-web.vercel.app` in its **Production** environment. Keep `VITE_API_URL` unset on the frontend so requests use the same-origin proxy.

The first admin was created with the Vercel account email. The one-time `BOOTSTRAP_ADMIN_*` environment variables were removed after creation. To create an admin for a fresh database, set `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` (at least eight characters) on the API project, deploy, verify sign-in, then remove those variables and redeploy. Do not put passwords in the repository.

The hosted database started empty; local events and scores were not copied. `render.yaml` remains in the repository as an unused alternative deployment configuration.

## Check the live app

1. Open <https://rallyboard-web.vercel.app> and sign in.
2. Confirm a refresh keeps you signed in, then create an event and generate its schedule.
3. Check <https://rallyboard-web.vercel.app/api/v1/events> for an API response and <https://rallyboard-api.vercel.app/docs> for API documentation.

## Free-tier limits

Vercel Hobby is for personal, non-commercial use and has monthly Function and build limits. Neon Free has its own compute and storage limits. A separate Postgres service remains necessary because Vercel Functions do not provide persistent relational storage. See [Vercel Hobby limits](https://vercel.com/docs/plans/hobby), [Neon pricing](https://neon.com/pricing), and [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage).
