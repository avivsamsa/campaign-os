'use client';

import { useEffect, useState } from 'react';

type Note = { id: string; body: string; created_at: string };
const dateFmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export default function PortalNotesPanel({
  leadId,
  leadName,
  canEdit,
  onClose,
  onChange,
}: {
  leadId: string;
  leadName: string | null;
  canEdit: boolean;
  onClose: () => void;
  onChange?: (count: number) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/leads/${leadId}/notes`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setNotes(d.notes as Note[]);
          onChange?.(d.notes.length);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function save() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/portal/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? 'שמירה נכשלה');
        return;
      }
      setBody('');
      const next = [d.note as Note, ...notes];
      setNotes(next);
      onChange?.(next.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: '1.25rem 1.5rem', width: 520, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', alignItems: 'stretch' }}>
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>הערות — {leadName || 'ליד'}</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        {canEdit && (
          <>
            <textarea
              className="textarea"
              rows={3}
              placeholder="הוסף הערה (שיחה, מעקב, פגישה, פרטים מהלקוח…)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="btn-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn primary" onClick={save} disabled={saving || !body.trim()}>
                {saving ? 'שומר...' : 'שמור הערה'}
              </button>
            </div>
          </>
        )}

        {error && <div className="banner-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

        <h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '0.95rem' }}>היסטוריה ({notes.length})</h3>
        {loading ? (<p className="muted">טוען…</p>) : notes.length === 0 ? (<p className="muted">אין הערות עדיין.</p>) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notes.map((n) => (
              <li key={n.id} style={{ borderTop: '1px solid var(--border)', padding: '0.6rem 0', fontSize: '0.9rem' }}>
                <div className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>{dateFmt.format(new Date(n.created_at))}</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{n.body}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
