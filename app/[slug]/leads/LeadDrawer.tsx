'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { formatPhone, type EnrichedLead } from '@/lib/leads';

type Note = { id: string; body: string; created_at: string };

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const dt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export default function LeadDrawer({
  lead,
  statusKey,
  dealValue,
  canEdit,
  statusOptions,
  statusLabel,
  pillClass,
  pillStyle,
  waLink,
  onStatusChange,
  onEditAmount,
  onClose,
  onNotesCountChange,
}: {
  lead: EnrichedLead;
  statusKey: string;
  dealValue: string;
  canEdit: boolean;
  statusOptions: { key: string; label: string }[];
  statusLabel: (k: string) => string;
  pillClass: (k: string) => string;
  pillStyle: (k: string) => CSSProperties | undefined;
  waLink: (phone: string) => string;
  onStatusChange: (newStatus: string) => void;
  onEditAmount: () => void;
  onClose: () => void;
  onNotesCountChange: (leadId: string, count: number) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/leads/${lead.id}/notes`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setNotes(d.notes as Note[]);
          onNotesCountChange(lead.id, d.notes.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  async function addNote() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json();
      if (res.ok) {
        const next = [d.note as Note, ...notes];
        setNotes(next);
        onNotesCountChange(lead.id, next.length);
        setBody('');
      }
    } finally {
      setSaving(false);
    }
  }

  const created = lead.created_at ? dt.format(new Date(lead.created_at)) : '—';
  const isClosed = statusKey === 'closed';

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="lead-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="פרטי ליד">
        <div className="drawer-head">
          <h3>{lead.name ?? 'ליד'}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="סגור">✕</button>
        </div>

        <div className="drawer-body">
          {/* טלפון + פעולות */}
          {lead.phone && (
            <div className="drawer-phone">
              <a href={`tel:${lead.phone}`} dir="ltr" className="drawer-phone-num">{formatPhone(lead.phone)}</a>
              <div className="drawer-phone-actions">
                <a className="pa-btn call" href={`tel:${lead.phone}`} aria-label="חיוג">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>
                </a>
                <a className="pa-btn wa" href={waLink(lead.phone)} target="_blank" rel="noopener noreferrer" aria-label="וואטסאפ">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A8 8 0 1112 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8.9-.1.2-.3.2-.5.1-1.3-.5-2.1-1.2-2.9-2.6-.2-.4.2-.4.6-1.1.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.7.8-.9 1.7-.6 2.8.4 1.4 1.3 2.6 2.9 3.7 2.2 1.5 2.2 1 2.6 1 .5 0 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1z"/></svg>
                </a>
              </div>
            </div>
          )}

          {/* סטטוס */}
          <div className="drawer-field">
            <label>סטטוס</label>
            <div className={pillClass(statusKey)} style={pillStyle(statusKey)}>
              <select
                value={statusKey}
                disabled={!canEdit}
                onChange={(e) => onStatusChange(e.target.value)}
                aria-label="סטטוס"
              >
                {statusOptions.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
              </select>
              <svg className="pill-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* סכום רכישה */}
          {isClosed && (
            <div className="drawer-field">
              <label>סכום הרכישה</label>
              <button type="button" className="deal-tag" onClick={() => canEdit && onEditAmount()} disabled={!canEdit}>
                ₪{dealValue ? nf.format(Number(dealValue)) : '0'}
              </button>
            </div>
          )}

          <div className="drawer-meta">
            <span>נכנס: {created}</span>
            {lead.creative_label && <span>קריאטיב: {lead.creative_label}</span>}
          </div>

          {/* הערות — ציר זמן */}
          <div className="drawer-notes">
            <label>הערות</label>
            {canEdit && (
              <div className="note-add">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="כתוב הערה…"
                  rows={2}
                />
                <button className="btn primary" onClick={addNote} disabled={saving || !body.trim()}>הוסף</button>
              </div>
            )}
            {loading ? (
              <div className="muted">טוען…</div>
            ) : notes.length === 0 ? (
              <div className="muted" style={{ fontSize: '0.85rem' }}>אין עדיין הערות.</div>
            ) : (
              <ul className="note-timeline">
                {notes.map((n) => (
                  <li key={n.id} className="note-entry">
                    <div className="note-time">{dt.format(new Date(n.created_at))}</div>
                    <div className="note-text">{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
