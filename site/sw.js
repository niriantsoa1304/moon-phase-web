/*
 * sw.js — service worker « de retrait ».
 * Une ancienne version du site installait un service worker qui gardait en cache
 * le CSS et le JavaScript. Le navigateur vérifie régulièrement ce fichier : cette
 * version vide les caches, se désinstalle et recharge les pages ouvertes.
 * À garder tant que des visiteurs peuvent avoir l'ancien service worker.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
