# Table Tennis Rankings

React Router + Tailwind frontend, FastAPI backend, and local PostgreSQL database for round robin table tennis events.

## Local setup

1. Start the local PostgreSQL cluster: `sudo pg_ctlcluster 18 main start`.
2. Check `backend/.env`. The backend loads it automatically and Git ignores it.
3. From `backend`, run `uv sync`, then `uv run python init_db.py`. This creates the configured database and tables if needed.
4. Start the API: `uv run uvicorn main:app --reload --port 8000`. Check `http://localhost:8000/docs`.
5. In a second terminal, from `frontend`, run `npm ci` and `npm run dev`. Open `http://localhost:5173`.
6. Create the first admin from `backend`: `uv run python main.py bootstrap-admin "Coach Name" coach@example.com "a-long-password"`. Sign in with that account.

## Using the application

1. Players create accounts using **Sign in → Create an account**. The coach can also create a normal account there if needed.
2. Sign in as the admin. The **Account roles** section lets you promote a registered player to coach.
3. Click **Create event**, enter a name and event password, choose best of 3, 5, or 7, then submit the form. You will be taken to the new event’s roster page. The event starts as a draft, even with no players.
4. Select the draft event. Add players by name or choose registered accounts. Once at least two players are present, click **Generate round robin schedule**. The system randomizes the sequence while ensuring every pair plays once and no player has two matches in a round. The roster locks when the schedule is generated.
5. Share the event password with people who should enter scores. After signing in, they select the event and enter that password once to unlock scoring. They do not need to be competing players. Then they can choose **Enter score** on a fixture, enter each set in order, and save. Each set must reach at least 11 points with a two-point lead.
6. Standings update immediately. Match wins rank first, then set difference, then point difference. For a remaining two-player tie, the direct match decides; other remaining ties share a rank.
7. Coaches and admins can use **Correct**, **Void**, or **History** on a match. They can also set or change the event password on the event management page; use this for events created before passwords were added. Changing a password removes previous score-entry access, so scorers must enter the new password. Corrections change the standings; history records the changes.

The API creates its tables on startup. Coaches create draft events, add name-only players or registered accounts, then generate a randomized round robin schedule with one fixture per pair. Any signed-in event member can submit a pending result; coaches can correct or void one. The public event view shows provisional standings and match details. Ranking order is match wins, set difference, point difference, then head to head for a remaining two-player tie. Other remaining ties share a rank.

## Checks

- Backend: `cd backend && uv run python -m unittest discover -s tests -v`
- Frontend: `cd frontend && npm run typecheck && npm run build`
