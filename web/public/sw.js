// Gameland Service Worker — network-first, offline fallback to cached shell
const CACHE = 'gameland-v1'
const SHELL = ['/', '/leaderboard']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE)
            .then(c => c.put(e.request, clone))
            .catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(e.request)
          .then(r => r || caches.match('/'))
          .then(r => r || new Response('offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }))
      )
  )
})
