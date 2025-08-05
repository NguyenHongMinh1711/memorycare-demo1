// A map to hold activity.id -> timeoutId for scheduled notifications
const scheduledNotifications = new Map();

self.addEventListener('install', (event) => {
    console.log('Service Worker installing.');
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating.');
    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (!event.data) return;

    const { type, payload } = event.data;

    if (type === 'SCHEDULE_NOTIFICATIONS') {
        const activities = payload;
        
        // Clear all existing scheduled notifications managed by this worker
        for (const timeoutId of scheduledNotifications.values()) {
            clearTimeout(timeoutId);
        }
        scheduledNotifications.clear();

        activities.forEach(activity => {
            const [hours, minutes] = activity.time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) {
                return;
            }

            const now = new Date();
            const activityTime = new Date();
            activityTime.setHours(hours, minutes, 0, 0);

            // Do not schedule notifications for activities that have already passed today
            if (activityTime.getTime() <= now.getTime()) {
                return;
            }
            
            const delay = activityTime.getTime() - now.getTime();

            const timeoutId = setTimeout(() => {
                self.registration.showNotification(`Reminder: ${activity.name}`, {
                    body: activity.description || `It's time for your scheduled activity.`,
                    icon: '/icon.png', // A generic icon path
                    tag: activity.id // Use tag to prevent duplicate notifications for the same activity
                });
                scheduledNotifications.delete(activity.id);
            }, delay);
            
            scheduledNotifications.set(activity.id, timeoutId);
        });
        
        console.log(`Service Worker: Scheduled ${scheduledNotifications.size} new notifications.`);
    
    } else if (type === 'INSTANT_NOTIFY') {
        const { title, body, tag } = payload;
        self.registration.showNotification(title, {
            body,
            icon: '/icon.png',
            tag: tag || 'instant-notification'
        });
    }
});

// A basic fetch handler to ensure the service worker stays active and can make the app a PWA.
// For a real PWA, this would involve caching strategies.
self.addEventListener('fetch', (event) => {
    // We are not implementing offline caching for this request.
    // Just respond with the network request.
    event.respondWith(fetch(event.request));
});
