'use client';

import { useEffect, useState } from 'react';
import type { Product, ProfitMode } from '@/lib/products';

type ClientOption = { id: string; name: string };

const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

const emptyForm = {
  name: '',
  profit_mode: 'margin' as ProfitMode,
  price: '',
  margin_pct: '',
  profit_amount: '',
};

export default function ProductsPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        const list: ClientOption[] = d.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId(list[0].id);
      })
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, []);

  function load(cid: string) {
    setLoading(true);
    setError('');
    fetch(`/api/clients/${cid}/products`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setProducts(d.products as Product[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (clientId) load(clientId);
    else setProducts([]);
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
    const payload = {
      name: form.name,
      profit_mode: form.profit_mode,
      price: form.price,
      margin_pct: form.margin_pct,
      profit_amount: form.profit_amount,
    };
    const url = editingId ? `/api/products/${editingId}` : `/api/clients/${clientId}/products`;
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error ?? 'שמירה נכשלה');
      return;
    }
    setMsg(editingId ? 'המוצר עודכן ✓' : 'המוצר נוצר ✓');
    resetForm();
    load(clientId);
  }

  async function remove(id: string) {
    if (!confirm('למחוק את המוצר? הקישור בקריאטיבים יתאפס.')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) load(clientId);
  }

  function profitLabel(p: Product): string {
    if (p.profit_mode === 'margin') {
      return `${nf2.format((p.margin_pct ?? 0) * 100)}% רווח${p.price != null ? ` · מחיר ₪${nf2.format(p.price)}` : ''}`;
    }
    return `₪${nf2.format(p.profit_amount ?? 0)} רווח למכירה`;
  }

  return (
    <main className="container">
      <div className="breadcrumb">מוצרים</div>
      <h1>מוצרים ורווח</h1>

      <div className="card">
        <div className="field" style={{ marginBottom: 0, maxWidth: 320 }}>
          <label>לקוח</label>
          <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— בחר לקוח —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {clientId && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editingId ? 'עריכת מוצר' : 'מוצר חדש'}</h3>
          <div className="toolbar">
            <div className="field">
              <label>שם המוצר</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="למשל: סט 6 כסאות + שולחן"
              />
            </div>
            <div className="field">
              <label>מודל רווח</label>
              <div className="view-toggle" role="group">
                <button
                  type="button"
                  className={form.profit_mode === 'margin' ? 'active' : ''}
                  onClick={() => setForm({ ...form, profit_mode: 'margin' })}
                >
                  אחוז רווח
                </button>
                <button
                  type="button"
                  className={form.profit_mode === 'fixed' ? 'active' : ''}
                  onClick={() => setForm({ ...form, profit_mode: 'fixed' })}
                >
                  סכום קבוע
                </button>
              </div>
            </div>
            {form.profit_mode === 'margin' ? (
              <>
                <div className="field">
                  <label>מחיר מוצר (₪, אופציונלי)</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="2599"
                  />
                </div>
                <div className="field">
                  <label>אחוז רווח (0–1)</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={form.margin_pct}
                    onChange={(e) => setForm({ ...form, margin_pct: e.target.value })}
                    placeholder="0.4"
                  />
                </div>
              </>
            ) : (
              <div className="field">
                <label>רווח למכירה (₪)</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.profit_amount}
                  onChange={(e) => setForm({ ...form, profit_amount: e.target.value })}
                  placeholder="800"
                />
              </div>
            )}
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <button className="btn primary" onClick={save} disabled={!form.name.trim()}>
                {editingId ? 'עדכן' : 'הוסף מוצר'}
              </button>
            </div>
            {editingId && (
              <div className="field" style={{ alignSelf: 'flex-end' }}>
                <button className="btn" onClick={resetForm}>
                  ביטול
                </button>
              </div>
            )}
            {msg && (
              <div className="field" style={{ alignSelf: 'flex-end' }}>
                <span className="ok">{msg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!clientId ? (
        <div className="card muted">בחר לקוח כדי לנהל את המוצרים שלו.</div>
      ) : loading ? (
        <div className="card muted">טוען…</div>
      ) : products.length === 0 ? (
        <div className="card muted">אין עדיין מוצרים ללקוח זה.</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>מוצר</th>
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
                    <button className="btn" onClick={() => startEdit(p)}>
                      עריכה
                    </button>{' '}
                    <button className="btn" onClick={() => remove(p.id)}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
