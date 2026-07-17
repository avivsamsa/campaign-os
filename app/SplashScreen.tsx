'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// נתיבי אדמין — רק בהם מציגים את מסך הטעינה (לא בדף הנחיתה / פורטל).
const ADMIN_PREFIXES = ['/adminadmin', '/clients', '/creatives', '/leads', '/performance'];

// מסך טעינה שמופיע כשנכנסים למערכת (אחרי התחברות), ואז נעלם וחושף את האדמין.
// מוצג פעם אחת לכל כניסה (session) כדי לא להופיע בכל ניווט פנימי.
export default function SplashScreen() {
  const pathname = usePathname();
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('campaign-os:entered')) return;

    sessionStorage.setItem('campaign-os:entered', '1');
    setShow(true);

    const fadeTimer = setTimeout(() => setLeaving(true), 1400);
    const hideTimer = setTimeout(() => setShow(false), 1800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [isAdmin]);

  if (!show) return null;

  return (
    <div className={`splash${leaving ? ' splash--leaving' : ''}`} role="status" aria-live="polite">
      <div className="splash-inner">
        <div className="splash-brand">Campaign OS</div>
        <div className="splash-spinner" aria-hidden="true" />
        <div className="splash-label">טוען את המערכת…</div>
      </div>
    </div>
  );
}
