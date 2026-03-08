/* ============================================
   FitQuest — Service Worker
   Offline caching + Push notifications
   ============================================ */

const CACHE_NAME = 'fitquest-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/onboarding.html',
  '/dashboard.html',
  '/challenges.html',
  '/plan.html',
  '/calories.html',
  '/progress.html',
  '/leaderboard.html',
  '/badges.html',
  '/profile.html',
  '/exercises.html',
  '/css/style.css',
  '/js/db.js',
  '/js/app.js',
  '/js/gamification.js',
  '/js/auth.js',
  '/js/onboarding.js',
  '/js/dashboard.js',
  '/js/challenges.js',
  '/js/plan.js',
  '/js/calories.js',
  '/js/progress.js',
  '/js/leaderboard.js',
  '/js/badges.js',
  '/js/profile.js',
  '/js/exercises.js',
  '/manifest.json'
];

/* ---------- Install: Cache static assets ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // If some assets fail, cache what we can
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
        );
      });
    })
  );
  self.skipWaiting();
});

/* ---------- Activate: Clean old caches ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ---------- Fetch: Cache-first for static, network-first for dynamic ---------- */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline fallback for HTML pages
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/dashboard.html');
          }
        });
      })
    );
  } else {
    // Network-first for external resources (CDNs)
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});

/* ---------- Push Notification Handler ---------- */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FitQuest Reminder 💪';
  const options = {
    body: data.body || "Don't break your streak! Log your workout or meal for today.",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/dashboard.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---------- Notification Click ---------- */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard.html')
  );
});
