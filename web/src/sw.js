// Custom Service Worker - PPAM Costa
// Maneja push notifications + precaching

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { NetworkOnly } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';

// Forzar activación inmediata del nuevo SW
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);

// No cachear API
registerRoute(
  ({ url }) => url.hostname === 'ppam-api-5f8l.onrender.com',
  new NetworkOnly()
);

// Push
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); } catch {
      payload = { title: 'PPAM Costa', body: event.data.text() };
    }
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: 'ppam',
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'PPAM Costa', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
