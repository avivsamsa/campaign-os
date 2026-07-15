'use client';

import { useEffect, useState } from 'react';
import type { Product, ProfitMode } from '@/lib/products';
import FormRoutesEditor from './FormRoutesEditor';
import ReasonsEditor from './ReasonsEditor';

const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

const emptyForm = {
  name: '',
  profit_mode: 'margin' as ProfitMode,
  price: '',
  margin_pct: '',
  profit_amount: '',
};

/**
 * ניהול קטגוריות (=מוצרים) של הלקוח: שם + אחוז רווח/סכום, ומיפוי טפסי לידים אליהן.
 * הלקוח יראה את הקטגוריות האלה כשער הבחירה בפורטל הלידים.
 */
export default function CategoriesEditor({ clientId }: { clientId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function load() {
    setLoading(true);
    setError('');
    fetch(`/api/clients/${clientId}/products`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setProducts(d.products as Product[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      profit_mode: p.profit_mode,
      price: p.price != null ? String(p.price) : '',
      margin_pct: p.margin_pct != null ? String(p.margin_pct) : '',
      profit_amount: p.profit_amount != null ? String(p.profit_amount) : '',
    });
  }

  async function save() {
    setMsg('');
    setError('');
    const url = editingId ? `/api/products/${editingId}` : `/api/clients/${clientId}/products`;
    const res = await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? 'שמירה נכשלה');
      return;
    }
    setMsg(editingId ? 'הקטגוריה עודכנה ✓' : 'הקטגוריה נוצרה ✓');
    resetForm();
    load();
  }

  async function remove(id: string) {
    if (!confirm('למחוק את הקטגוריה? הקישור בקריאטיבים/טפסים יתאפס.')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  function profitLabel(p: Product): string {
    if (p.profit_mode === 'margin') {
      return `${nf2.format((p.margin_pct ?? 0) * 100)}% רווח${p.price != null ? ` · מחיר ₪${nf2.format(p.price)}` : ''}`;
    }
    return `₪${nf2.format(p.profit_amount ?? 0)} רווח למכירה`;
  }

  return (
    <>
      {error && <div className="banner-error">{error}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{editingId ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
          קטגוריה = מוצר. הלקוח יראה את הקטגוריות בשער הבחירה בפורטל הלידים, ואחוז הרווח מזין את חישוב הרווח.
        </p>
        <div className="toolbar">
          <div className="field">
            <label>שם הקטגוריה</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="למשל: שימשיות"
            />
          </div>
          <div className="field">
            <label>מודל רווח</label>
            <div className="view-toggle" role="group">
              <button type="button" className={form.profit_mode === 'margin' ? 'active' : ''} onClick={() => setForm({ ...form, profit_mode: 'margin' })}>
                אחוז רווח
              </button>
              <button type="button" className={form.profit_mode === 'fixed' ? 'active' : ''} onClick={() => setForm({ ...form, profit_mode: 'fixed' })}>
                סכום קבוע
              </button>
            </div>
          </div>
          {form.profit_mode === 'margin' ? (
            <>
              <div className="field">
                <label>מחיר (₪, אופציונלי)</label>
                <input className="input" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2599" />
              </div>
              <div className="field">
                <label>אחוז רווח (0–1)</label>
                <input className="input" inputMode="decimal" value={form.margin_pct} onChange={(e) => setForm({ ...form, margin_pct: e.target.value })} placeholder="0.4" />
              </div>
            </>
          ) : (
            <div className="field">
              <label>רווח למכירה (₪)</label>
              <input className="input" inputMode="decimal" value={form.profit_amount} onChange={(e) => setForm({ ...form, profit_amount: e.target.value })} placeholder="800" />
            </div>
          )}
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn primary" onClick={save} disabled={!form.name.trim()}>
              {editingId ? 'עדכן' : 'הוסף קטגוריה'}
            </button>
          </div>
          {editingId && (
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <button className="btn" onClick={resetForm}>ביטול</button>
            </div>
          )}
          {msg && (
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <span className="ok">{msg}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card muted">טוען…</div>
      ) : products.length === 0 ? (
        <div className="card muted">אין עדיין קטגוריות ללקוח זה.</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>קטגוריה</th>
                <th style={{ textAlign: 'right' }}>מודל רווח</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ textAlign: 'right' }}>{profitLabel(p)}</td>
                  <td>
                    <button className="btn" onClick={() => startEdit(p)}>עריכה</button>{' '}
                    <button className="btn" onClick={() => remove(p.id)}>מחיקה</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormRoutesEditor clientId={clientId} products={products} />

      <ReasonsEditor clientId={clientId} products={products} />
    </>
  );
}
