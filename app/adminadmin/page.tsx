'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ClientRow = {
  id: string;
  name: string;
  currency: string | null;
  spend: number;
  leads: number;
  closed: number;
  revenue: number;
  profit: number;
  roas: number | null;
  cpl: number | null;
  error?: boolean;
};
type Alert = { clientId: string; name: string; type: 'loss' | 'low_roas' | 'no_leads'; message: string };
type Dashboard = {
  since: string;
  until: string;
  totals: {
    clients: number;
    spend: number;
    leads: number;
    closed: number;
    revenue: number;
    profit: number;
    roas: number | null;
    cpl: number | null;
  };
  clients: ClientRow[];
  alerts: Alert[];
};

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

const ALERT_ICON: Record<Alert['type'], string> = { loss: '🔴', low_roas: '🟡', no_leads: '⚪' };

export default function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setDbOk(d.db === 'connected'))
      .catch(() => setDbOk(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ since: isoDaysAgo(days - 1), until: isoDaysAgo(0) });
    fetch(`/api/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d as Dashboard);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [days]);

  const money0 = (n: number, cur?: string | null) => `${nf0.format(n)}${cur ? ' ' + cur : ''}`;
  const roasStr = (v: number | null) => (v != null ? `${nf2.format(v)}×` : '—');

  const t = data?.totals;
  const kpis = t
    ? [
        { label: 'לקוחות פעילים', value: nf0.format(t.clients) },
        { label: 'הוצאה', value: money0(t.spend) },
        { label: 'לידים', value: nf0.format(t.leads) },
        { label: 'הכנסה', value: money0(t.revenue) },
        { label: 'רווח', value: money0(t.profit), accent: true },
        { label: 'ROAS', value: roasStr(t.roas) },
      ]
    : [];

  // לקוחות ממויינים לפי הוצאה יורדת
  const sortedClients = useMemo(
    () => [...(data?.clients ?? [])].sort((a, b) => b.spend - a.spend),
    [data],
  );

  return (
    <main className="container">
      <div className="row-between">
        <div>
          <h1>מרכז שליטה</h1>
          <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>
            {dbOk === null ? '' : dbOk ? 'DB מחובר ✓' : 'שגיאת DB'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          </div>
          <Link className="btn primary" href="/clients/new">
            ＋ לקוח חדש
          </Link>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading && !data ? (
        <div className="card muted">טוען נתונים…</div>
      ) : (
        <>
          {/* סיכום סוכנות */}
          <div className="kpi-grid">
            {kpis.map((k) => (
              <div key={k.label} className={`kpi-card${k.accent ? ' kpi-card--accent' : ''}`}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
              </div>
            ))}
          </div>

          {/* התראות */}
          {data && data.alerts.length > 0 && (
            <>
              <h2 className="report-section-title">דורש תשומת לב</h2>
              <div className="alert-list">
                {data.alerts.map((a, i) => (
                  <Link key={i} href={`/clients/${a.clientId}`} className={`alert-card alert-${a.type}`}>
                    <span className="alert-ico">{ALERT_ICON[a.type]}</span>
                    <span className="alert-body">
                      <b>{a.name}</b>
                      <span className="alert-msg">{a.message}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* לקוחות במבט-על */}
          <h2 className="report-section-title">לקוחות במבט-על</h2>
          {sortedClients.length === 0 ? (
            <div className="card muted">
              אין לקוחות עדיין. <Link href="/clients/new">להוספת לקוח</Link>.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>לקוח</th>
                    <th style={{ textAlign: 'center' }}>הוצאה</th>
                    <th style={{ textAlign: 'center' }}>לידים</th>
                    <th style={{ textAlign: 'center' }}>עסקאות</th>
                    <th style={{ textAlign: 'center' }}>הכנסה</th>
                    <th style={{ textAlign: 'center' }}>רווח</th>
                    <th style={{ textAlign: 'center' }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/clients/${c.id}`}>{c.name}</Link>
                      </td>
                      <td style={{ textAlign: 'center' }}>{money0(c.spend, c.currency)}</td>
                      <td style={{ textAlign: 'center' }}>{nf0.format(c.leads)}</td>
                      <td style={{ textAlign: 'center' }}>{nf0.format(c.closed)}</td>
                      <td style={{ textAlign: 'center' }}>{money0(c.revenue, c.currency)}</td>
                      <td style={{ textAlign: 'center', color: c.profit < 0 ? 'var(--danger)' : undefined }}>
                        {money0(c.profit, c.currency)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{roasStr(c.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
