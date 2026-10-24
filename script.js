/* Global interface behavior. Application state and rendering live in app.js. */
(function () {
  "use strict";
  const THEME_KEY = "serveflow-theme";

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); }
    catch (error) { return null; }
  }

  function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem(THEME_KEY, nextTheme); }
    catch (error) { console.warn("Theme preference could not be saved.", error); }
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", nextTheme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".site-nav");
    applyTheme(readTheme() || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
    navigation.querySelectorAll("a, button").forEach((link) => link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")));
    document.querySelector("#year").textContent = new Date().getFullYear();
    window.ServeFlowApp.initialise();
  });
})();
