/*
 * sw.js — service worker : le site fonctionne hors connexion une fois visité.
 * - Page HTML : réseau d'abord (contenu à jour), cache si hors ligne.
 * - Fichiers du site et polices : cache d'abord, mis à jour en arrière-plan.
 * Changer CACHE vide les anciens caches au prochain chargement.
 */
const CACHE = "mpc-v1";
const FONTS = "mpc-fonts-v1";

const PRECACHE = [
  "./",
  "css/styles.css",
  "js/app.js",
  "js/astro.js",
  "js/moon3d.js",
  "js/moon-svg.js",
  "js/translations.js",
  "assets/moon.jpg",
  "assets/moon-poster.webp",
  "assets/sky-800.webp",
  "assets/favicon.svg",
  "assets/icon-192.png",
  "manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache d'abord, puis mise à jour en arrière-plan. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((res) => { if (res.ok || res.type === "opaque") cache.put(request, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    // ?date=…&lang=… : même page, on sert la version en cache si le réseau manque.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); }
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }
  if (url.origin === location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(request, FONTS));
  }
});
