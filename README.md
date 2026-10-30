# ❄ Winter Arc

A 100-day habit tracker (Mon Oct 26, 2026 → Tue Feb 2, 2027). It's an installable, offline web app (PWA) with no server and no database.

## What it tracks
| Habit | Points (default, editable in Settings) |
|---|---|
| Cigarettes | 0 → +10, 1 → +4, each extra −5 |
| Drinks (1 peg = 1 beer) | 0 → +10, 1 → +4, each extra −5 |
| Workout | +10 |
| Ate enough | +10 |
| Water ~3 L | +5 |
| Sleep 7 h+ | +5 |
| New / feared thing (must describe it) | +10 |
| No fap | +5 |

- **Weekly workout rule:** each Sunday you get +15 for 5+ workouts that week, or −15 for fewer. The short final week (Feb 1–2) has no weekly rule.
- **Streaks:** smoking counts as "clean" at 1 cigarette or fewer, and drinking only at exactly 0 drinks. Badges come at 7/14/30/50/75/100 days, plus Perfect weeks.
- **Weight:** you're prompted to weigh in on Mondays, but can log any day. Shows a trend chart and progress toward your goal weight.

## Your data
Everything is stored **only in this browser**, in IndexedDB with a second copy in localStorage. The app asks the browser to keep the data permanently.
**Clearing site data, uninstalling the app, or losing the phone deletes it.** So:

1. Use **Settings → Download backup** regularly. The app reminds you if it's been 7+ days.
2. Keep the file somewhere safe (Google Drive, email to yourself).
3. To restore on any device, use **Settings → Import backup**.

Each device keeps its own data, and nothing syncs between devices. Use one main device.

## Run locally
```bash
npm start        # serves on http://localhost:8080 (python3 -m http.server)
npm test         # unit tests (Node 20+, no dependencies)
```
Service workers need `http://localhost` or HTTPS. Opening `index.html` directly as a file won't work.

## Deploy to GitHub Pages
1. Create a GitHub repo (e.g. `winter-arc`) and push this folder to it.
2. In the repo, open **Settings → Pages**, set Source to *Deploy from a branch*, then pick your branch and `/ (root)`.
3. Open `https://<username>.github.io/winter-arc/` on your phone.
   - **Android/Chrome:** menu → *Install app*.
   - **iPhone/Safari:** Share → *Add to Home Screen*.

All paths are relative, so the app works in a subfolder.

## Updating the app
The service worker serves the cached copy first and fetches updates in the background. Changes therefore appear on the **second** launch after you deploy.
If you add or rename a file, add it to `APP_SHELL` in `sw.js` and bump `CACHE_VERSION`.

## Project layout
```
index.html, styles.css, manifest.webmanifest, sw.js, icons/, vendor/chart.umd.min.js (Chart.js 4.4.1)
js/config.js        defaults and fixed rules
js/dates.js         timezone-safe "YYYY-MM-DD" helpers
js/scoring.js       daily points, weekly workout bonus, daily series
js/streaks.js       streaks, badges, perfect weeks
js/validation.js    settings / entry / weight validation
js/backup.js        data document, backup parsing, reminder logic
js/weight-stats.js  weight summary and goal progress
js/storage.js       IndexedDB + localStorage persistence, backup download
js/charts.js        Chart.js wrappers
js/heatmap.js       100-day map
js/views/*.js       Today, Progress, Weight, Settings screens
js/app.js           entry point
tests/              node:test unit tests for all pure logic
```
