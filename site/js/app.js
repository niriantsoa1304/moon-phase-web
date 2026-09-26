/*
 * app.js — calculateur, Lune, traductions et petites interactions de la page.
 */
import { moonPhase, nextPrincipalPhase, PHASES, phaseId } from "./astro.js";
import { litPath, darkPath } from "./moon-svg.js";
import { translations } from "./translations.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const LANGS = ["fr", "en"];
const STORE_LANG = "mpc-lang";
const STORE_SOUTH = "mpc-south";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* Illumination représentative de chaque carte de phase (dessin des petites lunes). */
const CARD_SHAPES = {
  new: [0, true], waxingCrescent: [0.25, true], firstQuarter: [0.5, true], waxingGibbous: [0.8, true],
  full: [1, true], waningGibbous: [0.8, false], lastQuarter: [0.5, false], waningCrescent: [0.25, false],
};

/* Fuseaux horaires de l'hémisphère sud (Madagascar compris). */
const SOUTH_TZ = /^(Australia|Antarctica)\/|^Indian\/(Antananarivo|Mauritius|Reunion|Mayotte|Comoro|Kerguelen)|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate|Port_Moresby|Guadalcanal|Tahiti|Rarotonga|Easter|Pago_Pago|Nauru|Funafuti|Wallis|Norfolk|Galapagos)|^America\/(Sao_Paulo|Argentina\/|Buenos_Aires|Santiago|Punta_Arenas|Montevideo|Asuncion|La_Paz|Lima|Bahia|Recife|Fortaleza|Belem|Maceio|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Manaus|Araguaina|Santarem|Noronha|Guayaquil)|^Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Luanda|Lubumbashi|Blantyre|Dar_es_Salaam|Kinshasa|Brazzaville|Kigali|Bujumbura|Libreville)|^Asia\/(Jakarta|Makassar|Jayapura|Dili)|^Atlantic\/(St_Helena|Stanley|South_Georgia)/;

const timeZone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; }
})();

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* stockage indisponible */ } },
};

const state = {
  lang: "fr",
  date: "",
  south: false,
  moon3d: null,
  data: null,
};

/* ---------- Dates ---------- */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => toISO(new Date());
/* Midi heure locale du visiteur (converti en UTC par l'objet Date). */
function localNoon(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(2000, m - 1, d, 12);
  date.setFullYear(y);
  return date;
}
function addDays(iso, n) {
  const d = localNoon(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
const isValidISO = (iso) => ISO_DATE.test(iso || "") && !Number.isNaN(localNoon(iso).getTime())
  && toISO(localNoon(iso)) === iso && iso >= "1900-01-01" && iso <= "2199-12-31";

/* ---------- Traductions ---------- */
function t(key, vars) {
  let s = translations[state.lang][key] ?? translations.fr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
const locale = () => (state.lang === "fr" ? "fr-FR" : "en-GB");
const num = (x, digits = 1) =>
  new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x);
const fmtPercent = (x) => (state.lang === "fr" ? `${num(x)} %` : `${num(x)}%`);
const fmtDegrees = (x) => `${num(x)}°`;
const fmtDays = (x) => t("unit.days", { n: num(x) });
const fmtLongDate = (d) =>
  new Intl.DateTimeFormat(state.lang === "fr" ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
function fmtMoment(d) {
  const date = new Intl.DateTimeFormat(locale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(d);
  return t("unit.at", { date, time });
}

function detectLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (LANGS.includes(fromUrl)) return fromUrl;
  const stored = storage.get(STORE_LANG);
  if (LANGS.includes(stored)) return stored;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "fr";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function applyLang(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  document.title = t("meta.title");
  $('meta[name="description"]').setAttribute("content", t("meta.description"));
  for (const el of $$("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of $$("[data-i18n-aria-label]")) el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  for (const btn of $$(".lang-switch button")) btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  const toggle = $(".menu-toggle");
  toggle.setAttribute("aria-label", t(toggle.getAttribute("aria-expanded") === "true" ? "nav.closeMenu" : "nav.openMenu"));
  renderPhaseRanges();
  if (state.date) render({ announce: false });
}

/* ---------- Cartes des phases ---------- */
function renderPhaseRanges() {
  for (const card of $$(".phase-card")) {
    const p = PHASES.find((ph) => ph.id === card.dataset.phase);
    const short = (x) => num(x, x % 1 ? 1 : 0);
    const from = p.id === "new" ? 0 : p.from;
    const range = `${short(from)} – ${t("unit.days", { n: short(p.to) })}`;
    $(".phase-card-range", card).textContent = range;
    card.setAttribute("aria-label", t("phases.goto", { phase: t(`phase.${p.id}`), range }));
  }
}

function renderPhaseIcons() {
  for (const card of $$(".phase-card")) {
    const [k, waxing] = CARD_SHAPES[card.dataset.phase];
    $(".phase-moon path", card).setAttribute("d", litPath(k, waxing, state.south));
  }
}

/* Premier jour, après la date affichée, où commence la phase demandée. */
function nextDateOfPhase(target) {
  let prev = phaseId(moonPhase(localNoon(state.date)).age);
  let iso = state.date;
  for (let i = 0; i < 62; i++) {
    iso = addDays(iso, 1);
    const cur = phaseId(moonPhase(localNoon(iso)).age);
    if (cur === target && prev !== target) return iso;
    prev = cur;
  }
  return null;
}

/* ---------- Rendu du calculateur ---------- */
let liveTimer = 0;

function render({ announce = true } = {}) {
  const noon = localNoon(state.date);
  const d = moonPhase(noon);
  state.data = d;
  const phaseName = t(`phase.${d.phase}`);
  const ill = fmtPercent(d.illumination);

  $("#date").value = state.date;
  $("#ill-value").textContent = ill;
  $("#ill-bar").style.width = `${d.illumination.toFixed(1)}%`;
  $("#angle-value").textContent = fmtDegrees(d.phaseAngle);
  $("#age-value").textContent = fmtDays(d.age);
  $("#phase-name").textContent = phaseName;
  $("#phase-date").textContent = fmtLongDate(noon);
  $("#next-full").textContent = fmtMoment(nextPrincipalPhase(noon, 180));
  $("#next-new").textContent = fmtMoment(nextPrincipalPhase(noon, 0));
  $("#calc-note").textContent = t("calc.note", { tz: timeZone.replaceAll("_", " ") });

  for (const card of $$(".phase-card")) {
    if (card.dataset.phase === d.phase) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  }

  renderMoon(d, phaseName, ill);

  if (announce) {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      $("#live").textContent = t("calc.live", {
        date: fmtLongDate(noon), phase: phaseName, ill, angle: fmtDegrees(d.phaseAngle), age: fmtDays(d.age),
      });
    }, 500);
  }

  const url = new URL(location.href);
  url.searchParams.set("date", state.date);
  url.searchParams.set("lang", state.lang);
  history.replaceState(null, "", url);
}

function renderMoon(d, phaseName, ill) {
  const box = $(".moon-box");
  const k = d.illumination / 100;
  $(".moon-shade path").setAttribute("d", darkPath(k, d.waxing, state.south));
  box.classList.toggle("is-south", state.south);

  const poster = $(".moon-poster");
  const canvas = $(".moon-canvas");
  const label = t("moon.aria", { phase: phaseName, ill });
  if (state.moon3d) {
    // Direction du Soleil vue depuis la Lune, déduite de l'angle de phase réel.
    const theta = d.waxing ? 180 - d.phaseAngle : 180 + d.phaseAngle;
    state.moon3d.setPhase(theta / 360);
    state.moon3d.setSouth(state.south);
    canvas.setAttribute("aria-label", label);
    poster.alt = "";
  } else {
    poster.alt = t("moon.imgAlt", { phase: phaseName, ill });
  }
}

function setDate(iso) {
  if (!isValidISO(iso)) return;
  state.date = iso;
  render();
}

/* ---------- Lune 3D (chargée après le premier affichage) ---------- */
async function startMoon3D() {
  const canvas = $(".moon-canvas");
  const { createMoon3D } = await import("./moon3d.js");
  const moon = createMoon3D(canvas, {
    texture: "assets/moon.jpg",
    onReady: () => $(".moon-box").classList.add("is-3d"),
  });
  if (!moon) { canvas.hidden = true; return; } // pas de WebGL : on garde la Lune fixe + ombre SVG
  state.moon3d = moon;
  render({ announce: false });
}

/* ---------- Interactions ---------- */
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
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
}

function flash(el, text, ms = 2200) {
  el.textContent = text;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ""; }, ms);
}

function initControls() {
  const input = $("#date");
  input.addEventListener("change", () => setDate(input.value));
  $("#prev-day").addEventListener("click", () => setDate(addDays(state.date, -1)));
  $("#next-day").addEventListener("click", () => setDate(addDays(state.date, 1)));
  for (const b of $$("[data-today]")) b.addEventListener("click", () => setDate(todayISO()));

  // Raccourci T (comme dans l'application) : revenir à aujourd'hui.
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "t" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    setDate(todayISO());
  });

  for (const card of $$(".phase-card")) {
    card.addEventListener("click", () => {
      const iso = nextDateOfPhase(card.dataset.phase);
      if (iso) {
        setDate(iso);
        $("#calculateur").scrollIntoView({ block: "start" });
      }
    });
  }

  const south = $("#south");
  south.checked = state.south;
  south.addEventListener("change", () => {
    state.south = south.checked;
    storage.set(STORE_SOUTH, state.south ? "1" : "0");
    renderPhaseIcons();
    render({ announce: false });
  });

  for (const btn of $$(".lang-switch button")) {
    btn.addEventListener("click", () => {
      storage.set(STORE_LANG, btn.dataset.lang);
      applyLang(btn.dataset.lang);
    });
  }

  $("#share").addEventListener("click", async () => {
    const ok = await copyText(location.href);
    flash($("#share-status"), t(ok ? "calc.copied" : "calc.copyFailed"));
  });

  const copyBtn = $("#copy-code");
  copyBtn.addEventListener("click", async () => {
    const code = $(".code code").cloneNode(true);
    for (const p of $$(".p", code)) p.remove();
    if (!(await copyText(code.textContent.trim()))) return;
    const label = $("span", copyBtn);
    label.textContent = t("install.copied");
    copyBtn.classList.add("is-done");
    setTimeout(() => { label.textContent = t("install.copy"); copyBtn.classList.remove("is-done"); }, 2000);
  });
}

/* ---------- Application installable (PWA) ---------- */
function initInstall() {
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}), { once: true });
  }

  const installBtn = $("#install");
  const downloadBtn = $(".hero-cta .download-btn");
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const touch = matchMedia("(pointer: coarse)").matches;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let deferredPrompt = null;

  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; });
  addEventListener("appinstalled", () => { deferredPrompt = null; installBtn.hidden = true; });

  // Sur ordinateur, on garde le téléchargement de l'application Python.
  if (!touch) return;
  downloadBtn.hidden = true; // l'application Python ne tourne pas sur téléphone
  if (standalone) return;    // déjà installée
  installBtn.hidden = false;

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      return;
    }
    // iPhone / navigateurs sans invite d'installation : on explique la marche à suivre.
    const dialog = $("#install-help");
    $("#install-help-text").textContent = t(isIOS ? "pwa.ios" : "pwa.other");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else alert($("#install-help-text").textContent);
  });
}

/* ---------- Démarrage ---------- */
function init() {
  const params = new URLSearchParams(location.search);
  const storedSouth = storage.get(STORE_SOUTH);
  state.south = storedSouth === null ? SOUTH_TZ.test(timeZone) : storedSouth === "1";
  const fromUrl = params.get("date");
  state.date = isValidISO(fromUrl) ? fromUrl : todayISO();

  initMenu();
  initControls();
  initInstall();
  renderPhaseIcons();
  applyLang(detectLang()); // appelle render()

  const start = () => startMoon3D().catch(() => { $(".moon-canvas").hidden = true; });
  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
}

init();
