'use client';

import type { GroupBy, MetricsResult, MetricsRow, MetricsTotals } from '@/lib/metrics';
import type { Direction } from '@/lib/profit';

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ColKey = 'spend' | 'impressions' | 'reach' | 'clicks' | 'ctr' | 'cpm';

// כיוון הצביעה של ה-heatmap:
//   higher  — ערך גבוה = ירוק (טוב), נמוך = אדום
//   lower   — ערך נמוך = ירוק (טוב), גבוה = אדום   (מטריקות עלות)
//   neutral — בלי שיפוט טוב/רע; סקלת אמבר אחידה לפי גודל

const COLUMNS: { key: ColKey; label: string; fmt: (v: number) => string; dir: Direction }[] = [
  { key: 'spend', label: 'Spend', fmt: (v) => nf2.format(v), dir: 'neutral' },
  { key: 'impressions', label: 'Impressions', fmt: (v) => nf0.format(v), dir: 'higher' },
  { key: 'reach', label: 'Reach', fmt: (v) => nf0.format(v), dir: 'higher' },
  { key: 'clicks', label: 'Clicks', fmt: (v) => nf0.format(v), dir: 'higher' },
  { key: 'ctr', label: 'CTR %', fmt: (v) => `${nf2.format(v)}%`, dir: 'higher' },
  { key: 'cpm', label: 'CPM', fmt: (v) => nf2.format(v), dir: 'lower' },
];

const DIM_LABEL: Record<GroupBy, string> = {
  day: 'יום',
  week: 'שבוע',
  creative: 'קריאטיב',
  campaign: 'קמפיין',
  category: 'קטגוריה',
};

/** צבע heatmap יחסי לעמודה, לפי כיוון: higher / lower (ירוק↔אדום) או neutral (אמבר). */
function heatColor(value: number, min: number, max: number, dir: Direction): string {
  if (max <= min) return 'transparent';
  const t = (value - min) / (max - min); // 0..1
  if (dir === 'neutral') {
    // אמבר אחיד — גבוה יותר = אמבר עמוק יותר, בלי שיפוט טוב/רע
    return `hsl(40, 85%, ${94 - t * 24}%)`;
  }
  // higher: נמוך=אדום(0) → גבוה=ירוק(120); lower: הפוך
  const score = dir === 'lower' ? 1 - t : t;
  const hue = score * 120;
  return `hsl(${hue}, 65%, 90%)`;
}

const cellStyle = { textAlign: 'left', fontVariantNumeric: 'tabular-nums' } as const;

export default function MetricsTable({
  result,
  loading,
}: {
  result: MetricsResult | null;
  loading: boolean;
}) {
  if (loading) return <div className="card muted">טוען נתונים…</div>;
  if (!result) return <div className="card muted">בחר לקוח כדי להציג נתונים.</div>;
  if (result.rows.length === 0) return <div className="card muted">אין נתונים לטווח/scope שנבחרו.</div>;

  const formulaCols = result.formula_columns;

  // טווחי min/max פר עמודה — מחושבים על שורות הנתונים בלבד (לא הרולאפ)
  const baseRanges: Record<ColKey, { min: number; max: number }> = {} as never;
  for (const col of COLUMNS) {
    const vals = result.rows.map((r) => r[col.key]);
    baseRanges[col.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  const formulaRanges = new Map<string, { min: number; max: number }>();
  for (const fc of formulaCols) {
    const vals = result.rows
      .map((r) => r.computed[fc.key])
      .filter((v): v is number => typeof v === 'number');
    formulaRanges.set(fc.key, {
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 0,
    });
  }

  const renderBaseCells = (row: MetricsRow | MetricsTotals, heat: boolean) =>
    COLUMNS.map((col) => {
      const v = row[col.key];
      const bg = heat ? heatColor(v, baseRanges[col.key].min, baseRanges[col.key].max, col.dir) : undefined;
      return (
        <td key={col.key} style={{ ...cellStyle, background: bg }}>
          {col.fmt(v)}
        </td>
      );
    });

  const renderFormulaCells = (computed: Record<string, number | null>, heat: boolean) =>
    formulaCols.map((fc) => {
      const v = computed[fc.key];
      if (typeof v !== 'number') {
        return (
          <td key={fc.key} style={{ ...cellStyle, color: 'var(--muted)' }}>
            —
          </td>
        );
      }
      const range = formulaRanges.get(fc.key)!;
      const bg = heat ? heatColor(v, range.min, range.max, fc.direction) : undefined;
      return (
        <td key={fc.key} style={{ ...cellStyle, background: bg }}>
          {nf2.format(v)}
        </td>
      );
    });

  return (
    <div className="mtable">
    <table className="table">
      <thead>
        <tr>
          <th>{DIM_LABEL[result.group_by]}</th>
          {COLUMNS.map((c) => (
            <th key={c.key} style={{ textAlign: 'left' }}>
              {c.label}
            </th>
          ))}
          {formulaCols.map((c) => (
            <th key={c.key} style={{ textAlign: 'left' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="rollup-row">
          <td>סה"כ (רולאפ)</td>
          {renderBaseCells(result.rollup, false)}
          {renderFormulaCells(result.rollup.computed, false)}
        </tr>
        {result.rows.map((row) => (
          <tr key={row.key}>
            <td>{row.label}</td>
            {renderBaseCells(row, true)}
            {renderFormulaCells(row.computed, true)}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
