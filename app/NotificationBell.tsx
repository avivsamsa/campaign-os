'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Alert = {
  clientId: string;
  name: string;
  kind: 'payment' | 'disabled' | 'review';
  message: string;
  status: number;
};

const POLL_MS = 5 * 60 * 1000; // בדיקה חיה כל 5 דקות + בכל פוקוס

export default function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch('/api/account-alerts');
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.alerts)) setAlerts(d.alerts as Alert[]);
    } catch {
      /* שקט */
    }
  }

  useEffect(() => {
    load();
    const iv = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const count = alerts.length;

  return (
    <div className="notif" ref={ref}>
      <button
        type="button"
        className={`notif-bell ${count > 0 ? 'has-alerts' : ''}`.trim()}
        onClick={() => setOpen((o) => !o)}
        aria-label={`התראות${count > 0 ? ` (${count})` : ''}`}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && <span className="notif-badge">{count}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">התראות חשבונות</div>
          {count === 0 ? (
            <div className="notif-empty">אין התראות — כל החשבונות תקינים ✓</div>
          ) : (
            <div className="notif-list">
              {alerts.map((a) => (
                <Link
                  key={a.clientId}
                  href={`/clients/${a.clientId}`}
                  className={`notif-item notif-${a.kind}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="notif-dot" aria-hidden="true" />
                  <span className="notif-text">
                    <b>{a.name}</b>
                    <span>{a.message}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
