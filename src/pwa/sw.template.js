// src/pwa/sw.template.js
// Service worker template. integrations/service-worker.mjs fills in VERSION and PRECACHE at build time.
//
// Strategies:
//   pages (navigations)   network first, then cache, then /offline/
//   /_astro/* (hashed)    cache first; these files never change once published
//   everything else       stale-while-revalidate
const VERSION = '__VERSION__';
const PRECACHE = /* __PRECACHE__ */ [];

const PREFIX = 'gj-';
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const RUNTIME_CACHE = `${PREFIX}runtime`;
const OFFLINE_URL = '/offline/';
const RUNTIME_LIMIT = 60;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

/** Keep the runtime cache bounded so it never grows without limit */
async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - RUNTIME_LIMIT)).map((key) => cache.delete(key)));
}

async function handleNavigation(event) {
  const { request } = event;
  try {
    const response = (await event.preloadResponse) || (await fetch(request));
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
        await trim(cache);
      }
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
  } else if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname !== '/sw.js') {
    event.respondWith(staleWhileRevalidate(event));
  }
});
