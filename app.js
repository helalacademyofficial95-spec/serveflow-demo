/* Browser-only demo application. No account, payment, or server calls are made.
   Sections: helpers -> saved data (validation + migration) -> cart math -> UI helpers
   -> dashboard -> Food POS -> navigation and reset -> start-up. */
window.ServeFlowApp = (function () {
  "use strict";

  const seed = window.ServeFlowSeed;
  const STORAGE_KEY = "serveflow-demo-state";

  const MAX_QTY = 99;          // largest quantity allowed for one menu item
  const MAX_NAME = 40;         // longest customer name we keep
  const MAX_ORDERS = 500;      // oldest orders beyond this are dropped
  const MAX_ACTIVITY = 12;
  const VISIBLE_ORDERS = 12;
  const STATUS_FLOW = ["New", "Preparing", "Ready", "Completed"];
  const ORDER_TYPES = ["Counter", "Dine-in", "Online pickup"];
  const NEXT_STEP_LABEL = { New: "Start preparing", Preparing: "Mark ready", Ready: "Complete order" };
  const VIEW_TITLES = { dashboard: "Overview", pos: "Food POS", inventory: "Inventory", reports: "Reports" };
  const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

  /* ---------- Small helpers ---------- */

  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formatCurrency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0);
  const formatCents = (cents) => formatCurrency(cents / 100);
  const toCents = (dollars) => Math.round(dollars * 100);
  const roundMoney = (n) => Math.round(n * 100) / 100;
  const isMoney = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100000;
  const cleanText = (value, max) => (typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim().slice(0, max) : "");
  const timeLabel = (date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const cloneSeed = () => JSON.parse(JSON.stringify(seed));
  const mainEl = () => document.querySelector(".app-main");

  /* Quantities must be whole numbers from 1 to MAX_QTY. Anything else is rejected (null). */
  function toQty(value) {
    if (typeof value !== "number" && typeof value !== "string") return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const whole = Math.floor(n);
    return whole >= 1 ? Math.min(whole, MAX_QTY) : null;
  }

  /* The menu comes only from data.js. Items with a bad id, name, or price are ignored. */
  const MENU = (Array.isArray(seed.menu) ? seed.menu : [])
    .filter((item) => item && typeof item.id === "string" && /^[a-z0-9-]+$/.test(item.id) && typeof item.name === "string" && item.name && isMoney(item.price))
    .map((item) => ({ id: item.id, name: item.name, category: String(item.category || "Other"), price: roundMoney(item.price), emoji: String(item.emoji || "🍽️"), detail: String(item.detail || "") }));
  const menuById = new Map(MENU.map((item) => [item.id, item]));
  const CATEGORIES = ["All"].concat((seed.menuCategories || []).filter((name) => MENU.some((item) => item.category === name)));
  const TAX_RATE = typeof seed.taxRate === "number" && seed.taxRate >= 0 && seed.taxRate <= 1 ? seed.taxRate : 0.08;
  const TAX_PERCENT = Math.round(TAX_RATE * 1000) / 10;

  /* Screen state that is not saved (search text, filters, current screen). */
  const ui = { view: "dashboard", range: "today", search: "", category: "All", orderFilter: "active", notice: null };
  let activeModal = null;
  let lastFocusedElement;

  /* ---------- Saved data: validation and migration ---------- */

  function sanitizeOrderItem(entry) {
    if (!entry || typeof entry !== "object") return null;
    const qty = toQty(entry.qty);
    const name = cleanText(entry.name, 60);
    if (qty === null || !name || !isMoney(entry.price)) return null;
    return { name, price: roundMoney(entry.price), qty };
  }

  function sanitizeOrder(entry) {
    if (!entry || typeof entry !== "object") return null;
    const id = typeof entry.id === "string" || typeof entry.id === "number" ? String(entry.id).trim() : "";
    if (!/^\d{1,8}$/.test(id) || !isMoney(entry.total)) return null;
    const order = {
      id,
      customer: cleanText(entry.customer, MAX_NAME) || "Guest",
      channel: cleanText(entry.channel, 30) || "Counter",
      status: STATUS_FLOW.includes(entry.status) ? entry.status : "New",
      total: roundMoney(entry.total),
      date: cleanText(entry.date, 40) || "Today"
    };
    if (typeof entry.createdAt === "string" && !Number.isNaN(Date.parse(entry.createdAt))) order.createdAt = entry.createdAt;
    if (entry.source === "pos") {
      order.source = "pos";
      if (isMoney(entry.subtotal)) order.subtotal = roundMoney(entry.subtotal);
      if (isMoney(entry.tax)) order.tax = roundMoney(entry.tax);
    }
    if (Array.isArray(entry.items)) {
      const items = entry.items.map(sanitizeOrderItem).filter(Boolean).slice(0, 50);
      if (items.length) order.items = items;
    }
    return order;
  }

  function sanitizeInventoryItem(entry) {
    if (!entry || typeof entry !== "object") return null;
    const id = cleanText(entry.id, 40);
    const name = cleanText(entry.name, 60);
    const valid = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1000000;
    if (!id || !name || !valid(entry.stock) || !valid(entry.threshold)) return null;
    return { id, name, stock: entry.stock, threshold: entry.threshold };
  }

  function sanitizeActivity(entry) {
    if (!entry || typeof entry !== "object") return null;
    const title = cleanText(entry.title, 120);
    if (!title) return null;
    const item = { icon: cleanText(entry.icon, 4) || "•", title, detail: cleanText(entry.detail, 120), time: cleanText(entry.time, 30) };
    if (typeof entry.at === "string" && !Number.isNaN(Date.parse(entry.at))) item.at = entry.at;
    return item;
  }

  function sanitizeAttention(entry) {
    if (!entry || typeof entry !== "object") return null;
    const title = cleanText(entry.title, 120);
    if (!title) return null;
    return { level: cleanText(entry.level, 30) || "Notice", title, detail: cleanText(entry.detail, 120) };
  }

  function sanitizeCart(raw) {
    const cart = { items: [], orderType: ORDER_TYPES[0], customer: "" };
    if (!raw || typeof raw !== "object") return cart;
    if (Array.isArray(raw.items)) {
      const quantities = new Map();
      raw.items.forEach((entry) => {
        if (!entry || typeof entry.id !== "string" || !menuById.has(entry.id)) return;
        const qty = toQty(entry.qty);
        if (qty === null) return;
        quantities.set(entry.id, Math.min(MAX_QTY, (quantities.get(entry.id) || 0) + qty));
      });
      quantities.forEach((qty, id) => cart.items.push({ id, qty }));
    }
    if (ORDER_TYPES.includes(raw.orderType)) cart.orderType = raw.orderType;
    cart.customer = cleanText(raw.customer, MAX_NAME);
    return cart;
  }

  /* Takes anything that came out of localStorage (any version) and returns a complete,
     valid state. Saved orders, inventory, and activity are kept when they are valid;
     anything missing or malformed falls back to the sample data. */
  function normalizeState(raw) {
    const state = cloneSeed();
    state.version = seed.version;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      state.cart = sanitizeCart(null);
      return state;
    }
    const keepList = (saved, sanitize, limit) => {
      if (!Array.isArray(saved)) return null;
      const cleaned = saved.map(sanitize).filter(Boolean).slice(0, limit);
      return cleaned.length || saved.length === 0 ? cleaned : null; // all entries bad -> use sample data
    };
    const orders = keepList(raw.orders, sanitizeOrder, MAX_ORDERS);
    if (orders) {
      const seen = new Set();
      state.orders = orders.filter((order) => (seen.has(order.id) ? false : seen.add(order.id)));
    }
    state.inventory = keepList(raw.inventory, sanitizeInventoryItem, 100) || state.inventory;
    state.activity = keepList(raw.activity, sanitizeActivity, MAX_ACTIVITY) || state.activity;
    state.attention = keepList(raw.attention, sanitizeAttention, 20) || state.attention;
    state.cart = sanitizeCart(raw.cart);
    return state;
  }

  /* If the browser blocks localStorage we keep working from memory for this visit. */
  let memoryState = null;
  let storageFailed = false;

  function getState() {
    if (!storageFailed) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return normalizeState(JSON.parse(stored));
      } catch (error) {
        console.warn("ServeFlow sample data could not be read.", error);
      }
    }
    return memoryState ? normalizeState(memoryState) : normalizeState(null);
  }

  function saveState(state) {
    const saved = { version: seed.version, orders: state.orders, inventory: state.inventory, activity: state.activity, attention: state.attention, cart: state.cart };
    memoryState = JSON.parse(JSON.stringify(saved));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      storageFailed = false;
    } catch (error) {
      storageFailed = true;
      console.warn("ServeFlow sample data could not be saved.", error);
    }
  }

  /* ---------- Cart math (done in whole cents to avoid rounding errors) ---------- */

  function cartDetails(cart) {
    const lines = [];
    let subtotalCents = 0;
    let count = 0;
    cart.items.forEach(({ id, qty }) => {
      const item = menuById.get(id);
      if (!item) return;
      const lineCents = toCents(item.price) * qty;
      lines.push({ item, qty, lineCents });
      subtotalCents += lineCents;
      count += qty;
    });
    const taxCents = Math.round(subtotalCents * TAX_RATE);
    return { lines, count, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
  }

  function totalsMarkup(details) {
    return `<dl class="cart-totals"><div><dt>Subtotal</dt><dd>${formatCents(details.subtotalCents)}</dd></div><div><dt>Demo tax (${TAX_PERCENT}%)</dt><dd>${formatCents(details.taxCents)}</dd></div><div class="total"><dt>Total</dt><dd>${formatCents(details.totalCents)}</dd></div></dl>`;
  }

  /* ---------- UI helpers: toast, announcer, modal, focus ---------- */

  function showToast(message) {
    const region = document.querySelector("#toast-region");
    if (!region) return;
    while (region.children.length >= 3) region.firstElementChild.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✓";
    const text = document.createElement("p");
    text.textContent = message; // textContent: never interpreted as HTML
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    const dismiss = () => toast.remove();
    close.addEventListener("click", dismiss);
    toast.append(icon, text, close);
    region.append(toast);
    window.setTimeout(dismiss, 6000);
  }

  function announce(message) {
    const region = document.querySelector("#sr-announcer");
    if (!region) return;
    region.textContent = "";
    window.setTimeout(() => { region.textContent = message; }, 40);
  }

  function focusMainHeading() {
    const heading = mainEl().querySelector("h1");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  function restoreFocus(container, keys, fallback) {
    for (const key of keys || []) {
      const target = container.querySelector(`[data-key="${key}"]:not([disabled])`);
      if (target) { target.focus({ preventScroll: true }); return; }
    }
    if (fallback) fallback.focus({ preventScroll: true });
  }

  function closeActiveModal() {
    if (!activeModal) return;
    const { root, opener } = activeModal;
    activeModal = null;
    root.remove();
    if (opener && document.contains(opener) && !opener.disabled) opener.focus({ preventScroll: true });
  }

  function openModal({ eyebrow, title, bodyHtml, confirmLabel, onConfirm }) {
    closeActiveModal();
    const root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" type="button" data-close-modal aria-label="Close dialog">×</button><p class="eyebrow"><span></span> ${esc(eyebrow)}</p><h2 id="modal-title">${esc(title)}</h2>${bodyHtml}<div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancel</button><button class="button button-primary" type="button" data-confirm>${esc(confirmLabel)}</button></div></section>`;
    document.body.append(root);
    activeModal = { root, opener: document.activeElement };
    root.querySelectorAll("[data-close-modal]").forEach((control) => control.addEventListener("click", closeActiveModal));
    root.querySelector("[data-confirm]").addEventListener("click", () => {
      closeActiveModal();
      const next = onConfirm();
      if (next instanceof Element) next.focus({ preventScroll: true });
      else if (!document.activeElement || document.activeElement === document.body) focusMainHeading();
    });
    root.addEventListener("keydown", (event) => { // keep Tab inside the dialog
      if (event.key !== "Tab") return;
      const focusable = Array.from(root.querySelectorAll("button:not([disabled])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    root.querySelector(".modal-close").focus();
  }

  function noticeMarkup() {
    if (!ui.notice) return "";
    return `<div class="status-banner" role="status"><span aria-hidden="true">✓</span><p><strong>${esc(ui.notice.message)}</strong> ${esc(ui.notice.detail)}</p><button type="button" data-action="dismiss-notice" aria-label="Dismiss reset message">×</button></div>`;
  }

  function statusClass(status) {
    return { New: "badge-info", Preparing: "badge-warning", Ready: "badge-success", Completed: "badge-neutral" }[status] || "badge-neutral";
  }

  function relativeTime(entry) {
    if (entry.at) {
      const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(entry.at)) / 60000));
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} min ago`;
      if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
    }
    return entry.time || "Earlier";
  }

  /* ---------- Dashboard ---------- */

  function chartMarkup(range) {
    const max = Math.max(...range.points);
    const coordinates = range.points.map((point, index) => {
      const x = (index / (range.points.length - 1)) * 640;
      const y = 170 - ((point / max) * 135);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const labels = range.labels.map((label) => `<span>${esc(label)}</span>`).join("");
    return `<div class="sales-chart" aria-label="${esc(range.label)} sales chart"><svg viewBox="0 0 640 190" role="img" aria-label="${esc(range.label)} sample sales total ${formatCurrency(range.total)}. ${esc(range.comparison)}."><defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fa6d5d" stop-opacity=".25"/><stop offset="100%" stop-color="#fa6d5d" stop-opacity="0"/></linearGradient></defs><path d="M0,170 L${coordinates.replace(/ /g, " L")} L640,170 Z" fill="url(#sales-area)"/><polyline points="${coordinates}" fill="none" stroke="#fa6d5d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="chart-labels" aria-hidden="true">${labels}</div></div>`;
  }

  /* Sales shown on the dashboard = sample figures + every demo checkout made in the POS. */
  function rangeWithPosSales(state, rangeKey) {
    const base = state.salesRanges[rangeKey] || state.salesRanges.today;
    const posCents = state.orders.filter((order) => order.source === "pos").reduce((sum, order) => sum + toCents(order.total), 0);
    const points = base.points.slice();
    points[points.length - 1] = roundMoney(points[points.length - 1] + posCents / 100);
    return Object.assign({}, base, { total: roundMoney(base.total + posCents / 100), points });
  }

  function renderDashboard(rangeKey = "today", focusKeys) {
    ui.view = "dashboard";
    ui.range = ["today", "week", "month"].includes(rangeKey) ? rangeKey : "today";
    const state = getState();
    const range = rangeWithPosSales(state, ui.range);
    const orders = state.orders;
    const pendingOrders = orders.filter((order) => order.status !== "Completed").length;
    const awaitingUpdate = orders.filter((order) => order.status === "New" || order.status === "Preparing").length;
    const averageOrderValue = orders.length ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0;

    const attentionEntries = state.attention.filter((entry) => entry.level !== "Pending").map((entry) => ({ level: entry.level, title: entry.title, detail: entry.detail }));
    if (awaitingUpdate > 0) attentionEntries.push({ level: "Pending", title: `${awaitingUpdate} order${awaitingUpdate === 1 ? "" : "s"} await a status update`, detail: "Review new and preparing orders" });

    const rangeButtons = Object.keys(state.salesRanges).map((key) => `<button class="range-button ${key === ui.range ? "active" : ""}" type="button" data-action="range" data-range="${esc(key)}" data-key="range:${esc(key)}" aria-pressed="${key === ui.range}">${esc(state.salesRanges[key].label)}</button>`).join("");
    const activity = state.activity.slice(0, 6).map((entry) => `<li><span class="activity-icon" aria-hidden="true">${esc(entry.icon)}</span><div><strong>${esc(entry.title)}</strong><small>${esc(entry.detail)}</small></div><time>${esc(relativeTime(entry))}</time></li>`).join("");
    const attention = attentionEntries.length
      ? attentionEntries.map((entry) => `<li><span class="attention-level">${esc(entry.level)}</span><div><strong>${esc(entry.title)}</strong><small>${esc(entry.detail)}</small></div></li>`).join("")
      : `<li><div><strong>Nothing needs attention</strong><small>All orders are up to date.</small></div></li>`;
    const shownOrders = orders.slice(0, 8);
    const orderRows = shownOrders.length
      ? shownOrders.map((order) => `<tr><td><strong>#${esc(order.id)}</strong><small>${esc(order.channel)}</small></td><td>${esc(order.customer)}</td><td>${formatCurrency(order.total)}</td><td><span class="badge ${statusClass(order.status)}">${esc(order.status)}</span></td><td>${esc(order.date)}</td></tr>`).join("")
      : `<tr><td colspan="5">No orders yet. Open the Food POS to create a demo order.</td></tr>`;

    const main = mainEl();
    main.classList.remove("pos-view");
    main.innerHTML = `<header class="app-header"><div><p class="kicker">INTERACTIVE PREVIEW</p><h1>Operations overview</h1></div><div class="app-header-actions"><span class="demo-pill">Local demo</span><button class="button button-secondary" type="button" data-action="reset">Reset data</button></div></header><div class="demo-notice" role="status"><span aria-hidden="true">ⓘ</span><p><strong>Demo data only.</strong> Changes stay in this browser. Payments, accounts, and backend services are not connected.</p></div>${noticeMarkup()}<section class="overview-metrics" aria-label="Sample operations metrics"><article class="metric-card"><span class="metric-card-icon coral">↗</span><p>Total sales</p><strong>${formatCurrency(range.total)}</strong><small class="trend-positive">${esc(range.comparison)}</small></article><article class="metric-card"><span class="metric-card-icon blue">▦</span><p>Order count</p><strong>${orders.length}</strong><small>Sample and demo orders today</small></article><article class="metric-card"><span class="metric-card-icon purple">◌</span><p>Average order</p><strong>${formatCurrency(averageOrderValue)}</strong><small>${orders.length ? "Across all orders" : "No orders yet"}</small></article><article class="metric-card"><span class="metric-card-icon orange">◷</span><p>Pending orders</p><strong>${pendingOrders}</strong><small>New, preparing, or ready</small></article></section><section class="dashboard-grid"><article class="dashboard-panel sales-panel"><div class="panel-heading"><div><p class="panel-kicker">SAMPLE SALES</p><h2>${formatCurrency(range.total)}</h2><span class="trend-positive">${esc(range.comparison)}</span></div><div class="range-selector" aria-label="Sales date range">${rangeButtons}</div></div>${chartMarkup(range)}<p class="chart-summary">Accessible summary: ${esc(range.label)} simulated sales total ${formatCurrency(range.total)}, ${esc(range.comparison)}.</p></article><article class="dashboard-panel attention-panel"><div class="panel-heading"><div><p class="panel-kicker">NEEDS ATTENTION</p><h2>Keep service moving</h2></div><span class="badge badge-warning">${attentionEntries.length} item${attentionEntries.length === 1 ? "" : "s"}</span></div><ul class="attention-list">${attention}</ul><button class="link-button" type="button" data-action="coming-soon" data-label="Inventory">Review inventory →</button></article></section><section class="dashboard-grid lower-grid"><article class="dashboard-panel activity-panel"><div class="panel-heading"><div><p class="panel-kicker">RECENT ACTIVITY</p><h2>What changed</h2></div></div><ul class="activity-list">${activity}</ul></article><article class="dashboard-panel quick-panel"><p class="panel-kicker">DEMO WORKSPACE</p><h2>Explore your next workflow</h2><p>Try the simulated Food POS to create demo orders and watch these figures update. Inventory and reports are planned for later phases.</p><div><button class="button button-primary" type="button" data-action="go-pos">Open Food POS <span>→</span></button><button class="button button-secondary" type="button" data-action="coming-soon" data-label="Inventory">Inventory</button></div></article></section><section class="dashboard-panel orders-panel"><div class="panel-heading"><div><p class="panel-kicker">RECENT ORDERS</p><h2>Latest orders</h2></div><span class="badge badge-neutral">${shownOrders.length} shown</span></div><div class="orders-table-wrap"><table><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Date</th></tr></thead><tbody>${orderRows}</tbody></table></div></section>`;
    if (focusKeys) restoreFocus(main, focusKeys);
  }

  function renderComingSoon(view) {
    ui.view = view;
    const name = VIEW_TITLES[view] || "This module";
    const main = mainEl();
    main.classList.remove("pos-view");
    main.innerHTML = `<header class="app-header"><div><p class="kicker">INTERACTIVE PREVIEW</p><h1>${esc(name)}</h1></div><button class="button button-secondary" type="button" data-action="reset">Reset data</button></header><div class="demo-notice" role="status"><span aria-hidden="true">ⓘ</span><p><strong>Demo data only.</strong> This workspace does not connect to payments, accounts, or backend services.</p></div>${noticeMarkup()}<section class="empty-state coming-soon-state"><span class="empty-icon" aria-hidden="true">◌</span><p class="panel-kicker">COMING SOON</p><h2>${esc(name)} is planned for a later phase.</h2><p>The navigation is included to show the planned product structure. This module is intentionally not interactive yet.</p><button class="button button-primary" type="button" data-action="go-overview">Return to overview</button></section>`;
  }

  /* ---------- Food POS ---------- */

  function renderPos() {
    ui.view = "pos";
    const main = mainEl();
    main.classList.add("pos-view");
    const chips = CATEGORIES.map((name) => `<button class="chip" type="button" data-action="category" data-category="${esc(name)}" aria-pressed="${name === ui.category}">${esc(name)}</button>`).join("");
    const storageNote = storageFailed ? " Your browser is blocking storage, so changes will be lost when you leave this page." : "";
    main.innerHTML = `<header class="app-header"><div><p class="kicker">INTERACTIVE PREVIEW</p><h1>Food POS</h1></div><div class="app-header-actions"><span class="demo-pill">Simulated checkout</span><button class="button button-secondary" type="button" data-action="reset">Reset data</button></div></header><div class="demo-notice" role="status"><span aria-hidden="true">ⓘ</span><p><strong>Simulated checkout only.</strong> No payment details are requested or processed, and orders stay in this browser. The ${TAX_PERCENT}% tax rate is a demo-only value, not a statement about real tax requirements.${esc(storageNote)}</p></div>${noticeMarkup()}<div class="pos-layout"><section class="dashboard-panel pos-catalog" aria-labelledby="menu-title"><div class="panel-heading"><div><p class="panel-kicker">MENU</p><h2 id="menu-title">Choose items</h2></div></div><div class="pos-toolbar"><div class="search-field"><label for="menu-search">Search menu</label><input id="menu-search" type="search" placeholder="Try “latte” or “bowl”" maxlength="60" autocomplete="off" spellcheck="false" aria-controls="menu-grid" value="${esc(ui.search)}"></div><div class="category-filters" role="group" aria-label="Filter menu by category">${chips}</div></div><p class="menu-count" id="menu-count" role="status" aria-live="polite"></p><ul class="menu-grid" id="menu-grid"></ul></section><aside class="dashboard-panel pos-cart" id="pos-cart" aria-labelledby="cart-title" tabindex="-1"></aside></div><section class="dashboard-panel pos-orders-panel" id="pos-orders" aria-labelledby="queue-title" tabindex="-1"></section><div class="cart-bar" id="cart-bar" hidden><p id="cart-bar-text"></p><button class="button button-primary" type="button" data-action="view-cart">View order</button></div>`;
    updateMenu();
    updateCart();
    updateOrders();
  }

  function filteredMenu() {
    const terms = ui.search.toLowerCase().split(/\s+/).filter(Boolean);
    return MENU.filter((item) => (ui.category === "All" || item.category === ui.category) && terms.every((term) => `${item.name} ${item.category} ${item.detail}`.toLowerCase().includes(term)));
  }

  function menuItemMarkup(item) {
    return `<li><button class="menu-item" type="button" data-action="add-item" data-id="${esc(item.id)}" aria-label="Add ${esc(item.name)}, ${formatCurrency(item.price)}, to order"><span class="menu-emoji" aria-hidden="true">${esc(item.emoji)}</span><span class="menu-name">${esc(item.name)}</span><span class="menu-detail">${esc(item.detail)}</span><span class="menu-footer"><span class="menu-price">${formatCurrency(item.price)}</span><span class="menu-add" aria-hidden="true">+ Add</span></span></button></li>`;
  }

  function updateMenu() {
    const grid = document.querySelector("#menu-grid");
    const count = document.querySelector("#menu-count");
    if (!grid || !count) return;
    const items = filteredMenu();
    count.textContent = items.length === MENU.length ? `Showing all ${MENU.length} items` : `Showing ${items.length} of ${MENU.length} items`;
    if (items.length) {
      grid.innerHTML = items.map(menuItemMarkup).join("");
      return;
    }
    const query = ui.search.trim();
    grid.innerHTML = `<li class="menu-empty"><strong>No menu items found</strong><span>${query ? `Nothing matches “${esc(query)}”` : "Nothing in this category"}. Try a different word or category.</span><button class="link-button" type="button" data-action="clear-filters">Clear search and filters</button></li>`;
  }

  function updateCart(focusKeys) {
    const container = document.querySelector("#pos-cart");
    if (!container) return;
    const cart = getState().cart;
    const details = cartDetails(cart);
    const empty = details.lines.length === 0;
    const lines = details.lines.map(({ item, qty, lineCents }) => `<li class="cart-line"><div><span class="cart-line-name">${esc(item.name)}</span><small>${formatCurrency(item.price)} each</small></div><strong class="cart-line-total">${formatCents(lineCents)}</strong><div class="qty-controls" role="group" aria-label="Quantity for ${esc(item.name)}"><button type="button" data-action="dec" data-id="${esc(item.id)}" data-key="dec:${esc(item.id)}" aria-label="Decrease quantity of ${esc(item.name)}" ${qty <= 1 ? "disabled" : ""}>−</button><span class="qty-value" aria-label="Quantity ${qty}">${qty}</span><button type="button" data-action="inc" data-id="${esc(item.id)}" data-key="inc:${esc(item.id)}" aria-label="Increase quantity of ${esc(item.name)}" ${qty >= MAX_QTY ? "disabled" : ""}>+</button></div><button class="remove-button" type="button" data-action="remove" data-id="${esc(item.id)}" data-key="rm:${esc(item.id)}" aria-label="Remove ${esc(item.name)} from order">Remove</button></li>`).join("");
    const typeOptions = ORDER_TYPES.map((type) => `<option value="${esc(type)}" ${type === cart.orderType ? "selected" : ""}>${esc(type)}</option>`).join("");
    container.innerHTML = `<div class="panel-heading"><div><p class="panel-kicker">CURRENT ORDER</p><h2 id="cart-title">Order summary</h2></div><span class="badge badge-neutral">${details.count} item${details.count === 1 ? "" : "s"}</span></div>${empty ? `<p class="cart-empty">Your order is empty. Select menu items to add them here.</p>` : `<ul class="cart-lines">${lines}</ul>`}<div class="pos-fields"><div class="pos-field"><label for="order-type">Order type</label><select id="order-type" data-field="orderType">${typeOptions}</select></div><div class="pos-field"><label for="customer-name">Customer name (optional)</label><input id="customer-name" type="text" maxlength="${MAX_NAME}" autocomplete="off" data-field="customer" value="${esc(cart.customer)}"></div></div>${totalsMarkup(details)}<p class="tax-note">Demo-only ${TAX_PERCENT}% tax rate for illustration. Not a statement about real tax requirements.</p><button class="button button-primary cart-checkout" type="button" data-action="checkout" data-key="checkout" ${empty ? "disabled" : ""}>Checkout (simulated)</button><button class="link-button clear-cart" type="button" data-action="clear-cart" data-key="clear-cart" ${empty ? "disabled" : ""}>Clear order</button>`;
    const bar = document.querySelector("#cart-bar");
    if (bar) {
      bar.hidden = empty;
      document.querySelector("#cart-bar-text").innerHTML = `<strong>${details.count} item${details.count === 1 ? "" : "s"}</strong> · ${formatCents(details.totalCents)}`;
    }
    if (focusKeys) restoreFocus(container, focusKeys, container);
  }

  function summarizeItems(items) {
    const shown = items.slice(0, 3).map((item) => `${item.qty}× ${item.name}`).join(", ");
    return items.length > 3 ? `${shown} +${items.length - 3} more` : shown;
  }

  function orderRowMarkup(order) {
    const step = STATUS_FLOW.indexOf(order.status);
    const progress = STATUS_FLOW.map((name, index) => `<li class="${index <= step ? "done" : ""}"></li>`).join("");
    const label = NEXT_STEP_LABEL[order.status];
    const action = label
      ? `<button class="button button-secondary button-small order-action" type="button" data-action="advance-order" data-id="${esc(order.id)}" data-from="${esc(order.status)}" data-key="adv:${esc(order.id)}" aria-label="${esc(label)} for order ${esc(order.id)}">${esc(label)}</button>`
      : `<span class="order-done"><span aria-hidden="true">✓</span> Completed</span>`;
    return `<li class="order-row"><div class="order-main"><div class="order-title"><strong>#${esc(order.id)}</strong><span class="badge ${statusClass(order.status)}">${esc(order.status)}</span></div><small>${esc(order.channel)} · ${esc(order.customer)} · ${esc(order.date)}</small><ol class="status-steps" aria-hidden="true">${progress}</ol></div><p class="order-items">${order.items ? esc(summarizeItems(order.items)) : "Sample order (no item list)"}</p><strong class="order-total">${formatCurrency(order.total)}</strong>${action}</li>`;
  }

  function updateOrders(focusKeys) {
    const container = document.querySelector("#pos-orders");
    if (!container) return;
    const orders = getState().orders;
    const isActive = (order) => order.status !== "Completed";
    const counts = { active: orders.filter(isActive).length, completed: orders.length - orders.filter(isActive).length, all: orders.length };
    const filtered = orders.filter((order) => ui.orderFilter === "all" || (ui.orderFilter === "active" ? isActive(order) : !isActive(order)));
    const shown = filtered.slice(0, VISIBLE_ORDERS);
    const filters = [["active", "Active"], ["completed", "Completed"], ["all", "All"]].map(([key, name]) => `<button class="chip" type="button" data-action="order-filter" data-filter="${key}" data-key="filter:${key}" aria-pressed="${key === ui.orderFilter}">${name} (${counts[key]})</button>`).join("");
    const emptyText = ui.orderFilter === "completed" ? "No completed orders yet." : ui.orderFilter === "active" ? "No active orders. Place a demo order from the menu to see it here." : "No orders yet. Place a demo order from the menu.";
    container.innerHTML = `<div class="panel-heading"><div><p class="panel-kicker">ORDER QUEUE</p><h2 id="queue-title">Order status</h2></div><div class="category-filters" role="group" aria-label="Filter orders by status">${filters}</div></div>${shown.length ? `<ul class="pos-orders">${shown.map(orderRowMarkup).join("")}</ul>` : `<p class="cart-empty">${emptyText}</p>`}${filtered.length > shown.length ? `<p class="tax-note">Showing the latest ${shown.length} of ${filtered.length} orders.</p>` : ""}`;
    if (focusKeys) restoreFocus(container, focusKeys, container);
  }

  /* ---------- POS actions ---------- */

  function addToCart(id) {
    const item = menuById.get(id);
    if (!item) return;
    const state = getState();
    const line = state.cart.items.find((entry) => entry.id === id);
    if (line && line.qty >= MAX_QTY) {
      showToast(`The most you can add of one item is ${MAX_QTY}.`);
      return;
    }
    if (line) line.qty += 1;
    else state.cart.items.push({ id, qty: 1 });
    saveState(state);
    updateCart();
    const details = cartDetails(state.cart);
    announce(`${item.name} added. ${details.count} items in order, total ${formatCents(details.totalCents)}.`);
  }

  function changeQuantity(id, delta) {
    const state = getState();
    const line = state.cart.items.find((entry) => entry.id === id);
    if (!line) return;
    const next = toQty(line.qty + delta);
    if (next === null || next === line.qty) return;
    line.qty = next;
    saveState(state);
    updateCart([`${delta > 0 ? "inc" : "dec"}:${id}`, `inc:${id}`, `dec:${id}`]);
    announce(`${menuById.get(id).name} quantity ${next}.`);
  }

  function removeFromCart(id) {
    const state = getState();
    const item = menuById.get(id);
    state.cart.items = state.cart.items.filter((entry) => entry.id !== id);
    saveState(state);
    updateCart();
    document.querySelector("#pos-cart")?.focus({ preventScroll: true });
    if (item) announce(`${item.name} removed from order.`);
  }

  function clearCart() {
    const state = getState();
    if (!state.cart.items.length) return;
    state.cart.items = [];
    saveState(state);
    updateCart();
    document.querySelector("#pos-cart")?.focus({ preventScroll: true });
    announce("Order cleared.");
  }

  function startCheckout() {
    const state = getState();
    const details = cartDetails(state.cart);
    if (!details.lines.length) {
      showToast("Add at least one item before checkout.");
      return;
    }
    const lines = details.lines.map(({ item, qty, lineCents }) => `<li><span>${qty}× ${esc(item.name)}</span><span>${formatCents(lineCents)}</span></li>`).join("");
    const who = state.cart.customer ? ` for ${esc(state.cart.customer)}` : "";
    openModal({
      eyebrow: "SIMULATED CHECKOUT",
      title: "Confirm demo checkout",
      bodyHtml: `<p>Review this ${esc(state.cart.orderType.toLowerCase())} order${who}.</p><ul class="modal-lines">${lines}</ul>${totalsMarkup(details)}<p class="modal-note"><strong>Simulation only.</strong> No payment details are requested and no money moves. Confirming creates a sample order in this browser.</p>`,
      confirmLabel: "Place demo order",
      onConfirm: completeCheckout
    });
  }

  function completeCheckout() {
    const state = getState();
    const details = cartDetails(state.cart);
    if (!details.lines.length) {
      showToast("Your order was empty, so no order was created.");
      return null;
    }
    const now = new Date();
    const number = Math.max(1050, ...state.orders.map((order) => parseInt(order.id, 10) || 0)) + 1;
    const order = {
      id: String(number),
      customer: state.cart.customer || "Walk-in guest",
      channel: state.cart.orderType,
      status: "New",
      total: details.totalCents / 100,
      subtotal: details.subtotalCents / 100,
      tax: details.taxCents / 100,
      items: details.lines.map(({ item, qty }) => ({ name: item.name, price: item.price, qty })),
      date: `Today, ${timeLabel(now)}`,
      createdAt: now.toISOString(),
      source: "pos"
    };
    state.orders.unshift(order);
    state.orders = state.orders.slice(0, MAX_ORDERS);
    state.activity.unshift({ icon: "↗", title: `Order #${order.id} was received`, detail: `${order.channel} · ${formatCurrency(order.total)}`, time: "Just now", at: now.toISOString() });
    state.activity = state.activity.slice(0, MAX_ACTIVITY);
    state.cart.items = [];
    state.cart.customer = "";
    saveState(state);
    ui.orderFilter = "active";
    updateCart();
    updateOrders();
    showToast(`Demo order #${order.id} created for ${formatCurrency(order.total)}. No payment was taken.`);
    announce(`Demo order ${order.id} created. Total ${formatCurrency(order.total)}.`);
    return document.querySelector("#pos-cart");
  }

  let lastAdvance = { id: null, at: 0 };

  function advanceOrder(id, from) {
    const state = getState();
    const order = state.orders.find((entry) => entry.id === id);
    if (!order || order.status !== from) return; // ignore stale clicks
    const index = STATUS_FLOW.indexOf(order.status);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return;
    // A fast double-click must not skip a step (the button changes after the first click).
    if (lastAdvance.id === id && Date.now() - lastAdvance.at < 600) return;
    lastAdvance = { id, at: Date.now() };
    order.status = STATUS_FLOW[index + 1];
    const done = order.status === "Completed";
    state.activity.unshift({ icon: done ? "✓" : "◷", title: done ? `Order #${order.id} was completed` : `Order #${order.id} is now ${order.status}`, detail: `${order.channel} · ${formatCurrency(order.total)}`, time: "Just now", at: new Date().toISOString() });
    state.activity = state.activity.slice(0, MAX_ACTIVITY);
    saveState(state);
    updateOrders([`adv:${id}`]);
    showToast(`Order #${order.id} marked ${order.status}.`);
    announce(`Order ${order.id} is now ${order.status}.`);
  }

  /* ---------- Navigation, demo open/close, reset ---------- */

  function setActiveNavigation(view) {
    document.querySelectorAll(".app-nav a").forEach((link) => {
      const isActive = link.getAttribute("href") === `#${view}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function renderCurrentView(focusKeys) {
    if (ui.view === "pos") renderPos();
    else if (ui.view === "dashboard") renderDashboard(ui.range, focusKeys);
    else renderComingSoon(ui.view);
  }

  function navigate(view) {
    const next = VIEW_TITLES[view] ? view : "dashboard";
    if (next !== ui.view) ui.notice = null;
    ui.view = next;
    setActiveNavigation(next);
    if (next === "dashboard") renderDashboard("today");
    else renderCurrentView();
    window.scrollTo(0, 0);
  }

  function openDemo(event) {
    event?.preventDefault();
    lastFocusedElement = document.activeElement;
    document.querySelector("#marketing-site").hidden = true;
    document.querySelector("#demo-app").hidden = false;
    document.body.classList.add("demo-open");
    ui.notice = null;
    ui.view = "dashboard";
    setActiveNavigation("dashboard");
    renderDashboard("today");
    document.querySelector(".app-close").focus();
    window.scrollTo(0, 0);
  }

  function closeDemo() {
    closeActiveModal();
    document.querySelector("#demo-app").hidden = true;
    document.querySelector("#marketing-site").hidden = false;
    document.body.classList.remove("demo-open");
    ui.notice = null;
    (lastFocusedElement || document.querySelector("a[href='#demo']")).focus();
  }

  /* Resetting stays on the current screen, then confirms in two ways: a toast and a
     banner that stays visible until dismissed or until you change screens. */
  function resetData() {
    openModal({
      eyebrow: "DEMO CONTROLS",
      title: "Reset sample data?",
      bodyHtml: `<p>This removes only ServeFlow’s sample records stored in this browser, including demo orders and your current POS order. It does not affect an account or external service.</p>`,
      confirmLabel: "Reset demo data",
      onConfirm: () => {
        saveState(normalizeState(null));
        ui.search = "";
        ui.category = "All";
        ui.orderFilter = "active";
        ui.notice = { message: `Sample data was reset at ${timeLabel(new Date())}.`, detail: "Orders, the POS order, and dashboard figures are back to their original sample values." };
        renderCurrentView();
        showToast("Sample data was reset in this browser.");
        announce("Sample data was reset in this browser.");
        return null;
      }
    });
  }

  /* One click handler for everything inside the app area (it survives re-rendering). */
  function handleMainClick(event) {
    const control = event.target.closest("[data-action]");
    if (!control || !mainEl().contains(control) || control.disabled) return;
    const { action, id } = control.dataset;
    switch (action) {
      case "range": renderDashboard(control.dataset.range, [`range:${control.dataset.range}`]); break;
      case "reset": resetData(); break;
      case "coming-soon": showToast(`${control.dataset.label} is planned for a later phase.`); break;
      case "go-overview": navigate("dashboard"); break;
      case "go-pos": navigate("pos"); break;
      case "dismiss-notice": ui.notice = null; control.closest(".status-banner").remove(); break;
      case "category": {
        ui.category = CATEGORIES.includes(control.dataset.category) ? control.dataset.category : "All";
        document.querySelectorAll("[data-action='category']").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.category === ui.category)));
        updateMenu();
        break;
      }
      case "clear-filters": {
        ui.search = "";
        ui.category = "All";
        const input = document.querySelector("#menu-search");
        if (input) { input.value = ""; input.focus({ preventScroll: true }); }
        document.querySelectorAll("[data-action='category']").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.category === "All")));
        updateMenu();
        break;
      }
      case "add-item": addToCart(id); break;
      case "inc": changeQuantity(id, 1); break;
      case "dec": changeQuantity(id, -1); break;
      case "remove": removeFromCart(id); break;
      case "clear-cart": clearCart(); break;
      case "checkout": startCheckout(); break;
      case "view-cart": {
        const cart = document.querySelector("#pos-cart");
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        cart.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        cart.focus({ preventScroll: true });
        break;
      }
      case "order-filter": {
        ui.orderFilter = ["active", "completed", "all"].includes(control.dataset.filter) ? control.dataset.filter : "active";
        updateOrders([`filter:${ui.orderFilter}`]);
        break;
      }
      case "advance-order": advanceOrder(id, control.dataset.from); break;
      default: break;
    }
  }

  function handleMainInput(event) {
    const field = event.target;
    if (field.id === "menu-search") {
      ui.search = field.value.slice(0, 60);
      updateMenu();
    } else if (field.dataset.field === "customer") {
      const state = getState();
      state.cart.customer = field.value.replace(CONTROL_CHARS, "").slice(0, MAX_NAME);
      saveState(state);
    }
  }

  function handleMainChange(event) {
    const field = event.target;
    if (field.dataset.field === "orderType") {
      const state = getState();
      state.cart.orderType = ORDER_TYPES.includes(field.value) ? field.value : ORDER_TYPES[0];
      saveState(state);
    }
  }

  function initialise() {
    saveState(getState()); // also repairs malformed saved data and upgrades older versions
    renderDashboard("today");
    document.querySelectorAll("[data-open-demo], a[href='#demo'], .cta .button").forEach((control) => control.addEventListener("click", openDemo));
    document.querySelectorAll("[data-close-demo]").forEach((control) => control.addEventListener("click", closeDemo));
    document.querySelectorAll("[data-reset-demo]").forEach((control) => control.addEventListener("click", resetData));
    const main = mainEl();
    main.addEventListener("click", handleMainClick);
    main.addEventListener("input", handleMainInput);
    main.addEventListener("change", handleMainChange);
    document.querySelectorAll(".app-nav a").forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      navigate(link.getAttribute("href").slice(1));
    }));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (activeModal) { closeActiveModal(); return; }
      const target = event.target;
      if (target && target.matches && target.matches("input, select, textarea")) {
        // Escape in a field clears the search instead of closing the whole demo.
        if (target.id === "menu-search" && target.value) { target.value = ""; ui.search = ""; updateMenu(); }
        return;
      }
      if (!document.querySelector("#demo-app").hidden) closeDemo();
    });
  }

  return { initialise, showToast };
})();
