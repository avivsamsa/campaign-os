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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {accesses.map((a) => (
              <div
                key={a.token}
                className="card"
                style={{
                  margin: 0,
                  padding: '1rem 1.1rem',
                  opacity: a.revoked_at ? 0.6 : 1,
                  border: a.revoked_at ? '1px solid var(--border)' : '1px solid var(--border)',
                }}
              >
                <div className="row-between" style={{ marginBottom: '0.75rem', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>
                      {a.label ?? <span className="muted">ללא תווית</span>}
                    </div>
                    <div className="muted" style={{ fontSize: '0.78rem' }}>
                      נוצר {fmt.format(new Date(a.created_at))}
                      {a.last_seen_at && ` · נצפה ${fmt.format(new Date(a.last_seen_at))}`}
                    </div>
                  </div>
                  {a.revoked_at ? (
                    <span className="badge" style={{ background: 'var(--surface-2)' }}>בוטל</span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>פעיל</span>
                  )}
                </div>

                {/* URL + copy */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', alignItems: 'center' }}>
                  <code
                    style={{
                      flex: 1,
                      fontSize: '0.76rem',
                      padding: '0.4rem 0.6rem',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      direction: 'ltr',
                    }}
                  >
                    {urlFor(a.token)}
                  </code>
                  <button className="btn btn-sm" onClick={() => copy(a.token)} disabled={!!a.revoked_at}>
                    {copiedToken === a.token ? 'הועתק ✓' : 'העתק'}
                  </button>
                </div>

                {/* Permission toggles */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.65rem 0.8rem',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '0.85rem',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', cursor: a.revoked_at ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={a.can_edit_leads}
                      disabled={!!a.revoked_at}
                      onChange={(e) => update(a.token, { can_edit_leads: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    עריכת לידים
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', cursor: a.revoked_at ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={a.can_view_metrics}
                      disabled={!!a.revoked_at}
                      onChange={(e) => update(a.token, { can_view_metrics: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    צפייה בביצועים
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', cursor: a.revoked_at ? 'not-allowed' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={a.can_view_creatives}
                      disabled={!!a.revoked_at}
                      onChange={(e) => update(a.token, { can_view_creatives: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    צפייה בקריאטיבים
                  </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {a.revoked_at ? (
                    <button className="btn btn-sm" onClick={() => update(a.token, { revoked: false })}>שחזר</button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => update(a.token, { revoked: true })}>בטל</button>
                  )}
                  <button className="btn btn-sm danger" onClick={() => remove(a.token)}>מחק</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
