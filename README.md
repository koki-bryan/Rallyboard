# Table Tennis Rankings

React Router + Tailwind frontend, FastAPI backend, and PostgreSQL database for round robin table tennis events.

## Local setup

1. Start PostgreSQL: `docker compose up -d postgres`.
2. In `backend`, run `uv sync` and then `uv run uvicorn main:app --reload --port 8000`.
3. In `frontend`, run `npm ci` and `npm run dev`.
4. Open `http://localhost:5173`. Use `localhost` consistently; the default API CORS origin is configured for that host.
5. Create the first admin from `backend`: `uv run python main.py bootstrap-admin "Coach Name" coach@example.com "a-long-password"`. Sign in with that account. Admins can promote other registered users to coaches.

Copy `.env.example` files to `.env` to customize the database, frontend origin, cookie security, or API URL. Export backend variables before starting the API (for example, `set -a; source .env; set +a`). Set `COOKIE_SECURE=true` behind HTTPS in production, and use a strong PostgreSQL password.

The API creates its tables on startup. Events have one fixture for each pair of selected players. Any signed-in player can submit a pending result; coaches can correct or void one. The public event view shows provisional standings and match details. Ranking order is match wins, set difference, point difference, then head to head for a remaining two-player tie. Other remaining ties share a rank.

## Checks

- Backend: `cd backend && uv run python -m unittest discover -s tests -v`
- Frontend: `cd frontend && npm run typecheck && npm run build`
