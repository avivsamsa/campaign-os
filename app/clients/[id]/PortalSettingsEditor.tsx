'use client';

import { useEffect, useState } from 'react';

type Settings = {
  slug: string | null;
  has_password: boolean;
  show_leads: boolean;
  show_performance: boolean;
  show_creatives: boolean;
};

export default function PortalSettingsEditor({ clientId }: { clientId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/api/clients/${clientId}/portal-settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setSettings(d as Settings);
        setSlug(d.slug ?? '');
      })
      .catch(() => {});
  }, [clientId]);

  async function save(patch: Record<string, unknown>, successText: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: d.error ?? 'שמירה נכשלה' });
        return;
      }
      setMsg({ ok: true, text: successText });
      // רענון מצב
      const r2 = await fetch(`/api/clients/${clientId}/portal-settings`).then((x) => x.json());
      setSettings(r2 as Settings);
      setSlug(r2.slug ?? '');
      setPassword('');
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <div className="card muted">טוען הגדרות פורטל…</div>;

  const link = settings.slug ? `${origin}/${settings.slug}` : null;
  const active = settings.slug && settings.has_password;

  return (
    <div className="card">
      <h2>פורטל לקוח</h2>
      {msg && <div className={msg.ok ? 'banner-ok' : 'banner-error'}>{msg.text}</div>}

      <div className="field">
        <label>כתובת הפורטל (slug)</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="muted" dir="ltr">{origin}/</span>
          <input
            className="input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="bigbagolan"
            dir="ltr"
            style={{ maxWidth: 220 }}
          />
          <button className="btn" onClick={() => save({ slug }, 'הכתובת נשמרה ✓')} disabled={saving}>
            שמור כתובת
          </button>
        </div>
        <div className="hint">אותיות אנגליות קטנות, ספרות ומקפים. השאר ריק כדי לכבות את הפורטל.</div>
      </div>

      <div className="field">
        <label>סיסמת כניסה {settings.has_password && <span className="hint">(מוגדרת — הזן חדשה כדי להחליף)</span>}</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="input"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={settings.has_password ? '••••••' : 'סיסמה חדשה'}
            style={{ maxWidth: 220 }}
          />
          <button
            className="btn"
            onClick={() => save({ password }, 'הסיסמה נשמרה ✓')}
            disabled={saving || !password}
          >
            שמור סיסמה
          </button>
        </div>
      </div>

      <div className="field">
        <label>מה מוצג ללקוח</label>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          {([
            ['show_leads', 'לידים'],
            ['show_performance', 'ביצועים'],
            ['show_creatives', 'קריאטיבים'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) => save({ [key]: e.target.checked }, 'עודכן ✓')}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {link && (
        <div className="field">
          <label>לינק לשליחה ללקוח</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <code style={{ direction: 'ltr', background: 'var(--surface-2)', padding: '0.4rem 0.6rem', borderRadius: 6 }}>
              {link}
            </code>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(link)}>
              העתק
            </button>
          </div>
          {!active && <div className="hint">הפורטל לא פעיל עד שתגדיר גם slug וגם סיסמה.</div>}
        </div>
      )}
    </div>
  );
}
