'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Landing() {
  const router = useRouter();
  const [panel, setPanel] = useState<'none' | 'client' | 'agency'>('none');

  // כניסת לקוח — לפי שם הפורטל (slug) → domain/<slug>
  const [slug, setSlug] = useState('');
  function goClient(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (s) router.push(`/${s}`);
  }

  // טופס סוכנות מתעניינת
  const [form, setForm] = useState({ name: '', agency_name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  async function submitAgency(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSending(true);
    try {
      const res = await fetch('/api/agency-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error ?? 'שליחה נכשלה'); return; }
      setSent(true);
    } catch {
      setErr('שגיאת רשת');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="lp">
      <style>{`
        .lp {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem 1.25rem calc(2rem + env(safe-area-inset-bottom));
          gap: 1.5rem;
        }
        .lp-brand { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.02em; color: var(--primary); }
        .lp-soon { font-size: clamp(2.6rem, 12vw, 4.5rem); font-weight: 800; margin: 0; line-height: 1.05; color: var(--text); }
        .lp-tag { color: var(--muted); font-size: 1.05rem; max-width: 34ch; margin: 0 auto; }
        .lp-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; margin-top: 0.5rem; }
        .lp-btn {
          font: inherit; font-weight: 600; font-size: 1rem;
          padding: 0.85rem 1.5rem; border-radius: var(--radius-full); cursor: pointer;
          border: 1px solid var(--border-strong); background: var(--surface); color: var(--text);
          transition: transform var(--duration) var(--ease), border-color var(--duration) var(--ease), background var(--duration) var(--ease);
        }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
        .lp-btn.active { border-color: var(--primary); color: var(--primary); }
        .lp-btn.primary.active { color: #fff; }
        .lp-panel {
          width: 100%; max-width: 420px; text-align: start;
          background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
          padding: 1.25rem; display: flex; flex-direction: column; gap: 0.7rem;
          animation: lpIn 0.3s var(--ease-out);
        }
        @keyframes lpIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .lp-panel h2 { margin: 0; font-size: 1.1rem; }
        .lp-panel .muted { font-size: 0.85rem; margin: 0; }
        .lp-row { display: flex; gap: 0.5rem; }
        .lp-row .input { flex: 1; }
        .lp-ok { text-align: center; padding: 0.5rem 0; color: var(--ok); font-weight: 600; }
        .lp-foot { margin-top: 1rem; font-size: 0.8rem; color: var(--muted-2); display: flex; gap: 1rem; }
        .lp-foot a { color: var(--muted-2); }
      `}</style>

      <div className="lp-brand">Campaign OS</div>
      <h1 className="lp-soon">בקרוב</h1>
      <p className="lp-tag">פלטפורמת ניהול לידים וקמפיינים לסוכנויות ולעסקים.</p>

      <div className="lp-actions">
        <button
          type="button"
          className={`lp-btn primary ${panel === 'client' ? 'active' : ''}`.trim()}
          onClick={() => setPanel(panel === 'client' ? 'none' : 'client')}
        >
          כניסת לקוחות
        </button>
        <button
          type="button"
          className={`lp-btn ${panel === 'agency' ? 'active' : ''}`.trim()}
          onClick={() => setPanel(panel === 'agency' ? 'none' : 'agency')}
        >
          סוכנות? דברו איתנו
        </button>
      </div>

      {panel === 'client' && (
        <form className="lp-panel" onSubmit={goClient}>
          <h2>כניסת לקוחות</h2>
          <p className="muted">הזן/י את שם הפורטל שלך כדי להיכנס.</p>
          <div className="lp-row">
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="שם הפורטל (למשל: bigbagolan)"
              autoFocus
              dir="ltr"
            />
            <button className="lp-btn primary" type="submit" disabled={!slug.trim()}>כניסה</button>
          </div>
        </form>
      )}

      {panel === 'agency' && (
        <form className="lp-panel" onSubmit={submitAgency}>
          <h2>מעוניינים במערכת לסוכנות?</h2>
          {sent ? (
            <div className="lp-ok">קיבלנו! נחזור אליכם בהקדם ✓</div>
          ) : (
            <>
              <p className="muted">השאירו פרטים ונחזור אליכם.</p>
              <input className="input" placeholder="שם מלא*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="input" placeholder="שם הסוכנות" value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} />
              <input className="input" type="email" placeholder="אימייל*" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
              <input className="input" placeholder="טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
              <textarea className="input" rows={2} placeholder="הודעה (אופציונלי)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {err && <div className="banner-error">{err}</div>}
              <button className="lp-btn primary" type="submit" disabled={sending || !form.name.trim() || !form.email.trim()}>
                {sending ? 'שולח…' : 'שליחה'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="lp-foot">
        <a href="/privacy">מדיניות פרטיות</a>
        <a href="/terms">תנאי שימוש</a>
      </div>
    </main>
  );
}
