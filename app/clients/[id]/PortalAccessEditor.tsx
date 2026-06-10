'use client';

import { useEffect, useState } from 'react';

type Access = {
  token: string;
  label: string | null;
  can_edit_leads: boolean;
  can_view_metrics: boolean;
  can_view_creatives: boolean;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export default function PortalAccessEditor({ clientId }: { clientId: string }) {
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/portal-access`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAccesses(d.access as Access[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  async function createAccess() {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? 'יצירה נכשלה');
        return;
      }
      setNewLabel('');
      load();
    } finally {
      setCreating(false);
    }
  }

  async function update(token: string, patch: Partial<Access> & { revoked?: boolean }) {
    const res = await fetch(`/api/portal-access/${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'עדכון נכשל');
      return;
    }
    load();
  }

  async function remove(token: string) {
    if (!confirm('למחוק לצמיתות את קישור הגישה? פעולה זו בלתי הפיכה.')) return;
    const res = await fetch(`/api/portal-access/${token}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'מחיקה נכשלה');
      return;
    }
    load();
  }

  function urlFor(token: string) {
    return `${origin}/portal/${token}`;
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  }

  return (
    <div className="card">
      <h2>פורטל לקוח</h2>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        קישורי גישה שיתאפשרו ללקוח לראות ולנהל את הלידים שלו, בלי סיסמה. שלח קישור (WhatsApp/אימייל), ובטל בכל רגע.
      </p>

      {error && <div className="banner-error">{error}</div>}

      {/* יצירת קישור חדש */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end', marginTop: '0.5rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>תווית (לזיהוי שלך)</label>
          <input className="input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="לדוגמה: דני - מנהל מכירות" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <button className="btn primary" onClick={createAccess} disabled={creating}>
            {creating ? '...' : '+ צור קישור גישה'}
          </button>
        </div>
      </div>

      {/* רשימת קישורים */}
      <div style={{ marginTop: '1.25rem' }}>
        {loading ? (
          <p className="muted">טוען…</p>
        ) : accesses.length === 0 ? (
          <p className="muted">אין עדיין קישורי גישה.</p>
        ) : (
          <table className="table table-compact">
            <thead>
              <tr>
                <th>תווית</th>
                <th>קישור</th>
                <th style={{ width: 90 }}>עריכת לידים</th>
                <th style={{ width: 130 }}>נוצר</th>
                <th style={{ width: 130 }}>נצפה לאחרונה</th>
                <th style={{ width: 80 }}>סטטוס</th>
                <th style={{ width: 160 }} />
              </tr>
            </thead>
            <tbody>
              {accesses.map((a) => (
                <tr key={a.token} style={a.revoked_at ? { opacity: 0.55 } : undefined}>
                  <td>{a.label ?? '—'}</td>
                  <td>
                    <code style={{ fontSize: '0.78rem' }}>{urlFor(a.token)}</code>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={a.can_edit_leads}
                      disabled={!!a.revoked_at}
                      onChange={(e) => update(a.token, { can_edit_leads: e.target.checked })}
                    />
                  </td>
                  <td className="sub">{fmt.format(new Date(a.created_at))}</td>
                  <td className="sub">{a.last_seen_at ? fmt.format(new Date(a.last_seen_at)) : '—'}</td>
                  <td>{a.revoked_at ? <span className="muted">בוטל</span> : <span className="ok">פעיל</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => copy(a.token)} disabled={!!a.revoked_at}>
                        {copiedToken === a.token ? 'הועתק ✓' : 'העתק'}
                      </button>
                      {a.revoked_at ? (
                        <button className="btn btn-sm" onClick={() => update(a.token, { revoked: false })}>שחזר</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => update(a.token, { revoked: true })}>בטל</button>
                      )}
                      <button className="btn btn-sm danger" onClick={() => remove(a.token)}>מחק</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
