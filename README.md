# WattWise — Electricity Intelligence

A multi-page electricity intelligence web app built with plain HTML, CSS, and
Vanilla JavaScript (Chart.js for charts). No build step, no framework — just
open `index.html` directly in a browser.

## Pages
- `index.html` — Login / Sign Up (hero-style landing, glass auth card)
- `dashboard.html` — Main Electricity Intelligence dashboard
- `smart-planner.html` — Separate Smart Planner page
- `profile.html` — Profile & report history

## How it works
- All auth/user data lives in `localStorage` under the key `wattwise_users`,
  keyed by username: `{ password, bills: [], usageHistory: [] }`.
- The logged-in user is tracked via `localStorage.currentUser`.
- `js/app.js` is the calculation engine + dashboard UI (appliance runtime →
  daily/monthly units → cost → projection → recommendations → tracker).
- `js/planner.js` reads the latest live snapshot (`wattwise_live_<user>`) to
  build the Smart Planner's saving plan and comparison chart.
- `js/history.js` renders saved reports and their appliance breakdown on the
  Profile page.

## Try it
1. Open `index.html` in any modern browser.
2. Sign up with any username/password.
3. On the Dashboard, adjust appliance wattage/hours, price per unit, target
   units, and billing period — everything recalculates live.
4. Click **Save Report** to store a snapshot to your history (visible on the
   Profile page).
5. Click **Open Smart Planner** for a ranked, calculated reduction plan.

## Notes
- The recommendation engine is rule-based (highest consumer → suggested
  reduction → calculated saving), structured so a future AI layer could
  replace the rule logic with natural-language, model-generated insights
  without changing the surrounding UI.
- Browser notifications are optional and only requested after the user
  clicks "Enable Alerts".
