/* SACD-Local · Service Worker
 * Cachea el "app shell" y las librerías para funcionar SIN conexión.
 * Estrategia: cache-first para recursos propios; runtime-cache para el OCR (CDN). */

const CACHE = "sacd-local-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./series-data.js",
  "./classifier.js",
  "./db.js",
  "./app.js",
  "./manifest.webmanifest",
  "./lib/qrcode.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Cachea en tiempo de ejecución (incluye los recursos del OCR desde CDN)
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => hit);
    })
  );
});
