'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { formatPhone, type EnrichedLead } from '@/lib/leads';

type NoteMeta = { from?: string; to?: string; amount?: number | null; reason?: string | null };
type Note = { id: string; body: string; kind?: string; meta?: NoteMeta | null; created_at: string };

const isManual = (n: Note) => (n.kind ?? 'note') === 'note';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const dt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' });
const dtShort = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// זמן יחסי בעברית ("לפני 3 ימים") — לתצוגה קריאה במקום תאריך טכני
function relativeHe(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'הרגע';
  if (min < 60) return `לפני ${min} דק׳`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שע׳`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'לפני חודש' : `לפני ${months} חודשים`;
}

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
  // portal ל-body: המגירה חייבת לצאת מכל ancestor עם transform/position
  // (למשל .enter-up) כדי שה-scrim (position:fixed) יכסה את כל המסך נכון.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/portal/leads/${lead.id}/notes`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          const items = d.notes as Note[];
          setNotes(items);
          onNotesCountChange(lead.id, items.filter(isManual).length);
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
        onNotesCountChange(lead.id, next.filter(isManual).length);
        setBody('');
      }
    } finally {
      setSaving(false);
    }
  }

  const isClosed = statusKey === 'closed';
  const isIrrelevant = statusKey === 'irrelevant';

  // תיאור אירוע ליומן הפעילות לפי סוג
  function entryView(n: Note): { cls: string; text: string } {
    const m = n.meta ?? {};
    switch (n.kind) {
      case 'status':
        return { cls: 'ev-status', text: `סטטוס: ${statusLabel(m.from ?? '')} ← ${statusLabel(m.to ?? '')}` };
      case 'purchase':
        return {
          cls: 'ev-purchase',
          text: `סומן רכישה${m.amount != null ? ` · ₪${nf.format(Number(m.amount))}` : ''}`,
        };
      case 'irrelevant':
        return { cls: 'ev-irrelevant', text: `לא רלוונטי${m.reason ? ` · ${m.reason}` : ''}` };
      case 'created':
        return { cls: 'ev-created', text: 'הליד נכנס' };
      default:
        return { cls: 'ev-note', text: n.body };
    }
  }

  // ציר זמן משולב: הערות + אירועים (החדש למעלה) + כניסת הליד בתחתית
  const timeline: Note[] = [
    ...notes,
    ...(lead.created_at
      ? [{ id: '__created__', body: '', kind: 'created', meta: null, created_at: lead.created_at } as Note]
      : []),
  ];

  if (!mounted) return null;

  return createPortal(
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="lead-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="פרטי ליד">
        <span className="drawer-grabber" aria-hidden="true" />
        <div className="drawer-head">
          <div className="drawer-head-main">
            <h3>{lead.name ?? 'ליד'}</h3>
            {lead.created_at && (
              <span className="drawer-sub">
                נכנס {relativeHe(lead.created_at)} · {dtShort.format(new Date(lead.created_at))}
              </span>
            )}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="סגור">✕</button>
        </div>

        <div className="drawer-body">
          {/* רצועת הקשר קומפקטית: טלפון + פעולות + סטטוס */}
          <div className="drawer-context">
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
            <div className="drawer-status-row">
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
              {isClosed && (
                <button type="button" className="deal-tag" onClick={() => canEdit && onEditAmount()} disabled={!canEdit}>
                  ₪{dealValue ? nf.format(Number(dealValue)) : '0'}
                </button>
              )}
            </div>
            {isIrrelevant && lead.reason_label && (
              <div className="drawer-reason">סיבה: <b>{lead.reason_label}</b></div>
            )}
          </div>

          {/* יומן הליד — העיקר: תיעוד וקריאת היסטוריה */}
          <div className="drawer-notes">
            <div className="notes-head">
              <label>יומן הליד</label>
              {notes.length > 0 && <span className="notes-count">{notes.length}</span>}
            </div>
            {canEdit && (
              <div className="note-add">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="מה קרה בשיחה? רשום כאן…"
                  rows={3}
                />
                <button className="btn primary note-add-btn" onClick={addNote} disabled={saving || !body.trim()}>
                  הוסף הערה
                </button>
              </div>
            )}
            {loading ? (
              <div className="muted">טוען…</div>
            ) : (
              <ul className="note-timeline">
                {timeline.map((n) => {
                  const ev = entryView(n);
                  return (
                    <li key={n.id} className={`note-entry ${ev.cls}`}>
                      <div className="note-time">{relativeHe(n.created_at)} · {dt.format(new Date(n.created_at))}</div>
                      <div className={isManual(n) ? 'note-text' : 'note-event'}>{ev.text}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* מקור הליד — הקשר משני, לא מתחרה על תשומת הלב */}
          {lead.creative_label && (
            <div className="drawer-source">מקור: {lead.creative_label}</div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
