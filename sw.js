/**
 * P5 Dashboard Service Worker
 * WP-9-5: PWA Support
 *
 * Features:
 * - Offline caching with Cache-First strategy
 * - Background sync for pending updates
 * - Push notification support (future)
 */

const CACHE_NAME = 'p5-dashboard-v1';
const STATIC_CACHE = 'p5-static-v1';
const DATA_CACHE = 'p5-data-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/components.css',
  './css/variables.css',
  './data/master_config.json'
];

// External CDN resources
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.0/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Cache CDN assets separately (may fail if offline)
        return caches.open(CACHE_NAME)
          .then((cache) => {
            return Promise.allSettled(
              CDN_ASSETS.map(url =>
                cache.add(url).catch(err => {
                  console.warn('[SW] Failed to cache CDN asset:', url, err);
                })
              )
            );
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old version caches
              return name.startsWith('p5-') &&
                     name !== CACHE_NAME &&
                     name !== STATIC_CACHE &&
                     name !== DATA_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Google Apps Script API calls (always network)
  if (url.hostname === 'script.google.com' ||
      url.hostname === 'script.googleusercontent.com') {
    return;
  }

  // Handle different resource types
  if (request.destination === 'document' ||
      url.pathname.endsWith('.html')) {
    // HTML - Network first, cache fallback
    event.respondWith(networkFirst(request, STATIC_CACHE));
  } else if (url.pathname.includes('/data/') ||
             url.pathname.endsWith('.json')) {
    // JSON data - Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
  } else if (request.destination === 'script' ||
             request.destination === 'style' ||
             url.pathname.endsWith('.css') ||
             url.pathname.endsWith('.js')) {
    // Static assets - Cache first
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.destination === 'image') {
    // Images - Cache first
    event.respondWith(cacheFirst(request, CACHE_NAME));
  } else {
    // Default - Network first
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

/**
 * Cache-First Strategy
 * Best for: Static assets that don't change often
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-First Strategy
 * Best for: HTML pages, dynamic content
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for HTML
    if (request.destination === 'document') {
      return cache.match('./index.html');
    }

    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale-While-Revalidate Strategy
 * Best for: Data that can be slightly outdated
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Background Sync for offline updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-updates') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncPendingUpdates());
  }
});

async function syncPendingUpdates() {
  // Get pending updates from IndexedDB
  // Send to server when online
  console.log('[SW] Syncing pending updates...');
}

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update available',
    icon: './assets/icons/icon-192x192.png',
    badge: './assets/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'P5 Dashboard', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Message handler for cache control
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(
          names.filter(n => n.startsWith('p5-')).map(n => caches.delete(n))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
