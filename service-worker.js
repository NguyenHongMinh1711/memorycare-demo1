import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup old caches
cleanupOutdatedCaches();

// Runtime caching for assets not in the precache manifest
// Cache fonts and images from CDNs/same-origin with a CacheFirst strategy
registerRoute(
  ({ request, url }) => 
    request.destination === 'font' || 
    request.destination === 'image' || 
    url.hostname === 'i.pravatar.cc',
  new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Stale-while-revalidate for external JS/CSS (like tailwind, esm.sh)
registerRoute(
  ({ request, url }) => 
    (request.destination === 'script' || request.destination === 'style') && 
    url.hostname !== self.location.hostname,
  new StaleWhileRevalidate({
    cacheName: 'static-resources-cache',
     plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

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
