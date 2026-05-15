# Dashboard Project — PLAN.md
A personal dashboard hosted on GitHub Pages showing four widgets:
1. **Markets** — S&P 500, Dow, Nasdaq, plus a few top movers
2. **News** — Latest headlines from major wires (AP, Reuters, BBC)
3. **PGA Tour Leaderboard** — Current/most recent tournament
4. **LIV Golf Leaderboard** — Current/most recent event (team + individual)
The goal of this project is **learning**, not utility. Optimize accordingly: prefer
clarity over cleverness, prefer well-known tools over hot new ones, prefer working
code over elegant code.
---
## Architecture
This is a **fully static site** with **scheduled data refresh via GitHub Actions**.
No backend server. No secrets in the browser. Free to host forever.
```
+---------------------------+
|  GitHub Actions (cron)    |
|  Every 15 min:            |
|    - Fetch markets        |
|    - Fetch news RSS       |
|    - Fetch PGA leaderboard|
|    - Fetch LIV leaderboard|
|    - Write JSON to /data  |
|    - Commit + push        |
+-------------+-------------+
              |
              v
+---------------------------+
|  GitHub Pages             |
|  Serves:                  |
|    /index.html            |
|    /app.js                |
|    /styles.css            |
|    /data/*.json           |
+-------------+-------------+
              |
              v
+---------------------------+
|  Browser fetches JSON     |
|  Renders 4 widgets        |
+---------------------------+
```
Why this pattern: GitHub Pages can only serve static files. By having a scheduled
Action write JSON into the repo, the "live" data becomes just another static file
the browser can fetch. No backend, no auth, no API keys exposed.
---
## Data Sources (all verified free, no API key required)
| Widget | Source | Notes |
|---|---|---|
| Markets | Yahoo Finance via `yfinance` Python library | Standard, well-maintained |
| News | RSS feeds: AP, Reuters, BBC | Use `feedparser` Python library |
| PGA Leaderboard | `https://site.api.espn.com/apis/site/v2/sports/golf/pga/leaderboard` | ESPN's hidden API |
| LIV Leaderboard | `https://site.api.espn.com/apis/site/v2/sports/golf/liv/leaderboard` | Same pattern, different slug |
**Reliability note:** ESPN endpoints are undocumented. They could change without
warning. Each widget must independently handle "fetch failed" by showing the
last-known-good data plus a "data may be stale" indicator. Do NOT let one broken
widget break the whole dashboard.
---
## Repo Layout
```
dashboard/
  .github/
    workflows/
      refresh-data.yml      # Cron job: runs scripts/fetch_all.py every 15 min
  scripts/
    fetch_all.py            # Orchestrator: calls each fetcher, writes JSON
    fetch_markets.py
    fetch_news.py
    fetch_golf.py           # Handles both PGA and LIV
    requirements.txt
  data/
    markets.json            # Written by Actions, served as static file
    news.json
    pga.json
    liv.json
    last_updated.json       # Timestamp for "data freshness" UI
  index.html
  app.js
  styles.css
  README.md
```
Total: ~12 files. If something tries to balloon this, push back.
---
## Build Order (sequential — do not parallelize)
Each step should result in a working git commit before moving on.
### Step 1: Repo setup
- Create a new GitHub repo (public, since GitHub Pages on free accounts requires public).
- Clone locally.
- Add this `PLAN.md` to the root.
- Add a `.gitignore` for Python (`__pycache__`, `.venv`, etc.).
### Step 2: Markets fetcher (standalone Python script)
- Create `scripts/fetch_markets.py`.
- Use `yfinance` to pull S&P 500 (`^GSPC`), Dow (`^DJI`), Nasdaq (`^IXIC`).
- For "top movers": pull a hardcoded list of 10–20 large-cap tickers, sort by
  daily % change, take top 3 gainers and top 3 losers.
- Output: a Python dict with current price, change, % change for each item.
- Run it from terminal. Print the result. Don't write to a file yet.
### Step 3: News fetcher (standalone)
- Create `scripts/fetch_news.py`.
- Use `feedparser` against 3 RSS URLs (find the actual current URLs for AP top
  stories, Reuters top news, BBC news — they change occasionally).
- Pull 5 most recent headlines from each, merge, sort by date, take top 10.
- Each item: title, source, link, published timestamp.
- Run it. Print.
### Step 4: Golf fetcher (standalone)
- Create `scripts/fetch_golf.py`.
- Hit ESPN's PGA leaderboard endpoint. Parse `events[0]` to get tournament name,
  status, and `competitions[0].competitors[]` for player rows.
- For each competitor pull: position, athlete name, score to par, current round
  score, "thru" (hole count).
- Hit the LIV endpoint with the same code path. **Important:** LIV has team
  scoring too. Surface individual leaderboard for v1; add team standings as a
  separate JSON key.
- Print both.
### Step 5: Orchestrator + JSON output
- Create `scripts/fetch_all.py`.
- Import the three fetchers. Run each in a `try/except` block — one failure
  must not stop the others.
- Write four JSON files into `/data/`.
- Also write `data/last_updated.json` with a UTC ISO timestamp and a per-source
  status (`"ok"` or `"failed: <reason>"`).
- Run locally. Verify all four JSON files appear and look right.
- Commit `/data/` to git.
### Step 6: Static HTML dashboard
- `index.html`: a single page with four card containers, one per widget.
- `styles.css`: keep it simple. CSS grid, dark mode by default, system fonts.
  No CSS framework — you'll learn more by writing it yourself.
- `app.js`: on load, fetch each JSON file from `/data/`, render into its card.
  Show timestamp of last refresh. Show "stale" badge if any source is more
  than 1 hour old.
- Open `index.html` in a browser. Verify it works locally.
### Step 7: GitHub Pages deployment
- Push the repo.
- In repo settings, enable GitHub Pages from the `main` branch root.
- Visit `https://<username>.github.io/<reponame>/`. Verify it loads.
### Step 8: GitHub Actions cron
- Create `.github/workflows/refresh-data.yml`.
- Trigger: `on: schedule: - cron: "*/15 * * * *"` (every 15 min) AND
  `workflow_dispatch:` (so you can run it manually for testing).
- Steps: checkout, set up Python, install requirements, run `fetch_all.py`,
  commit any changes to `/data/`, push.
- Use `peter-evans/create-pull-request` OR just a simple `git commit && git push`
  with the built-in `GITHUB_TOKEN`. The latter is simpler for v1.
- Trigger it manually from the Actions tab. Watch it run. Verify it commits
  fresh data.
### Step 9: Polish
- Add favicon.
- Add a small "last updated X minutes ago" line.
- Pick a name for the dashboard.
- Show a friendly error state when a widget's data is missing.
**Stop here for v1.** Do not start adding HotelPlanner Tour, weather, stock
charts, etc. until you've used what you built for at least a few days. The
discipline to stop is the lesson.
---
## What NOT to do (lessons from getting here)
- **Don't pick fragile data sources first.** Verify the endpoint actually
  returns data before committing the architecture to it.
- **Don't build a chat UI** unless you have a specific need a glance-able
  dashboard can't solve.
- **Don't add OAuth / private data** in v1. Public, read-only is the whole point.
- **Don't use a JS framework.** Vanilla JS for this size. You'll learn more.
- **Don't refactor early.** Get all 8 steps working ugly first. Pretty later.
---
## Working with Claude Code on this
- Start the session by saying: "Read PLAN.md. We're starting at Step 1."
- Move one step at a time. Ask Claude Code to **explain** any code touching
  network requests, JSON parsing, or the Actions YAML before writing it.
- After every step, run the code yourself and confirm output before moving on.
- Commit to git after each successful step. If Claude Code refactors something
  and breaks two other things, you want a clean rollback point.
- When something breaks, paste the **full error and traceback** into Claude Code,
  not "it doesn't work."
- Keep a `NOTES.md` for things that confused you and how you fixed them.
---
## Definition of Done for v1
- Public GitHub repo with working GitHub Pages site.
- Four widgets visibly render with real, recent data.
- A scheduled Action refreshes data every 15 minutes.
- One widget can fail without breaking the others.
- You can explain how every file works.
That last one is the actual goal.
