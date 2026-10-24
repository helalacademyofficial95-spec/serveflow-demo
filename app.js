/* Browser-only demo application foundation. No account, payment, or server calls are made. */
window.ServeFlowApp = (function () {
  "use strict";

  const STORAGE_KEY = "serveflow-demo-state";
  let lastFocusedElement;

  const cloneSeed = () => JSON.parse(JSON.stringify(window.ServeFlowSeed));

  function getState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const state = stored ? JSON.parse(stored) : null;
      return state && state.version === window.ServeFlowSeed.version ? state : cloneSeed();
    } catch (error) {
      console.warn("ServeFlow sample data could not be read.", error);
      return cloneSeed();
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn("ServeFlow sample data could not be saved.", error); }
  }

  function showToast(message) {
    const region = document.querySelector("#toast-region");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span aria-hidden="true">✓</span><p>${message}</p><button type="button" aria-label="Dismiss notification">×</button>`;
    const dismiss = () => toast.remove();
    toast.querySelector("button").addEventListener("click", dismiss);
    region.append(toast);
    window.setTimeout(dismiss, 4500);
  }

  const formatCurrency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  function chartMarkup(range) {
    const max = Math.max(...range.points);
    const coordinates = range.points.map((point, index) => {
      const x = (index / (range.points.length - 1)) * 640;
      const y = 170 - ((point / max) * 135);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const labels = range.labels.map((label) => `<span>${label}</span>`).join("");
    return `<div class="sales-chart" aria-label="${range.label} sales chart"><svg viewBox="0 0 640 190" role="img" aria-label="${range.label} sample sales total ${formatCurrency(range.total)}. ${range.comparison}."><defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fa6d5d" stop-opacity=".25"/><stop offset="100%" stop-color="#fa6d5d" stop-opacity="0"/></linearGradient></defs><path d="M0,170 L${coordinates.replace(/ /g, " L")} L640,170 Z" fill="url(#sales-area)"/><polyline points="${coordinates}" fill="none" stroke="#fa6d5d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="chart-labels" aria-hidden="true">${labels}</div></div>`;
  }

  function statusClass(status) {
    return { New: "badge-info", Preparing: "badge-warning", Ready: "badge-success", Completed: "badge-neutral" }[status] || "badge-neutral";
  }

  function renderDashboard(rangeKey = "today") {
    const state = getState();
    const range = state.salesRanges[rangeKey] || state.salesRanges.today;
    const pendingOrders = state.orders.filter((order) => order.status !== "Completed");
    const averageOrderValue = state.orders.reduce((sum, order) => sum + order.total, 0) / state.orders.length;
    const rangeButtons = Object.keys(state.salesRanges).map((key) => `<button class="range-button ${key === rangeKey ? "active" : ""}" type="button" data-range="${key}" aria-pressed="${key === rangeKey}">${state.salesRanges[key].label}</button>`).join("");
    const activity = state.activity.map((entry) => `<li><span class="activity-icon" aria-hidden="true">${entry.icon}</span><div><strong>${entry.title}</strong><small>${entry.detail}</small></div><time>${entry.time}</time></li>`).join("");
    const attention = state.attention.map((entry) => `<li><span class="attention-level">${entry.level}</span><div><strong>${entry.title}</strong><small>${entry.detail}</small></div></li>`).join("");
    const orders = state.orders.map((order) => `<tr><td><strong>#${order.id}</strong><small>${order.channel}</small></td><td>${order.customer}</td><td>${formatCurrency(order.total)}</td><td><span class="badge ${statusClass(order.status)}">${order.status}</span></td><td>${order.date}</td></tr>`).join("");

    document.querySelector(".app-main").innerHTML = `<header class="app-header"><div><p class="kicker">INTERACTIVE PREVIEW</p><h1>Operations overview</h1></div><div class="app-header-actions"><span class="demo-pill">Local demo</span><button class="button button-secondary" type="button" data-reset-demo>Reset data</button></div></header><div class="demo-notice" role="status"><span aria-hidden="true">ⓘ</span><p><strong>Demo data only.</strong> Changes stay in this browser. Payments, accounts, and backend services are not connected.</p></div><section class="overview-metrics" aria-label="Sample operations metrics"><article class="metric-card"><span class="metric-card-icon coral">↗</span><p>Total sales</p><strong>${formatCurrency(range.total)}</strong><small class="trend-positive">${range.comparison}</small></article><article class="metric-card"><span class="metric-card-icon blue">▦</span><p>Order count</p><strong>${state.orders.length}</strong><small>Sample orders today</small></article><article class="metric-card"><span class="metric-card-icon purple">◌</span><p>Average order</p><strong>${formatCurrency(averageOrderValue)}</strong><small>Across visible sample orders</small></article><article class="metric-card"><span class="metric-card-icon orange">◷</span><p>Pending orders</p><strong>${pendingOrders.length}</strong><small>New, preparing, or ready</small></article></section><section class="dashboard-grid"><article class="dashboard-panel sales-panel"><div class="panel-heading"><div><p class="panel-kicker">SAMPLE SALES</p><h2>${formatCurrency(range.total)}</h2><span class="trend-positive">${range.comparison}</span></div><div class="range-selector" aria-label="Sales date range">${rangeButtons}</div></div>${chartMarkup(range)}<p class="chart-summary">Accessible summary: ${range.label} simulated sales total ${formatCurrency(range.total)}, ${range.comparison}.</p></article><article class="dashboard-panel attention-panel"><div class="panel-heading"><div><p class="panel-kicker">NEEDS ATTENTION</p><h2>Keep service moving</h2></div><span class="badge badge-warning">${state.attention.length} items</span></div><ul class="attention-list">${attention}</ul><button class="link-button" type="button" data-coming-soon="Inventory">Review inventory →</button></article></section><section class="dashboard-grid lower-grid"><article class="dashboard-panel activity-panel"><div class="panel-heading"><div><p class="panel-kicker">RECENT ACTIVITY</p><h2>What changed</h2></div></div><ul class="activity-list">${activity}</ul></article><article class="dashboard-panel quick-panel"><p class="panel-kicker">DEMO WORKSPACE</p><h2>Explore your next workflow</h2><p>Food POS, inventory, and reports are staged as separate demo modules. They are not active in this phase.</p><div><button class="button button-primary" type="button" data-coming-soon="Food POS">Food POS <span>→</span></button><button class="button button-secondary" type="button" data-coming-soon="Inventory">Inventory</button></div></article></section><section class="dashboard-panel orders-panel"><div class="panel-heading"><div><p class="panel-kicker">RECENT ORDERS</p><h2>Latest sample orders</h2></div><span class="badge badge-neutral">${state.orders.length} shown</span></div><div class="orders-table-wrap"><table><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Date</th></tr></thead><tbody>${orders}</tbody></table></div></section>`;
    bindDashboardControls();
  }

  function renderComingSoon(moduleName) {
    document.querySelector(".app-main").innerHTML = `<header class="app-header"><div><p class="kicker">INTERACTIVE PREVIEW</p><h1>${moduleName}</h1></div><button class="button button-secondary" type="button" data-reset-demo>Reset data</button></header><div class="demo-notice" role="status"><span aria-hidden="true">ⓘ</span><p><strong>Demo data only.</strong> This workspace does not connect to payments, accounts, or backend services.</p></div><section class="empty-state coming-soon-state"><span class="empty-icon" aria-hidden="true">◌</span><p class="panel-kicker">COMING SOON</p><h2>${moduleName} is not available in Phase 2.</h2><p>The navigation is included to show the planned product structure. This module is intentionally not interactive yet.</p><button class="button button-primary" type="button" data-go-overview>Return to overview</button></section>`;
    bindDashboardControls();
  }

  function setActiveNavigation(view) {
    document.querySelectorAll(".app-nav a").forEach((link) => {
      const isActive = link.getAttribute("href") === `#${view}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function bindDashboardControls() {
    document.querySelectorAll("[data-range]").forEach((button) => button.addEventListener("click", () => renderDashboard(button.dataset.range)));
    document.querySelectorAll("[data-reset-demo]").forEach((button) => button.addEventListener("click", resetData));
    document.querySelectorAll("[data-coming-soon]").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.comingSoon} is planned for a later phase.`)));
    document.querySelectorAll("[data-go-overview]").forEach((button) => button.addEventListener("click", () => { setActiveNavigation("dashboard"); renderDashboard(); }));
  }

  function openDemo(event) {
    event?.preventDefault();
    lastFocusedElement = document.activeElement;
    document.querySelector("#marketing-site").hidden = true;
    document.querySelector("#demo-app").hidden = false;
    document.body.classList.add("demo-open");
    setActiveNavigation("dashboard");
    renderDashboard();
    document.querySelector(".app-close").focus();
    window.scrollTo(0, 0);
  }

  function closeDemo() {
    document.querySelector("#demo-app").hidden = true;
    document.querySelector("#marketing-site").hidden = false;
    document.body.classList.remove("demo-open");
    (lastFocusedElement || document.querySelector("a[href='#demo']")).focus();
  }

  function resetData() {
    const root = document.createElement("div");
    root.className = "modal-root";
    root.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><button class="modal-close" type="button" data-close-modal aria-label="Close dialog">×</button><p class="eyebrow"><span></span> DEMO CONTROLS</p><h2 id="reset-title">Reset sample data?</h2><p>This removes only ServeFlow’s sample records stored in this browser. It does not affect an account or external service.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-close-modal>Cancel</button><button class="button button-primary" type="button" data-confirm-reset>Reset demo data</button></div></section>`;
    document.body.append(root);
    const close = () => root.remove();
    root.querySelectorAll("[data-close-modal]").forEach((control) => control.addEventListener("click", close));
    root.querySelector("[data-confirm-reset]").addEventListener("click", () => {
      saveState(cloneSeed());
      renderDashboard();
      close();
      showToast("Sample data was reset in this browser.");
    });
    root.querySelector(".modal-close").focus();
  }

  function initialise() {
    saveState(getState());
    renderDashboard();
    document.querySelectorAll("[data-open-demo], a[href='#demo'], .cta .button").forEach((control) => control.addEventListener("click", openDemo));
    document.querySelectorAll("[data-close-demo]").forEach((control) => control.addEventListener("click", closeDemo));
    document.querySelectorAll(".app-nav a").forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      const view = link.getAttribute("href").slice(1);
      setActiveNavigation(view);
      if (view === "dashboard") renderDashboard();
      else renderComingSoon(link.textContent.replace("Soon", "").trim());
    }));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = document.querySelector(".modal-root");
      if (modal) { modal.remove(); return; }
      if (!document.querySelector("#demo-app").hidden) closeDemo();
    });
  }

  return { initialise, showToast };
})();
