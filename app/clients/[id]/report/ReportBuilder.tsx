'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GroupBy, MetricsResult, MetricsRow } from '@/lib/metrics';

type Props = { clientId: string; clientName: string; currency?: string | null };

// פילוחי הדוח. 'overall' = שורת סיכום כללית אחת (rollup).
type Breakdown = 'overall' | 'day' | 'week' | 'campaign' | 'creative' | 'category';

const BREAKDOWNS: { value: Breakdown; label: string; groupBy: GroupBy }[] = [
  { value: 'overall', label: 'כללי (סיכום)', groupBy: 'day' },
  { value: 'category', label: 'קטגוריות', groupBy: 'category' },
  { value: 'creative', label: 'מודעה / קריאטיב', groupBy: 'creative' },
  { value: 'campaign', label: 'קמפיין', groupBy: 'campaign' },
  { value: 'day', label: 'יום', groupBy: 'day' },
  { value: 'week', label: 'שבוע', groupBy: 'week' },
];

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type Col = {
  key: string;
  label: string;
  get: (row: MetricsRow) => number | null;
  kind: 'money' | 'int' | 'pct';
};

export default function ReportBuilder({ clientId, clientName, currency }: Props) {
  const [breakdown, setBreakdown] = useState<Breakdown>('overall');
  const [since, setSince] = useState(isoDaysAgo(29));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [result, setResult] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cur = currency || '';
  const groupBy = BREAKDOWNS.find((b) => b.value === breakdown)!.groupBy;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ client_id: clientId, group_by: groupBy, since, until });
    fetch(`/api/metrics?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setResult(null);
        } else setResult(d as MetricsResult);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [clientId, groupBy, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  // שורות הדוח — ב'כללי' שורה אחת מה-rollup, אחרת שורות הפילוח
  const rows: MetricsRow[] = useMemo(() => {
    if (!result) return [];
    if (breakdown === 'overall') return [{ key: 'overall', label: 'כללי', ...result.rollup }];
    return result.rows;
  }, [result, breakdown]);

  const columns: Col[] = useMemo(() => {
    const base: Col[] = [
      { key: 'spend', label: 'הוצאה', get: (r) => r.spend, kind: 'money' },
      { key: 'leads', label: 'לידים', get: (r) => r.leads, kind: 'int' },
      { key: 'cpl', label: 'CPL', get: (r) => r.cpl, kind: 'money' },
      { key: 'closes', label: 'עסקאות סגורות', get: (r) => r.closes, kind: 'int' },
      { key: 'revenue', label: 'הכנסה', get: (r) => r.revenue, kind: 'money' },
      { key: 'clicks', label: 'קליקים', get: (r) => r.clicks, kind: 'int' },
      { key: 'cpc', label: 'CPC', get: (r) => r.cpc, kind: 'money' },
      { key: 'ctr', label: 'CTR', get: (r) => r.ctr, kind: 'pct' },
      { key: 'cpm', label: 'CPM', get: (r) => r.cpm, kind: 'money' },
      { key: 'impressions', label: 'חשיפות', get: (r) => r.impressions, kind: 'int' },
    ];
    const formula: Col[] = (result?.formula_columns ?? []).map((fc) => ({
      key: `f_${fc.key}`,
      label: fc.label,
      get: (r: MetricsRow) => r.computed?.[fc.key] ?? null,
      kind: 'money' as const,
    }));
    return [...base, ...formula];
  }, [result]);

  function fmt(v: number | null, kind: Col['kind']): string {
    if (v == null) return '—';
    if (kind === 'int') return nf0.format(v);
    if (kind === 'pct') return `${nf2.format(v)}%`;
    return `${nf2.format(v)}${cur ? ' ' + cur : ''}`;
  }

  // ערך גולמי ל-CSV (בלי מפרידי אלפים / מטבע), נקודה עשרונית
  function raw(v: number | null, kind: Col['kind']): string {
    if (v == null) return '';
    if (kind === 'int') return String(Math.round(v));
    return (Math.round(v * 100) / 100).toString();
  }

  function csvCell(s: string): string {
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadCsv() {
    const header = ['פילוח', ...columns.map((c) => c.label)];
    const lines = [header.map(csvCell).join(',')];
    for (const row of rows) {
      const cells = [row.label, ...columns.map((c) => raw(c.get(row), c.kind))];
      lines.push(cells.map(csvCell).join(','));
    }
    // BOM ל-UTF-8 כדי שאקסל יציג עברית נכון
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${clientName}-${breakdown}-${since}_${until}.csv`.replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> /{' '}
        <Link href={`/clients/${clientId}`}>{clientName}</Link> / דוח
      </div>
      <div className="row-between">
        <h1>דוח נתונים — {clientName}</h1>
        <button className="btn primary" onClick={downloadCsv} disabled={rows.length === 0}>
          הורד CSV
        </button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="field">
            <label>פילוח</label>
            <select className="select" value={breakdown} onChange={(e) => setBreakdown(e.target.value as Breakdown)}>
              {BREAKDOWNS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>מתאריך</label>
            <input className="input" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
          <div className="field">
            <label>עד תאריך</label>
            <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 auto', textAlign: 'left' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {loading ? 'טוען…' : `${rows.length} שורות`}
            </span>
          </div>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {rows.length === 0 && !loading ? (
        <div className="card muted">אין נתונים בטווח שנבחר.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>פילוח</th>
                {columns.map((c) => (
                  <th key={c.key} style={{ textAlign: 'center' }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: 'center' }}>
                      {fmt(c.get(row), c.kind)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
