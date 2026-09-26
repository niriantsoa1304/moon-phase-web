/*
 * physique.js — page « La physique des phases de la Lune » :
 * traductions, menu, sélecteur de langue et schéma interactif de l'orbite.
 */
import { moonPhase, phaseId, SYNODIC_MONTH } from "./astro.js";
import { litPath } from "./moon-svg.js";
import { translations } from "./translations.js";
import { physique } from "./translations-physique.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const LANGS = ["fr", "en"];
const STORE_LANG = "mpc-lang";

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ } },
};

let lang = "fr";

/* Clés « phy.… » : textes de cette page ; les autres viennent des traductions du site. */
function t(key) {
  if (key.startsWith("phy.")) {
    const k = key.slice(4);
    return physique[lang][k] ?? physique.fr[k] ?? key;
  }
  return translations[lang][key] ?? translations.fr[key] ?? key;
}
const num = (x, digits = 1) =>
  new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x);

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (LANGS.includes(fromUrl)) return fromUrl;
  const stored = storage.get(STORE_LANG);
  if (LANGS.includes(stored)) return stored;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "fr";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function applyLang(next) {
  lang = next;
  document.documentElement.lang = lang;
  document.title = t("phy.meta.title");
  $('meta[name="description"]').setAttribute("content", t("phy.meta.description"));
  for (const el of $$("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of $$("[data-i18n-html]")) el.innerHTML = t(el.dataset.i18nHtml); // textes du site uniquement
  for (const el of $$("[data-i18n-aria-label]")) el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  for (const btn of $$(".lang-switch button")) btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  const toggle = $(".menu-toggle");
  toggle.setAttribute("aria-label", t(toggle.getAttribute("aria-expanded") === "true" ? "nav.closeMenu" : "nav.openMenu"));
  demo.render();
}

function initMenu() {
  const toggle = $(".menu-toggle");
  const menu = $("#menu");
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", t(open ? "nav.closeMenu" : "nav.openMenu"));
    $("use", toggle).setAttribute("href", open ? "#i-close" : "#i-menu");
    menu.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
  });
  matchMedia("(min-width: 1200px)").addEventListener("change", () => setOpen(false));
  for (const btn of $$(".lang-switch button")) {
    btn.addEventListener("click", () => { storage.set(STORE_LANG, btn.dataset.lang); applyLang(btn.dataset.lang); });
  }
}

/* ---------- Schéma interactif : vue de dessus et vue depuis la Terre ---------- */
const ORBIT = { cx: 340, cy: 205, r: 140 };
const DAYS_PER_SECOND = 2.5;

const demo = {
  age: 0,
  playing: false,
  raf: 0,
  last: 0,

  init() {
    this.slider = $("#demo-slider");
    this.playBtn = $("#demo-play");
    if (!this.slider) return;
    this.age = moonPhase(new Date()).age;
    this.slider.addEventListener("input", () => { this.stop(); this.age = Number(this.slider.value); this.render(); });
    this.playBtn.addEventListener("click", () => (this.playing ? this.stop() : this.play()));
    $("#demo-today").addEventListener("click", () => { this.stop(); this.age = moonPhase(new Date()).age; this.render(); });
  },

  play() {
    this.playing = true;
    this.last = performance.now();
    $("span", this.playBtn).textContent = t("phy.demo.pause");
    const step = (now) => {
      this.age = (this.age + ((now - this.last) / 1000) * DAYS_PER_SECOND) % SYNODIC_MONTH;
      this.last = now;
      this.render();
      if (this.playing) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  stop() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    if (this.playBtn) $("span", this.playBtn).textContent = t("phy.demo.play");
  },

  render() {
    if (!this.slider) return;
    const elong = (this.age / SYNODIC_MONTH) * 360;          // écart Lune − Soleil, 0–360°
    const i = 180 - (elong <= 180 ? elong : 360 - elong);    // angle de phase (Soleil très lointain)
    const k = (1 + Math.cos((i * Math.PI) / 180)) / 2;
    const waxing = elong < 180;

    // Position sur l'orbite : Soleil à gauche, rotation dans le sens direct vue du nord.
    const phi = ((180 + elong) * Math.PI) / 180;
    const x = ORBIT.cx + ORBIT.r * Math.cos(phi);
    const y = ORBIT.cy - ORBIT.r * Math.sin(phi);
    $("#orbit-moon").setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    $("#sight").setAttribute("x2", x.toFixed(1));
    $("#sight").setAttribute("y2", y.toFixed(1));
    // Demi-cercle pointillé : la moitié de la Lune tournée vers la Terre.
    const toEarth = (Math.atan2(ORBIT.cy - y, ORBIT.cx - x) * 180) / Math.PI;
    $("#visible-arc").setAttribute("transform", `rotate(${(toEarth - 180).toFixed(1)})`);

    $("#view-lit").setAttribute("d", litPath(k, waxing, false));
    $("#demo-phase").textContent = t(`phase.${phaseId(this.age)}`);
    $("#demo-age").textContent = t("unit.days").replace("{n}", num(this.age));
    $("#demo-elong").textContent = `${num(elong <= 180 ? elong : 360 - elong, 0)}°`;
    $("#demo-angle").textContent = `${num(i, 0)}°`;
    $("#demo-ill").textContent = lang === "fr" ? `${num(k * 100, 0)} %` : `${num(k * 100, 0)}%`;
    if (Number(this.slider.value) !== this.age) this.slider.value = this.age.toFixed(2);
  },
};

demo.init();
initMenu();
applyLang(detectLang());
