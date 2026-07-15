'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/products';

type FormRow = { id: string; name: string | null; product_id: string | null; leads: number };

export default function FormRoutesEditor({
  clientId,
  products,
}: {
  clientId: string;
  products: Product[];
}) {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/lead-forms`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setForms(d.forms as FormRow[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  async function assign(formId: string, productId: string) {
    setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, product_id: productId || null } : f)));
    setMsg('');
    const res = await fetch(`/api/clients/${clientId}/lead-forms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_id: formId, product_id: productId || null }),
    });
    if (res.ok) setMsg('נשמר ✓');
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>ניתוב טפסי לידים → קטגוריות</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
        כל טופס לידים של פייסבוק משויך לקטגוריה (מוצר). הלקוח יראה בפורטל את הלידים לפי קטגוריה.
      </p>
      {msg && <span className="ok">{msg}</span>}

      {loading ? (
        <div className="muted">טוען טפסים…</div>
      ) : forms.length === 0 ? (
        <div className="muted">אין עדיין טפסים. הרץ סנכרון ללקוח כדי למשוך את טפסי הלידים מ-Meta.</div>
      ) : products.length === 0 ? (
        <div className="muted">צור קודם קטגוריות (מוצרים) למעלה, ואז תוכל לשייך אליהן טפסים.</div>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>טופס לידים</th>
                <th style={{ width: 90 }}>לידים</th>
                <th style={{ width: 220 }}>קטגוריה</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id}>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{f.name || f.id}</td>
                  <td>{f.leads}</td>
                  <td>
                    <select
                      className="select"
                      value={f.product_id ?? ''}
                      onChange={(e) => assign(f.id, e.target.value)}
                    >
                      <option value="">— ללא —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
