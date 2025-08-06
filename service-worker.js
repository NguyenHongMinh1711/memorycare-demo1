// service-worker.js

// This event listener ensures that the new service worker takes over immediately.
self.addEventListener('install', event => {
  self.skipWaiting();
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
