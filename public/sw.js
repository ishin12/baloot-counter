const CACHE_NAME = 'baloot-counter-v5'
const BASE_PATH = new URL('./', self.location.href).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([BASE_PATH, `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}icon.svg`])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(() => (event.request.mode === 'navigate' ? caches.match(BASE_PATH) : cached))
      return cached || network
    }),
  )
})
