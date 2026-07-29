'use client';

import { useMemo, useState } from 'react';
import type { EnrichedLead } from '@/lib/leads';

// פלטת צבעים קטגוריאלית (מובחנת, נגישה) — לפרוסות העוגה לפי אינדקס.
const PALETTE = [
  '#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#a855f7',
  '#0ea5e9', '#84cc16', '#e11d48', '#64748b',
];
const NONE = '__none__';
const nf = new Intl.NumberFormat('he-IL');
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

type CatRow = { id: string; name: string; total: number; irrelevant: number };

/**
 * אנליטיקת לקוח לקבלת החלטות, עם סינון לפי קטגוריות נבחרות (רב-בחירה):
 *   1) רכישות ועלויות — רכישות, הכנסה, ממוצע לעסקה, הוצאה, עלות לרכישה (CPA).
 *   2) "לא רלוונטי" — פילוח לפי קטגוריה + עוגת סיבות.
 * הכל מתעדכן לפי הקטגוריות שנבחרו (ריק = כל הקטגוריות). ה-spend מגיע לפי קטגוריה מ-queryMetrics.
 */
export default function ClientAnalytics({
  leads,
  spendByCategory,
  currency,
}: {
  leads: EnrichedLead[];
  spendByCategory: Record<string, number>;
  currency: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set()); // ריק = הכל

  const money = useMemo(
    () =>
      new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: currency || 'ILS',
        maximumFractionDigits: 0,
      }),
    [currency],
  );

  // כל הקטגוריות (מכל הלידים) — לשורת הסינון, ממוין לפי סך לידים יורד
  const allCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number }>();
    for (const l of leads) {
      const id = l.category_id ?? NONE;
      const e = map.get(id) ?? { id, name: l.category_name ?? 'ללא קטגוריה', total: 0 };
      e.total++;
      map.set(id, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtering = selected.size > 0;
  const filteredLeads = useMemo(
    () => (filtering ? leads.filter((l) => selected.has(l.category_id ?? NONE)) : leads),
    [leads, selected, filtering],
  );

  // הוצאה לקטגוריות הנבחרות (או סך הכל כשאין סינון)
  const spend = useMemo(() => {
    const entries = Object.entries(spendByCategory);
    if (!filtering) return entries.reduce((s, [, v]) => s + v, 0);
    return entries.reduce((s, [k, v]) => (selected.has(k) ? s + v : s), 0);
  }, [spendByCategory, selected, filtering]);

  // רכישות ועלויות — נגזר מהלידים הסגורים (הרוכשים בפועל) בתוך הסינון
  const acq = useMemo(() => {
    const closed = filteredLeads.filter((l) => l.status === 'closed');
    const purchases = closed.length;
    const revenue = closed.reduce((s, l) => s + (Number(l.deal_value) || 0), 0);
    const avgDeal = purchases ? revenue / purchases : 0;
    const cpa = spend > 0 && purchases ? spend / purchases : null;
    return { purchases, revenue, avgDeal, cpa };
  }, [filteredLeads, spend]);

  const totals = useMemo(() => {
    const total = filteredLeads.length;
    const irrelevant = filteredLeads.filter((l) => l.status === 'irrelevant').length;
    return { total, irrelevant };
  }, [filteredLeads]);

  // פילוח "לא רלוונטי" לפי קטגוריה (בתוך הסינון)
  const categories = useMemo(() => {
    const map = new Map<string, CatRow>();
    for (const l of filteredLeads) {
      const id = l.category_id ?? NONE;
      const name = l.category_name ?? 'ללא קטגוריה';
      const e = map.get(id) ?? { id, name, total: 0, irrelevant: 0 };
      e.total++;
      if (l.status === 'irrelevant') e.irrelevant++;
      map.set(id, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  // עוגת סיבות (בתוך הסינון), ממוין לפי כמות יורדת
  const reasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of filteredLeads) {
      if (l.status !== 'irrelevant') continue;
      const label = l.reason_label ?? 'ללא סיבה';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const rows = [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }));
    const total = rows.reduce((s, r) => s + r.count, 0);
    return { rows, total };
  }, [filteredLeads]);

  // דונאט SVG (stroke-dasharray) — ללא ספריית גרפים
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <>
      {/* ── סינון קטגוריות (רב-בחירה) ── */}
      <div className="card" style={{ paddingBottom: '0.9rem' }}>
        <div className="ia-filter-head">
          <span>קטגוריות</span>
          <span className="muted">
            {filtering ? `${selected.size} נבחרו` : 'הכל'}
          </span>
        </div>
        <div className="ia-filter">
          <button
            type="button"
            className={`ia-filter-btn ${!filtering ? 'active' : ''}`}
            onClick={() => setSelected(new Set())}
          >
            כל הקטגוריות
          </button>
          {allCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ia-filter-btn ${selected.has(c.id) ? 'active' : ''}`}
              onClick={() => toggle(c.id)}
            >
              {c.name}
              <span className="ia-filter-cnt">{nf.format(c.total)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── רכישות ועלויות ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>רכישות ועלויות</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
          עלות רכישת לקוח וסכום ממוצע לעסקה — לחישוב רווחיות והחלטות תקציב.
        </p>
        <div className="ia-kpis">
          <div className="ia-kpi">
            <span className="ia-kpi-num">{nf.format(acq.purchases)}</span>
            <span className="ia-kpi-lbl">רכישות</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num">{money.format(acq.revenue)}</span>
            <span className="ia-kpi-lbl">הכנסה</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num ia-accent">{money.format(acq.avgDeal)}</span>
            <span className="ia-kpi-lbl">ממוצע לעסקה</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num">{spend > 0 ? money.format(spend) : '—'}</span>
            <span className="ia-kpi-lbl">הוצאת פרסום</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num ia-accent">{acq.cpa != null ? money.format(acq.cpa) : '—'}</span>
            <span className="ia-kpi-lbl">עלות לרכישה</span>
          </div>
        </div>
        {spend === 0 && (
          <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
            אין נתוני הוצאה מסונכרנים {filtering ? 'לקטגוריות שנבחרו' : ''} — עלות לרכישה תוצג לאחר סנכרון נתוני הקמפיינים.
          </p>
        )}
      </div>

      {/* ── ניתוח "לא רלוונטי" ── */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>ניתוח לידים "לא רלוונטי"</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
          כמה מהלידים בכל קטגוריה סומנו "לא רלוונטי", ולמה — לזיהוי בזבוז וטיוב הקמפיין.
        </p>

        <div className="ia-kpis">
          <div className="ia-kpi">
            <span className="ia-kpi-num">{nf.format(totals.total)}</span>
            <span className="ia-kpi-lbl">סך לידים</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num">{nf.format(totals.irrelevant)}</span>
            <span className="ia-kpi-lbl">לא רלוונטי</span>
          </div>
          <div className="ia-kpi">
            <span className="ia-kpi-num ia-accent">{pct(totals.irrelevant, totals.total)}%</span>
            <span className="ia-kpi-lbl">שיעור לא-רלוונטי</span>
          </div>
        </div>

        <div className="ia-section-title">פילוח לפי קטגוריה</div>
        {categories.length === 0 ? (
          <div className="muted">אין לידים בקטגוריות שנבחרו.</div>
        ) : (
          <div className="ia-cat-list">
            {categories.map((row) => {
              const rate = pct(row.irrelevant, row.total);
              return (
                <div key={row.id} className="ia-cat-row">
                  <div className="ia-cat-head">
                    <span className="ia-cat-name" title={row.name}>{row.name}</span>
                    <span className="ia-cat-val">
                      <strong>{nf.format(row.irrelevant)}</strong>
                      <span className="muted"> / {nf.format(row.total)} · {rate}%</span>
                    </span>
                  </div>
                  <span className="ia-cat-track">
                    <span className="ia-cat-fill" style={{ width: `${rate}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="ia-section-title">פילוח סיבות "לא רלוונטי"</div>
        {reasons.total === 0 ? (
          <div className="muted">אין לידים "לא רלוונטי" בקטגוריות שנבחרו.</div>
        ) : (
          <div className="ia-pie-wrap">
            <svg viewBox="0 0 180 180" className="ia-pie" role="img" aria-label="עוגת סיבות לא רלוונטי">
              <g transform="rotate(-90 90 90)">
                {reasons.rows.map((r) => {
                  const f = r.count / reasons.total;
                  const seg = f * C;
                  const off = -acc * C;
                  acc += f;
                  return (
                    <circle
                      key={r.label}
                      cx="90"
                      cy="90"
                      r={R}
                      fill="none"
                      stroke={r.color}
                      strokeWidth="26"
                      strokeDasharray={`${seg} ${C - seg}`}
                      strokeDashoffset={off}
                    />
                  );
                })}
              </g>
              <text x="90" y="85" textAnchor="middle" className="ia-pie-num">{nf.format(reasons.total)}</text>
              <text x="90" y="104" textAnchor="middle" className="ia-pie-sub">לא רלוונטי</text>
            </svg>

            <div className="ia-legend">
              {reasons.rows.map((r) => (
                <div key={r.label} className="ia-legend-row">
                  <span className="ia-legend-dot" style={{ background: r.color }} />
                  <span className="ia-legend-label" title={r.label}>{r.label}</span>
                  <span className="ia-legend-val">
                    <strong>{nf.format(r.count)}</strong>
                    <span className="muted"> · {pct(r.count, reasons.total)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
