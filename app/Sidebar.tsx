'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

type ClientOption = { id: string; name: string };

// תפריט ראשי (מצב "ראשי / כל הלקוחות")
const ITEMS = [
  { href: '/adminadmin', label: 'Dashboard' },
  { href: '/clients', label: 'לקוחות' },
  { href: '/performance', label: 'Performance' },
  { href: '/creatives', label: 'קריאטיבים' },
  { href: '/leads', label: 'לידים' },
];

// תפריט אזור הלקוח (מצב "לקוח נבחר")
const CLIENT_ITEMS = [
  { seg: '', label: 'סקירה' },
  { seg: '/performance', label: 'ביצועים' },
  { seg: '/leads', label: 'לידים' },
  { seg: '/creatives', label: 'קריאטיבים' },
  { seg: '/report', label: 'דוח' },
  { seg: '/settings', label: 'הגדרות' },
];

// נתיבי המערכת (אדמין). '/' = דף נחיתה ציבורי, כל נתיב אחר שאינו כאן = פורטל לקוח — בלי sidebar.
const ADMIN_PREFIXES = ['/adminadmin', '/clients', '/creatives', '/leads', '/performance'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const inPortal = !isAdmin;

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    router.replace('/admin-login');
    router.refresh();
  }

  // מסיר את ההזחה של app-main כשמסתירים את הסיידבר (פורטל)
  useEffect(() => {
    if (inPortal) document.body.classList.add('portal-mode');
    else document.body.classList.remove('portal-mode');
  }, [inPortal]);

  // סגירת המגירה במובייל בעת ניווט
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // טעינת רשימת לקוחות עבור הבורר הגלובלי
  useEffect(() => {
    if (inPortal) return;
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients((d.clients ?? []).map((c: ClientOption) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [inPortal]);

  if (inPortal) return null;

  // זיהוי הלקוח הפעיל מתוך ה-URL: /clients/{id}(/...) — למעט /clients/new
  const clientMatch = pathname.match(/^\/clients\/([^/]+)/);
  const activeClientId = clientMatch && clientMatch[1] !== 'new' ? clientMatch[1] : '';
  const inClientArea = Boolean(activeClientId);
  const activeClient = clients.find((c) => c.id === activeClientId);
  const clientBase = `/clients/${activeClientId}`;

  function onSwitch(value: string) {
    if (value) router.push(`/clients/${value}`);
    else router.push('/adminadmin');
  }

  const isActive = (href: string) =>
    href === '/adminadmin' ? pathname === '/adminadmin' : pathname.startsWith(href);
  const isClientItemActive = (seg: string) =>
    seg === '' ? pathname === clientBase : pathname.startsWith(clientBase + seg);

  return (
    <>
      {/* סרגל עליון — מובייל בלבד (CSS) */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-burger"
          onClick={() => setOpen(true)}
          aria-label="פתח תפריט"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="admin-topbar-brand">Campaign OS</span>
      </header>

      <div
        className={`sidebar-scrim ${open ? 'show' : ''}`.trim()}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? 'open' : ''}`.trim()}>
        <div className="sidebar-brand">Campaign OS</div>

        {/* בורר לקוח גלובלי — בסגנון Facebook Business */}
        <div className="client-switcher">
          <label className="client-switcher-label">אזור עבודה</label>
          <select
            className="select client-switcher-select"
            value={activeClientId}
            onChange={(e) => onSwitch(e.target.value)}
          >
            <option value="">ראשי — כל הלקוחות</option>
            {activeClientId && !activeClient && <option value={activeClientId}>לקוח נבחר</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {inClientArea ? (
          <nav className="sidebar-nav">
            <div className="sidebar-section">{activeClient?.name ?? 'לקוח'}</div>
            {CLIENT_ITEMS.map((it) => (
              <Link
                key={it.seg}
                href={clientBase + it.seg}
                className={isClientItemActive(it.seg) ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                {it.label}
              </Link>
            ))}
            <Link href="/clients" className="sidebar-back" onClick={() => setOpen(false)}>
              ← כל הלקוחות
            </Link>
          </nav>
        ) : (
          <nav className="sidebar-nav">
            {ITEMS.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={isActive(it.href) ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                {it.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="sidebar-foot">
          <ThemeToggle />
          <button type="button" className="sidebar-logout" onClick={logout}>התנתקות</button>
        </div>
      </aside>
    </>
  );
}
