// service-worker.js

const CACHE_NAME = 'memorycare-cache-v2'; // Bump version for update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/maskable-icon-512x512.png',
  // The main entry point script
  '/index.tsx',
  // Key CDN resources for basic offline functionality
  'https://cdn.tailwindcss.com'
];

// Install event: open a cache and add the core assets to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Using addAll for atomicity. If one fails, the whole install fails.
        // This is generally safer to ensure a consistent cache state.
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
      .catch(error => {
          console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Take control of all pages
  );
});

// Fetch event: serve assets from cache or network.
self.addEventListener('fetch', event => {
    // We only want to handle GET requests.
    if (event.request.method !== 'GET') {
      return;
    }
  
    // Use a "stale-while-revalidate" strategy for most assets.
    // This provides a fast response from cache, while updating it in the background.
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // If we got a valid response, cache it and return it.
            // Don't cache API calls to Gemini or other dynamic services
            if (networkResponse && networkResponse.status === 200 && !event.request.url.includes('generativelanguage.googleapis.com')) {
               cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
  
          // Return the cached response if it exists, otherwise wait for the network response.
          return cachedResponse || fetchPromise;
        }).catch(error => {
            // This is a fallback for when both cache and network fail.
            // For navigation requests, we can serve an offline page.
            console.error('Fetch failed; letting browser handle it.', error);
        });
      })
    );
  });
  

// This event listener handles clicks on notifications.
self.addEventListener('notificationclick', event => {
  // Close the notification pop-up.
  event.notification.close();

  // Get the URL to open from the data property of the notification.
  // Fallback to the root URL if no URL is specified.
  const urlToOpen = event.notification.data.url || '/';

  // This function ensures that if a window with the app is already open,
  // we focus on it. Otherwise, we open a new window.
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if a window with the target URL is already open.
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // The URL might have a hash, so we check if the client URL includes the base URL to open.
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
