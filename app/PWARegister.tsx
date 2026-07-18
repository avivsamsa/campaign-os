'use client';

import { useEffect } from 'react';

/** רישום ה-service worker (בפרודקשן בלבד — לא מפריע ל-dev/hot-reload). */
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
