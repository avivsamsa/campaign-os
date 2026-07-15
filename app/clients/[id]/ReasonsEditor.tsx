'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/products';

type Reason = { id: string; label: string; source: string; count: number };

const NONE = '__none__'; // כללי / ללא קטגוריה (לידים ללא טופס ממופה)

/**
 * ניהול סיבות "לא רלוונטי" פר קטגוריה + גרף התפלגות.
 * admin מגדיר כאן את רשימת הבסיס; הלקוח מוסיף "אחר" מהפורטל.
 * הגרף מראה כמה לידים סומנו בכל סיבה — לאופטימיזציה.
 */
export default function ReasonsEditor({
  clientId,
  products,
}: {
  clientId: string;
  products: Product[];
}) {
  const [cat, setCat] = useState<string>('');
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');

  // ברירת מחדל: הקטגוריה הראשונה
  useEffect(() => {
    if (!cat && products.length > 0) setCat(products[0].id);
  }, [products, cat]);

  const categoryParam = cat === NONE ? '' : cat;

  function load() {
    if (!cat) return;
    setLoading(true);
    setError('');
    fetch(`/api/clients/${clientId}/reasons?category=${categoryParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReasons(d.reasons as Reason[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [cat, clientId]);

  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    setError('');
    const res = await fetch(`/api/clients/${clientId}/reasons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, category: categoryParam || null }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? 'הוספה נכשלה'); return; }
    setReasons((prev) => [...prev, d.reason as Reason]);
    setNewLabel('');
  }

  async function remove(id: string) {
    if (!confirm('למחוק את הסיבה? לידים שסומנו בה יאבדו את השיוך.')) return;
    const res = await fetch(`/api/clients/${clientId}/reasons/${id}`, { method: 'DELETE' });
    if (res.ok) setReasons((prev) => prev.filter((r) => r.id !== id));
  }

  // גרף: סיבות עם ספירה > 0, ממוינות מהגבוה לנמוך
  const chart = useMemo(() => {
    const withCount = reasons.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
    const max = withCount.reduce((m, r) => Math.max(m, r.count), 0);
    const total = withCount.reduce((s, r) => s + r.count, 0);
    return { rows: withCount, max, total };
  }, [reasons]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>סיבות "לא רלוונטי"</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        הגדר סיבות בסיס לכל קטגוריה. הלקוח יבחר סיבה בפופאפ כשמסמן ליד "לא רלוונטי", ויכול להוסיף "אחר".
        הגרף מראה את התפלגות הסיבות — לאיתור בזבוז וטיוב הקמפיין.
      </p>

      {products.length === 0 ? (
        <div className="muted">הגדר קטגוריה קודם כדי להגדיר לה סיבות.</div>
      ) : (
        <>
          <div className="field" style={{ maxWidth: 280 }}>
            <label>קטגוריה</label>
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value={NONE}>כללי (ללא קטגוריה)</option>
            </select>
          </div>

          {error && <div className="banner-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

          {/* הוספת סיבה */}
          <div className="reason-add" style={{ marginTop: '0.85rem' }}>
            <input
              className="input"
              placeholder="סיבה חדשה… (למשל: לא רלוונטי גיאוגרפית)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            />
            <button className="btn primary" onClick={add} disabled={!newLabel.trim()}>הוסף</button>
          </div>

          {/* רשימת סיבות */}
          {loading ? (
            <div className="muted" style={{ marginTop: '0.85rem' }}>טוען…</div>
          ) : reasons.length === 0 ? (
            <div className="muted" style={{ marginTop: '0.85rem' }}>אין עדיין סיבות לקטגוריה זו.</div>
          ) : (
            <div className="reason-admin-list">
              {reasons.map((r) => (
                <span key={r.id} className="reason-admin-chip">
                  {r.label}
                  {r.source === 'client' && <span className="reason-src">אחר</span>}
                  {r.count > 0 && <span className="reason-cnt">{r.count}</span>}
                  <button className="chip-del" onClick={() => remove(r.id)} aria-label="מחיקה">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* גרף התפלגות */}
          {chart.rows.length > 0 && (
            <div className="reason-chart">
              <div className="reason-chart-head">
                <span>התפלגות סיבות</span>
                <span className="muted">{chart.total} לידים לא רלוונטיים</span>
              </div>
              {chart.rows.map((r) => (
                <div key={r.id} className="reason-bar-row">
                  <span className="reason-bar-label" title={r.label}>{r.label}</span>
                  <span className="reason-bar-track">
                    <span
                      className="reason-bar-fill"
                      style={{ width: `${chart.max ? (r.count / chart.max) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="reason-bar-val">
                    {r.count}
                    <span className="muted"> · {Math.round((r.count / chart.total) * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
