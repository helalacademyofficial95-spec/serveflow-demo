# ServeFlow demo website

A responsive, dependency-free marketing website and interactive demo foundation for a fictional software company that helps food providers and retail stores coordinate orders, inventory, and team operations.

## Requirements

- A modern web browser (Chrome, Edge, Firefox, or similar)
- Optional: Python 3, for the local server command below

## Preview locally

### Simplest option

Open `index.html` in a web browser.

### Recommended option: local web server

From the project folder, run:

```powershell
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser. Stop the server with `Ctrl+C`.

If `python` opens the Microsoft Store instead of running Python, install Python 3 from [python.org](https://www.python.org/downloads/) or preview `index.html` directly.

## Project files

- `index.html` — marketing site plus the accessible interactive-demo shell
- `styles.css` — visual system, marketing layout, reusable components, responsive rules, and theme styling
- `data.js` — immutable sample records used to initialize/reset the demo
- `app.js` — browser-only demo state, localStorage helpers, app-shell behavior, and toast notifications
- `script.js` — global theme, mobile navigation, and footer behavior

## Interactive demo dashboard

Select **Book a demo**, **See ServeFlow in action**, or the marketing call-to-action to enter the demo workspace. Phase 2 includes:

- Responsive app shell with a sidebar on desktop and a compact mobile header
- Light and dark theme preference, saved in the current browser
- Operations overview with total sales, order count, average order value, and pending-order metrics
- Interactive sample-sales SVG chart with Today, Last 7 days, and Last 30 days ranges
- Accessible chart text summary, recent activity, attention-needed panel, and recent orders table
- Overview and clearly labeled Coming Soon screens for Food POS, Inventory, and Reports
- Reset-to-sample-data control and confirmation prompt
- Accessible focus styles, reduced-motion support, empty state, badges, cards, buttons, notifications, and demo-only notice

The food POS, inventory editor, and reports are intentionally marked as upcoming. They do not process payments, provide authentication, connect to a backend, or call external APIs. The dashboard’s records, activity, attention items, and sales values are illustrative samples only.

## Resetting the demo

Use **Reset data** within the interactive demo to restore the built-in sample records. The demo stores only its sample state in your browser’s localStorage under `serveflow-demo-state`.

## Notes

The site uses no npm packages, API keys, accounts, paid services, or build steps. The dashboard figures and products are illustrative demo content; no customer claims, testimonials, contact details, or company performance statistics are presented.
