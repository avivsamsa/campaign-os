/* Campaign OS — service worker קליל.
   מטרה: התקנה (PWA / הוסף למסך הבית) + נפילה חיננית ל-offline.
   מדיניות: network-first לניווטים (תוכן תמיד עדכני), עם fallback ל-offline.html. */
const CACHE = 'campaign-os-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // רק ניווטי דפים — לא נוגעים ב-API/נכסים (נשארים network כרגיל)
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});
