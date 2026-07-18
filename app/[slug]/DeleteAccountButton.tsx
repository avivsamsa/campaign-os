'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteAccountButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function confirmDelete() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/portal/account', { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error ?? 'המחיקה נכשלה');
        setBusy(false);
        return;
      }
      if (d.demo) {
        setMsg('בפורטל הדגמה המחיקה מושבתת (הדגמה בלבד).');
        setBusy(false);
        return;
      }
      router.replace(`/${slug}`);
      router.refresh();
    } catch {
      setMsg('שגיאת רשת');
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="portal-delete-link" onClick={() => setOpen(true)}>
        מחיקת חשבון
      </button>
      {open && (
        <div className="lightbox" onClick={() => !busy && setOpen(false)}>
          <div className="amount-modal" onClick={(e) => e.stopPropagation()}>
            <h3>מחיקת חשבון</h3>
            <p className="muted" style={{ margin: 0 }}>
              הגישה שלך לפורטל תימחק ותנותק/י מיד. הלידים נשמרים אצל הסוכנות. כדי לחזור תצטרך/י
              לפנות לסוכנות. הפעולה בלתי הפיכה.
            </p>
            {msg && <div className="banner-error">{msg}</div>}
            <div className="amount-actions">
              <button className="btn" onClick={() => setOpen(false)} disabled={busy}>
                ביטול
              </button>
              <button className="btn danger" onClick={confirmDelete} disabled={busy}>
                {busy ? 'מוחק…' : 'מחק חשבון'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
