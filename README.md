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
- `data.js` — immutable sample records (menu, prices, demo tax rate, orders, inventory, sales) used to initialize/reset the demo
- `app.js` — browser-only demo state, saved-data validation and migration, dashboard, Food POS, localStorage helpers, and notifications
- `script.js` — global theme, mobile navigation, and footer behavior

## Interactive demo dashboard

Select **Book a demo**, **See ServeFlow in action**, or the marketing call-to-action to enter the demo workspace. Phases 1 and 2 include:

- Responsive app shell with a sidebar on desktop and a compact mobile header
- Light and dark theme preference, saved in the current browser
- Operations overview with total sales, order count, average order value, and pending-order metrics
- Interactive sample-sales SVG chart with Today, Last 7 days, and Last 30 days ranges
- Accessible chart text summary, recent activity, attention-needed panel, and recent orders table
- Overview, Food POS, and clearly labeled Coming Soon screens for Inventory and Reports
- Reset-to-sample-data control and confirmation prompt
- Accessible focus styles, reduced-motion support, empty state, badges, cards, buttons, notifications, and demo-only notice

The inventory editor and reports are intentionally marked as upcoming. Nothing in the demo processes payments, provides authentication, connects to a backend, or calls external APIs. The sample records and sales values are illustrative only.

## Food POS (Phase 3)

Open **Food POS** in the workspace menu. It is a simulated point of sale:

- **Menu:** 20 sample items in five categories (Coffee, Bowls, Bakery, Drinks, Retail)
- **Search and filters:** search by name, category, or description (case-insensitive, multiple words allowed) and combine it with a category filter; an empty-result message offers a one-click reset
- **Order summary:** add items, change quantities with + and − (1 to 99 per item), remove a line, or clear the order
- **Totals:** subtotal, tax, and total are calculated in whole cents to avoid rounding errors
- **Simulated checkout:** a confirmation dialog shows the order and creates a sample order only after you confirm. It never asks for card or payment details and no money moves
- **Order status:** new orders start as **New** and move through **Preparing**, **Ready**, and **Completed**, one step at a time. The order queue can be filtered by Active, Completed, or All
- **Dashboard link:** each demo order updates total sales, order count, average order value, pending orders, the attention panel, and recent activity on the Overview screen
- **Saved in your browser:** the current order, customer name, order type, and all demo orders survive a page reload
- **Mobile:** on phones and tablets the order summary sits below the menu, and a "View order" bar at the bottom jumps to it

### Demo tax rate

The tax rate is **8%**, set as `taxRate` in `data.js`. It is a demo-only illustration and is not a statement about real tax requirements. Currency is US dollars throughout.

### Limitations

- No real payments, receipts, refunds, discounts, tips, or accounts. Checkout is a simulation
- Orders live only in this browser's localStorage. They are not shared between browsers or devices and are lost if site data is cleared
- Completing an order does not change inventory levels (inventory arrives in a later phase)
- Menu items and prices are defined in `data.js` and cannot be edited in the app. Prices are never read from saved data, so tampering with localStorage cannot change what an item costs
- The 7-day and 30-day sales figures are sample data with demo-order totals added to the latest point
- If the browser blocks localStorage, the demo keeps working for the current visit and shows a notice that changes will be lost when the page closes

## Resetting the demo

Use **Reset data** within the interactive demo to restore the built-in sample records. Reset also clears demo orders and the current POS order, and it keeps you on the screen you are viewing. A toast message and a banner confirm the reset. The banner stays until you dismiss it or change screens.

The demo stores only its sample state in your browser's localStorage under `serveflow-demo-state`.

### Saved-data versions

Saved data is versioned (currently version 3). When an older version is found, valid saved orders, inventory, and activity are kept and the new POS fields are added. Malformed or unreadable saved data is repaired or replaced with the sample data instead of breaking the demo. Quantities, prices, order status, and text fields are validated every time saved data is read, and text is always displayed as plain text, never as HTML.

## Notes

The site uses no npm packages, API keys, accounts, paid services, or build steps. The dashboard figures and products are illustrative demo content; no customer claims, testimonials, contact details, or company performance statistics are presented.
