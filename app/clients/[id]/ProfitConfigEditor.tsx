'use client';

import { useMemo, useState } from 'react';
import { runFormulas, type Direction, type Formula } from '@/lib/profit';

type VarPair = { key: string; value: string };

type Props = {
  clientId: string;
  grossMargin: number;
  initial: { variables: Record<string, unknown>; formulas: Formula[] } | null;
};

// scope לדוגמה לאימות חי של נוסחאות (ערכי 1 כדי שחלוקה לא תיכשל סתם)
const SAMPLE_SCOPE: Record<string, number> = {
  spend: 1,
  impressions: 1,
  reach: 1,
  clicks: 1,
  ctr: 1,
  cpm: 1,
  revenue: 1,
  orders: 1,
  purchases: 1,
  leads: 1,
  allocated_fee: 0,
};

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'higher', label: 'גבוה=טוב' },
  { value: 'lower', label: 'נמוך=טוב' },
  { value: 'neutral', label: 'ניטרלי' },
];

function varsToObject(pairs: VarPair[]): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const p of pairs) {
    const key = p.key.trim();
    if (!key) continue;
    const s = p.value.trim();
    const n = Number(s);
    out[key] = s !== '' && Number.isFinite(n) ? n : p.value;
  }
  return out;
}

export default function ProfitConfigEditor({ clientId, grossMargin, initial }: Props) {
  const initialVars: VarPair[] = (() => {
    const entries = Object.entries(initial?.variables ?? {});
    if (entries.length > 0) return entries.map(([key, value]) => ({ key, value: String(value) }));
    return [{ key: 'gross_margin', value: String(grossMargin) }]; // ברירת מחדל מהלקוח
  })();

  const [vars, setVars] = useState<VarPair[]>(initialVars);
  const [formulas, setFormulas] = useState<Formula[]>(initial?.formulas ?? []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // אימות חי — מריץ את הנוסחאות מול scope לדוגמה ומחזיר שגיאות פר key
  const errors = useMemo(() => {
    const run = runFormulas(SAMPLE_SCOPE, varsToObject(vars), formulas);
    return run.errors;
  }, [vars, formulas]);

  // ----- variables -----
  function setVar(i: number, patch: Partial<VarPair>) {
    setVars((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function addVar() {
    setVars((prev) => [...prev, { key: '', value: '' }]);
  }
  function removeVar(i: number) {
    setVars((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ----- formulas -----
  function setFormula(i: number, patch: Partial<Formula>) {
    setFormulas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addFormula() {
    setFormulas((prev) => [...prev, { key: '', label: '', expression: '', direction: 'higher' }]);
  }
  function removeFormula(i: number) {
    setFormulas((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setFormulas((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/profit-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: varsToObject(vars),
          formulas: formulas
            .filter((f) => f.key.trim())
            .map((f) => ({
              key: f.key.trim(),
              label: f.label.trim() || f.key.trim(),
              expression: f.expression,
              direction: f.direction ?? 'higher',
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? 'שמירה נכשלה' });
        return;
      }
      setMsg({ ok: true, text: 'מנוע הרווח נשמר ✓' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>מנוע רווח</h2>
      {msg && <div className={msg.ok ? 'banner-ok' : 'banner-error'}>{msg.text}</div>}

      {/* Variables */}
      <h3 style={{ marginBottom: '0.6rem' }}>קבועים (variables)</h3>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
        זמינים בנוסחאות לפי השם. נתונים מהמטריקות (spend, revenue, orders, leads, allocated_fee, ctr,
        cpm…) מסופקים אוטומטית.
      </p>
      {vars.map((v, i) => (
        <div key={i} className="grid-2" style={{ gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' }}>
          <div className="field">
            <label>שם</label>
            <input className="input" value={v.key} onChange={(e) => setVar(i, { key: e.target.value })} placeholder="close_rate" />
          </div>
          <div className="field">
            <label>ערך</label>
            <input className="input" value={v.value} onChange={(e) => setVar(i, { value: e.target.value })} placeholder="0.3" />
          </div>
          <div className="field">
            <button className="btn danger" onClick={() => removeVar(i)}>הסר</button>
          </div>
        </div>
      ))}
      <button className="btn" onClick={addVar}>+ קבוע</button>

      {/* Formulas */}
      <h3 style={{ margin: '1.5rem 0 0.6rem' }}>נוסחאות (formulas)</h3>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
        רצות לפי הסדר; כל תוצאה זמינה לנוסחה הבאה לפי ה-key שלה. כל נוסחה = עמודה בטבלת Performance.
      </p>
      {formulas.map((f, i) => (
        <div key={i} className="card" style={{ background: '#fafbfc', padding: '1rem', marginBottom: '0.8rem' }}>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'end' }}>
            <div className="field">
              <label>key</label>
              <input className="input" value={f.key} onChange={(e) => setFormula(i, { key: e.target.value })} placeholder="con_profit" />
            </div>
            <div className="field">
              <label>כותרת עמודה</label>
              <input className="input" value={f.label} onChange={(e) => setFormula(i, { label: e.target.value })} placeholder="Con.Profit" />
            </div>
            <div className="field">
              <label>heatmap</label>
              <select className="select" value={f.direction ?? 'higher'} onChange={(e) => setFormula(i, { direction: e.target.value as Direction })}>
                {DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>expression (mathjs)</label>
            <input
              className={`input ${f.key && errors[f.key] ? 'invalid' : ''}`}
              value={f.expression}
              onChange={(e) => setFormula(i, { expression: e.target.value })}
              placeholder="revenue * gross_margin - spend - allocated_fee"
            />
            {f.key && errors[f.key] && <div className="field-error">שגיאה: {errors[f.key]}</div>}
          </div>
          <div className="btn-row" style={{ marginTop: '0.5rem' }}>
            <button className="btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button className="btn" onClick={() => move(i, 1)} disabled={i === formulas.length - 1}>↓</button>
            <button className="btn danger" onClick={() => removeFormula(i)}>הסר</button>
          </div>
        </div>
      ))}
      <button className="btn" onClick={addFormula}>+ נוסחה</button>

      <div className="btn-row">
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'שומר...' : 'שמור מנוע רווח'}
        </button>
      </div>
    </div>
  );
}
