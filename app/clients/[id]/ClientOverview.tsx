'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MetricsResult } from '@/lib/metrics';

type Props = { clientId: string; currency?: string | null };

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type Kpi = { label: string; value: string };

export default function ClientOverview({ clientId, currency }: Props) {
  const since = isoDaysAgo(29);
  const until = isoDaysAgo(0);

  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ client_id: clientId, group_by: 'day', since, until });
    fetch(`/api/metrics?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setError(d.error);
        else setMetrics(d as MetricsResult);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [clientId, since, until]);

  const cur = currency || '';
  const money = (n: number) => `${nf2.format(n)}${cur ? ' ' + cur : ''}`;
  const r = metrics?.rollup;

  const kpis: Kpi[] = r
    ? [
        { label: 'הוצאה', value: money(r.spend) },
        { label: 'לידים', value: nf0.format(r.leads) },
        { label: 'עלות לליד (CPL)', value: r.cpl != null ? money(r.cpl) : '—' },
        { label: 'עסקאות סגורות', value: nf0.format(r.closes) },
        { label: 'הכנסה', value: money(r.revenue) },
        { label: 'קליקים', value: nf0.format(r.clicks) },
        { label: 'CTR', value: `${nf2.format(r.ctr)}%` },
        { label: 'CPM', value: money(r.cpm) },
        ...(metrics?.formula_columns ?? []).map((fc) => {
          const v = r.computed?.[fc.key];
          return { label: fc.label, value: v != null ? nf2.format(v) : '—' };
        }),
      ]
    : [];

  const links = [
    { href: `/clients/${clientId}/performance`, title: 'ביצועים', desc: 'טבלת Performance מלאה, scope וקיבוץ' },
    { href: `/clients/${clientId}/leads`, title: 'לידים', desc: 'ניהול הלידים של הלקוח' },
    { href: `/clients/${clientId}/creatives`, title: 'קריאטיבים', desc: 'ספריית הקריאטיבים והביצועים' },
    { href: `/clients/${clientId}/settings`, title: 'הגדרות', desc: 'Brain, מנוע רווח, קטגוריות, סנכרון, פורטל' },
  ];

  return (
    <>
      <div className="overview-sub">30 הימים האחרונים · {since} — {until}</div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <div className="card muted">טוען נתונים…</div>
      ) : (
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>ניווט מהיר</h2>
      <div className="module-grid">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="module-card">
            <h3>{l.title} →</h3>
            <p>{l.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
