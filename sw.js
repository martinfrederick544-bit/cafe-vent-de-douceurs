/* sw.js — Café Vent de douceurs express */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch(e) { try { data = { body: event.data ? event.data.text() : '' }; } catch { data = {}; } }
  const title = data.title || 'Café Vent de douceurs express';
  const body = data.body || 'Nouvelle notification';
  const url = data.url || '/';
  const options = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url, raw: data },
    vibrate: [100, 50, 100],
    tag: data.tag || undefined,
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const cUrl = new URL(client.url);
        const tUrl = new URL(url, self.location.origin);
        if (cUrl.origin === tUrl.origin) {
          await client.focus();
          if ('navigate' in client) await client.navigate(tUrl.href);
          else client.postMessage({ type: 'NAVIGATE', url: tUrl.pathname + tUrl.search + tUrl.hash });
          return;
        }
      } catch(e) {}
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('message', () => {});
