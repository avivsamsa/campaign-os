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

const PERIODS = [
  { days: 7, label: '7 ימים' },
  { days: 30, label: '30 יום' },
  { days: 90, label: '90 יום' },
];

type Kpi = { label: string; value: string; accent?: boolean };

export default function ClientOverview({ clientId, currency }: Props) {
  // days = null → טווח מותאם אישית
  const [days, setDays] = useState<number | null>(30);
  const [customSince, setCustomSince] = useState(isoDaysAgo(29));
  const [customUntil, setCustomUntil] = useState(isoDaysAgo(0));

  const rawSince = days === null ? customSince : isoDaysAgo(days - 1);
  const rawUntil = days === null ? customUntil : isoDaysAgo(0);
  // אם המשתמש הפך את הסדר — מנרמלים כדי לא לשלוח טווח ריק
  const since = rawSince <= rawUntil ? rawSince : rawUntil;
  const until = rawSince <= rawUntil ? rawUntil : rawSince;

  const rangeLabel =
    days === null ? 'טווח מותאם' : PERIODS.find((p) => p.days === days)?.label ?? `${days} ימים`;

  function pickCustom() {
    // פותחים את הטווח המותאם מהטווח שמוצג כרגע
    setCustomSince(since);
    setCustomUntil(until);
    setDays(null);
  }

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

  // רווח: קודם נוסחת רווח ממנוע הרווח של הלקוח (key/label מכיל profit/רווח);
  // בהיעדרה — אומדן = הכנסה − הוצאה.
  const cols = metrics?.formula_columns ?? [];
  const profitCol = cols.find((fc) => /profit|רווח/i.test(fc.key) || /profit|רווח/i.test(fc.label));
  const profitVal =
    r && profitCol && r.computed?.[profitCol.key] != null
      ? (r.computed[profitCol.key] as number)
      : r
        ? r.revenue - r.spend
        : null;
  const profitLabel = profitCol ? profitCol.label : 'רווח (אומדן)';
  // שאר עמודות הנוסחה — בלי עמודת הרווח שכבר מוצגת בנפרד
  const otherCols = cols.filter((fc) => fc.key !== profitCol?.key);

  const kpis: Kpi[] = r
    ? [
        { label: 'הוצאה', value: money(r.spend) },
        { label: 'לידים', value: nf0.format(r.leads) },
        { label: 'עלות לליד (CPL)', value: r.cpl != null ? money(r.cpl) : '—' },
        { label: 'עסקאות סגורות', value: nf0.format(r.closes) },
        { label: 'הכנסה', value: money(r.revenue) },
        { label: profitLabel, value: profitVal != null ? money(profitVal) : '—', accent: true },
        { label: 'קליקים', value: nf0.format(r.clicks) },
        { label: 'CTR', value: `${nf2.format(r.ctr)}%` },
        { label: 'CPM', value: money(r.cpm) },
        ...otherCols.map((fc) => {
          const v = r.computed?.[fc.key];
          return { label: fc.label, value: v != null ? nf2.format(v) : '—' };
        }),
      ]
    : [];

  const rangeQs = `?since=${since}&until=${until}`;
  const links = [
    { href: `/clients/${clientId}/performance${rangeQs}`, title: 'ביצועים', desc: 'טבלת Performance מלאה, scope וקיבוץ' },
    { href: `/clients/${clientId}/leads`, title: 'לידים', desc: 'ניהול הלידים של הלקוח' },
    { href: `/clients/${clientId}/creatives`, title: 'קריאטיבים', desc: 'ספריית הקריאטיבים והביצועים' },
    { href: `/clients/${clientId}/report${rangeQs}`, title: 'דוח', desc: 'ייצוא דוח לפי פילוח (כללי/קטגוריה/מודעה…)' },
    { href: `/clients/${clientId}/settings`, title: 'הגדרות', desc: 'Brain, מנוע רווח, קטגוריות, סנכרון, פורטל' },
  ];

  return (
    <>
      <div className="overview-range">
        <div className="period-toggle">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              className={`period-btn ${days === p.days ? 'active' : ''}`}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
          <button className={`period-btn ${days === null ? 'active' : ''}`} onClick={pickCustom}>
            מותאם אישית
          </button>
        </div>

        {days === null && (
          <div className="overview-range-dates">
            <input
              className="input input-sm"
              type="date"
              value={customSince}
              max={isoDaysAgo(0)}
              onChange={(e) => setCustomSince(e.target.value)}
              aria-label="מתאריך"
            />
            <span className="muted">—</span>
            <input
              className="input input-sm"
              type="date"
              value={customUntil}
              max={isoDaysAgo(0)}
              onChange={(e) => setCustomUntil(e.target.value)}
              aria-label="עד תאריך"
            />
          </div>
        )}
      </div>

      <div className="overview-sub">{rangeLabel} · {since} — {until}</div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <div className="card muted">טוען נתונים…</div>
      ) : (
        <div className="kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className={`kpi-card${k.accent ? ' kpi-card--accent' : ''}`}>
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
