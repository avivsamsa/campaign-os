'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`למחוק את הלקוח "${name}"? פעולה זו בלתי הפיכה.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`מחיקה נכשלה: ${data.error ?? res.statusText}`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      alert(`מחיקה נכשלה: ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  }

  return (
    <button className="btn danger" onClick={onDelete} disabled={busy}>
      {busy ? '...' : 'מחק'}
    </button>
  );
}
