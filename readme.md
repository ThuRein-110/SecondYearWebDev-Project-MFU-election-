# MFU Election Voting System

This repository contains the backend and frontend for a university election platform. It supports voter authentication, candidate management, voting, history lookup, and an admin dashboard with control over voters, candidates, and global election state.

## Key features

- **Voter authentication:** voters log in with their Thai citizen ID and laser ID (no shared passwords). Requests to `/login/voter` verify the credentials and establish a session.
- **Candidate authentication:** candidates log in via email or candidate ID plus a password stored in the database; sessions identify them for profile updates.
- **Admin control panel:** admins can review voters/candidates, toggle their `status` (enable/disable), toggle the global voting switch, and export data.
- **Voting & history:** voters can cast one vote, incrementing the candidate tally, and later view a history receipt that links to `receipt.html` from the dashboard. The voter history page also now surfaces a live voting log from `/votes/recent`, which always returns the candidate leaderboard (even zero-vote candidates) plus color-coded bars that show their current vote share so you can follow every campaign.
- **Candidate performance dashboard:** the refreshed `candidate-dashboard` now fetches `/candidate/dashboard` to show live vote totals, rank, turnout, a vote-trend line chart, and a leaderboard. The “Trend” number is the server-reported delta between your vote total and the next closest candidate, so a positive value means you are gaining ground; the campaign-goal meter targets 60 votes (matching the 50-user seed) so the progress bar reflects the real objective instead of an arbitrary 2,000-vote benchmark.
- The dashboard also renders a responsive “Momentum Meter” below the leaderboard that turns each top candidate into a horizontal bar (with vote and share labels), so the layout behaves like the reference chart on phones and desktops alike.

## Admin enable / disable behavior

The admin dashboard exposes enable/disable controls for each voter and candidate. These buttons call `/admin/toggle-voter` or `/admin/toggle-candidate`, which update the corresponding row’s `status` flag (`1` = enabled, `0` = disabled). Disabling a voter prevents them from logging in, and disabling a candidate removes them from the ballot. There is also a `/admin/toggle-voting` endpoint that flips the `voting_enabled` bit in the `settings` table, allowing the admin to pause or resume the election with the same enable/disable UI.

## Getting started

1. **Database setup** – run `node backend/setup.js` (requires a local MySQL server). This creates `mfu_election` with tables and seed data for voters, candidates, admins, and settings.
2. **Start the backend** – run `npm install` from `/backend` then `node app.js`. The API listens on `http://localhost:3000`.
3. **Frontend** – open `frontend/login.html` from a static server or serve the `frontend` folder (the backend already serves static assets via `express.static`). The voter and candidate login flows live in `login.html` and `candidate-login.html`.

## Logging in

- **Voters** use their citizen ID (e.g., `6731501001`) and laser ID (`GY2#######`). There are no individual voter passwords; enter the ID pair seeded by `setup.js`.
- **Candidates** provide their email or `candidate_id` together with the password listed in the `setup.js` seeds (e.g., `VoicePulse$26`).
- **Admin** credentials default to `admin / admin123`.

## Development tips

- Frontend scripts are in `frontend/public/js/`; adjust the dashboard layout in `admin-dashboard.html` / `admin-dashboard.css` if you want a different UI.
- The backend stores votes in the `votes` table and tracks voter participation via `has_voted`. When a vote succeeds, the voter’s `has_voted` flag updates automatically.
- All API responses use JSON and assume cookies are allowed; run the frontend and backend from the same origin or configure CORS accordingly.

## Troubleshooting

- If you see a “database error” alert, check that MySQL is running and `setup.js` executed successfully.
- Reset the seeded data by running `node backend/setup.js` again (it uses `INSERT ... ON DUPLICATE KEY UPDATE`).

## License

This project is provided as-is for internal use.
