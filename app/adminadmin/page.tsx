'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const MODULES = [
  { href: '/clients', title: 'לקוחות', desc: 'פרופילים, Client Brain, מנוע רווח, סנכרון' },
  { href: '/performance', title: 'Performance', desc: 'טבלת heatmap עד רווח נטו, scope ו-group-by' },
  { href: '/leads', title: 'לידים', desc: 'ניהול לידים וצינור עדכון CSV פר לקוח' },
];

export default function AdminDashboard() {
  const [status, setStatus] = useState<string>('Checking…');
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { db?: string; error?: string }) => {
        if (data.db === 'connected') {
          setOk(true);
          setStatus('DB connected ✓');
        } else {
          setOk(false);
          setStatus(`DB error: ${data.error ?? 'unknown error'}`);
        }
      })
      .catch((err: unknown) => {
        setOk(false);
        setStatus(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  return (
    <main className="container">
      <div className="row-between">
        <h1>Campaign OS</h1>
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: ok === null ? 'var(--muted)' : ok ? 'var(--ok)' : 'var(--danger)',
          }}
        >
          {status}
        </span>
      </div>

      <div className="module-grid">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="module-card">
            <h3>{m.title} →</h3>
            <p>{m.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
