// Zad's web app used to install a service worker at ./sw.js (scope ./).
// The web app has been retired. This replacement worker removes itself and every cache,
// then reloads open pages so they show the current site from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(clients.map(c => c.navigate(c.url).catch(() => {})));
  })());
});
