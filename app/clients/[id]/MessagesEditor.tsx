'use client';

import { useEffect, useState } from 'react';

type Message = { id: string; title: string; body: string; created_at: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * שליחת עדכונים ללקוח — מופיעים אצלו בפעמון ההתראות בפורטל ובאפליקציה.
 */
export default function MessagesEditor({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch(`/api/clients/${clientId}/messages`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMessages(d.messages as Message[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientId]);

  async function send() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b || sending) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch(`/api/clients/${clientId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, body: b }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'השליחה נכשלה');
      setMessages((prev) => [d.message as Message, ...prev]);
      setTitle('');
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('למחוק את העדכון?')) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/clients/${clientId}/messages/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  return (
    <div className="stack" style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <div className="card" style={{ display: 'grid', gap: 10, padding: 16 }}>
        <h3 style={{ margin: 0 }}>שליחת עדכון ללקוח</h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          העדכון יופיע ללקוח בפעמון ההתראות בפורטל ובאפליקציה.
        </p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת (למשל: דוח חודשי מוכן)"
          maxLength={120}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="תוכן העדכון…"
          rows={4}
          maxLength={2000}
        />
        {error ? <div style={{ color: '#D9534F', fontSize: 13 }}>{error}</div> : null}
        <div>
          <button className="btn" onClick={send} disabled={sending || !title.trim() || !body.trim()}>
            {sending ? 'שולח…' : 'שליחת עדכון'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: '4px 0' }}>עדכונים שנשלחו</h3>
        {loading ? (
          <p className="muted">טוען…</p>
        ) : messages.length === 0 ? (
          <p className="muted">עדיין לא נשלחו עדכונים.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
              <div className="row-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong>{m.title}</strong>
                <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => remove(m.id)}>מחיקה</button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.body}</div>
              <div className="muted" style={{ fontSize: 12 }}>{fmt(m.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
