# API Documentation

## Voter Endpoints
- **POST /login/voter** – Authenticate voter using `citizen_id` and `laser_id`, sets session `user.type='voter'` and returns success / failure. Queries `voters` table for status 1. (backend/app.js 26-54)

## Candidate Endpoints
- **POST /login/candidate** – Authenticate candidate using email or candidate ID plus password; requires `status=1`, sets session `user.type='candidate'`. (backend/app.js 57-95)
- **POST /candidate/update** – Requires logged-in candidate; updates `name`, `policy`, `vision`, `manifesto` in `candidates`. (backend/app.js 433-448)
- **GET /candidate/profile** – Returns logged-in candidate’s metadata (name, party, position, policy, image_url, votes, vision, manifesto). (backend/app.js 451-485)
- **GET /candidate/dashboard** – Produces performance data: total votes, rank, leaderboard (top 5), hourly curve, turnout, recent activity, vote goal=60, and candidate metadata. (backend/app.js 487-529)
- **GET /candidates/:id** – Returns candidate row by ID for receipts or public profile. (backend/app.js 513-511)

## Voter/Candidate Public Data
- **GET /candidates** – Returns active candidates plus vote totals (left join with votes table). (backend/app.js 140-178)
- **GET /results** – Aggregate results per candidate for results page. (backend/app.js 182-205)
- **GET /votes/recent** – Returns the most recent ballots (limit defaults to 6, max 12) with candidate metadata; requires a logged-in voter session so it can be shown alongside the voting history. (backend/app.js 200-240)
- Includes each candidate’s current vote tally plus the overall vote count so clients can compute a percentage share/color badge for the live log.
- **POST /vote** – Casts a vote (requires logged-in voter): inserts into `votes`, updates `candidates.votes`, sets `voters.has_voted`. (backend/app.js 279-572)

## Admin Endpoints
- **POST /login/admin** – Authenticates admin, sets session `user.type='admin'`. (backend/app.js 98-133)
- **POST /admin/toggle-voter** / **POST /admin/toggle-candidate** – Enable/disable voters/candidates by updating `status`. (backend/app.js 225-407)
- **POST /admin/toggle-voting** – Updates `settings.voting_enabled` to pause/resume voting. (backend/app.js 222-242)
- **GET /admin/candidates** – Returns basic candidate list (id, name, policy, status) for admin dashboard. (backend/app.js 377-389)

## Session & Security
- Express session configured in `app.js` with a simple secret; every protected route checks `req.session.user` and type before allowing updates. (backend/app.js 10-24)

## Notes
- All API responses are JSON. Candidates/voters must log in to obtain a session before hitting authenticated endpoints. The candidate dashboard endpoint aggregates data directly from the `candidates`, `votes`, and `voters` tables so the UI receives real counts for stats and charts.
