# Rallyboard frontend context

Rallyboard tracks round robin table tennis events. Coaches create events, add players, generate matches, and manage results. Signed-in members enter an event password to view its standings and matches and to submit scores. Coaches and admins have event access without entering that password.

## Stack and local commands

- React 19 with React Router 8, TypeScript, Vite, and Tailwind CSS 4.
- API: FastAPI in `../backend`, backed by local PostgreSQL. The API base URL comes from `VITE_API_URL`, defaulting to `http://localhost:8000/api/v1` in `app/lib/api.ts`.
- From this directory: `npm ci` to install, `npm run dev` to start, `npm run typecheck` to check types, and `npm run build` for a production build.
- The backend must also be running for sign-in and event data. See `../README.md` for full local setup.

## Frontend structure

| Path                             | Purpose                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `app/routes.ts`                  | Route definitions.                                                                                                               |
| `app/root.tsx`                   | HTML shell, browser title, favicon, and route error boundary.                                                                    |
| `app/routes/app-layout.tsx`      | Shared auth and event state, header, mobile event selector, and route outlet context.                                            |
| `app/components/Sidebar.tsx`     | Desktop navigation and event list. The sidebar and main area scroll independently on desktop; mobile uses normal page scrolling. |
| `app/routes/home.tsx`            | Event chooser. Locked events show their names without exposing status.                                                           |
| `app/routes/event.tsx`           | Event access gate, standings, match results, player search, and scoring dialog.                                                  |
| `app/routes/create-event.tsx`    | Coach event creation. Events start as drafts.                                                                                    |
| `app/routes/manage-event.tsx`    | Coach roster, schedule, event password, and event deletion controls.                                                             |
| `app/routes/accounts.tsx`        | Admin account role management.                                                                                                   |
| `app/routes/profile.tsx`         | Signed-in user's email and account deletion controls.                                                                            |
| `app/components/ScoreDialog.tsx` | Set score entry and live validation.                                                                                             |
| `app/lib/scoreValidation.ts`     | Client-side score rules; the backend validates again before saving.                                                              |
| `app/lib/types.ts`               | Shared frontend API types and small helpers.                                                                                     |
| `app/lib/api.ts`                 | JSON fetch helper with cookies and status-aware `ApiError`.                                                                      |

## Key behavior

- The layout loads `/auth/me` and `/events`. Event details require sign-in and, for ordinary users, a successful `/events/{id}/join` with the event password. A 403 from event details shows the password form. A signed-out visitor sees a sign-in prompt first.
- Event password access does not add someone to the competing player roster. The coach controls the roster. Changing an event password revokes prior member access.
- The coach can create an empty draft, add name-only players or registered users, then generate the randomized round robin schedule. Once generated, the roster is locked.
- Standings rank by wins, then fewer losses. A direct result breaks a two-player record tie; remaining ties use set difference, then point difference. Rankings come from the API.
- New score forms start blank. Save stays disabled until each set is valid and one player has won the required number of sets. A set ends at 11 with a two-point lead, or continues through deuce (for example, 27–29). The backend rejects invalid or incomplete results even if the client is bypassed.
- Account email changes and deletion require the current account password. Deletion removes sign-in access while retaining past results under an anonymous former-player identity.

## Styling

Use Tailwind utilities for component styling. Shared color and font tokens live in `app/app.css` under `@theme`. The palette uses muted blue, red, yellow, and green. `PlayerAvatar` assigns a stable muted color from each player ID so colors stay consistent across the roster, standings, and match cards. The brand logo and browser icon use `public/assets/rallyboard.png`; `BrandLogo` frames it for the sidebar and mobile header.

## Checks after changes

Run `npm run typecheck && npm run build` from `frontend`. For backend behavior changes, run `.venv/bin/python -m unittest discover -s tests -v` from `backend` (or `uv run python -m unittest discover -s tests -v` if `uv` is configured). Do not put database passwords or other secrets in this file.
