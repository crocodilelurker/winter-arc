const CACHE_NAME = 'growth-arc-v1'
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// Install: pre-cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err)
      })
    }).then(() => self.skipWaiting()),
  )
})

// Activate: clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        }),
      )
    }).then(() => self.clients.claim()),
  )
})

// Fetch: offline-first with network fallback for assets, network-first for navigation
self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only handle GET requests
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Ignore chrome extensions or non-http protocols
  if (!url.protocol.startsWith('http')) return

  // Navigation requests (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return networkRes
        })
        .catch(async () => {
          const cached = await caches.match(req)
          if (cached) return cached
          return caches.match('/index.html')
        }),
    )
    return
  }

  // Static assets (CSS, JS, Fonts, Images)
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // Return cached, update in background
          fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(req, res))
              }
            })
            .catch(() => {})
          return cached
        }
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
      }),
    )
  }
})
