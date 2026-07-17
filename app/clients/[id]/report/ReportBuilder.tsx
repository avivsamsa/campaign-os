'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = { clientId: string; clientName: string; currency?: string | null };

type CategoryRow = { id: string; name: string; leads: number; closed: number; revenue: number; profit: number };
type ReportData = {
  since: string;
  until: string;
  overall: { leads: number; closed: number; revenue: number; profit: number; spend: number; cpl: number | null };
  categories: CategoryRow[];
  uncategorized: { leads: number; closed: number; revenue: number } | null;
};

type Card = { label: string; value: string; accent?: boolean };
type Section = { key: string; title: string; cards: Card[] };

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportBuilder({ clientId, clientName, currency }: Props) {
  const [since, setSince] = useState(isoDaysAgo(29));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // בחירת תוכן הדוח
  const [includeOverall, setIncludeOverall] = useState(true);
  const [includeUncat, setIncludeUncat] = useState(false);
  const [selectedCats, setSelectedCats] = useState<Set<string> | null>(null); // null = טרם אותחל

  const cur = currency || '';
  const money = (n: number) => `${nf2.format(n)}${cur ? ' ' + cur : ''}`;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams({ since, until });
    fetch(`/api/clients/${clientId}/report?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setData(null);
        } else setData(d as ReportData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [clientId, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  // אתחול בחירת קטגוריות — כולן מסומנות כברירת מחדל (פעם אחת)
  useEffect(() => {
    if (data && selectedCats === null) {
      setSelectedCats(new Set(data.categories.map((c) => c.id)));
    }
  }, [data, selectedCats]);

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sections: Section[] = useMemo(() => {
    if (!data) return [];
    const out: Section[] = [];
    const o = data.overall;

    if (includeOverall) {
      out.push({
        key: 'overall',
        title: 'סיכום כללי',
        cards: [
          { label: 'הוצאת פרסום', value: money(o.spend) },
          { label: 'לידים', value: nf0.format(o.leads) },
          { label: 'עלות לליד', value: o.cpl != null ? money(o.cpl) : '—' },
          { label: 'עסקאות סגורות', value: nf0.format(o.closed) },
          { label: 'הכנסה', value: money(o.revenue) },
          { label: 'רווח', value: money(o.profit), accent: true },
        ],
      });
    }

    for (const c of data.categories) {
      if (!selectedCats?.has(c.id)) continue;
      out.push({
        key: `cat_${c.id}`,
        title: c.name,
        cards: [
          { label: 'לידים', value: nf0.format(c.leads) },
          { label: 'עסקאות סגורות', value: nf0.format(c.closed) },
          { label: 'הכנסה', value: money(c.revenue) },
          { label: 'רווח', value: money(c.profit), accent: true },
        ],
      });
    }

    if (includeUncat && data.uncategorized) {
      const u = data.uncategorized;
      out.push({
        key: 'uncat',
        title: 'ללא קטגוריה',
        cards: [
          { label: 'לידים', value: nf0.format(u.leads) },
          { label: 'עסקאות סגורות', value: nf0.format(u.closed) },
          { label: 'הכנסה', value: money(u.revenue) },
        ],
      });
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, includeOverall, includeUncat, selectedCats, cur]);

  function downloadCsv() {
    if (!data) return;
    const header = ['מקטע', 'לידים', 'עסקאות סגורות', 'הכנסה', 'רווח', 'הוצאת פרסום'];
    const lines = [header.join(',')];
    const row = (name: string, leads: number, closed: number, revenue: number, profit: number | '', spend: number | '') =>
      [name, leads, closed, revenue, profit, spend]
        .map((s) => {
          const str = String(s);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',');
    if (includeOverall) {
      const o = data.overall;
      lines.push(row('סיכום כללי', o.leads, o.closed, r2(o.revenue), r2(o.profit), r2(o.spend)));
    }
    for (const c of data.categories) {
      if (!selectedCats?.has(c.id)) continue;
      lines.push(row(c.name, c.leads, c.closed, r2(c.revenue), r2(c.profit), ''));
    }
    if (includeUncat && data.uncategorized) {
      const u = data.uncategorized;
      lines.push(row('ללא קטגוריה', u.leads, u.closed, r2(u.revenue), '', ''));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${clientName}-${since}_${until}.csv`.replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container print-area">
      <div className="breadcrumb no-print">
        <Link href="/clients">לקוחות</Link> /{' '}
        <Link href={`/clients/${clientId}`}>{clientName}</Link> / דוח
      </div>
      <div className="row-between no-print">
        <h1>בניית דוח ללקוח — {clientName}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={downloadCsv} disabled={!data}>
            הורד CSV
          </button>
          <button className="btn primary" onClick={() => window.print()} disabled={sections.length === 0}>
            הורד PDF
          </button>
        </div>
      </div>

      {/* בקרת בניית הדוח */}
      <div className="card no-print">
        <div className="toolbar">
          <div className="field">
            <label>מתאריך</label>
            <input className="input" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
          <div className="field">
            <label>עד תאריך</label>
            <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
        </div>

        <div className="report-picker">
          <label className="report-check">
            <input type="checkbox" checked={includeOverall} onChange={(e) => setIncludeOverall(e.target.checked)} />
            סיכום כללי
          </label>

          {data && data.categories.length > 0 && (
            <div className="report-picker-group">
              <span className="report-picker-title">קטגוריות:</span>
              {data.categories.map((c) => (
                <label key={c.id} className="report-check">
                  <input
                    type="checkbox"
                    checked={selectedCats?.has(c.id) ?? false}
                    onChange={() => toggleCat(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}

          {data?.uncategorized && (
            <label className="report-check">
              <input type="checkbox" checked={includeUncat} onChange={(e) => setIncludeUncat(e.target.checked)} />
              ללא קטגוריה
            </label>
          )}
        </div>
      </div>

      {/* כותרת ל-PDF בלבד */}
      <div className="print-only report-print-head">
        <div className="report-print-brand">Campaign OS</div>
        <h1>{clientName}</h1>
        <div className="report-print-meta">דוח ביצועים · {since} — {until}</div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading && !data ? (
        <div className="card muted">טוען…</div>
      ) : sections.length === 0 ? (
        <div className="card muted no-print">בחר לפחות מקטע אחד להצגה בדוח.</div>
      ) : (
        sections.map((s) => (
          <section key={s.key} className="report-section">
            <h2 className="report-section-title">{s.title}</h2>
            <div className="kpi-grid">
              {s.cards.map((k) => (
                <div key={k.label} className={`kpi-card${k.accent ? ' kpi-card--accent' : ''}`}>
                  <div className="kpi-label">{k.label}</div>
                  <div className="kpi-value">{k.value}</div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
