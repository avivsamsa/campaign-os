'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Result = {
  account_id: string;
  campaigns: number;
  ads: number;
  creatives: number;
  daily_metrics: number;
  leads: number;
  rows_written: number;
  lead_warning?: string;
};

export default function SyncButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? 'סנכרון נכשל' });
        return;
      }
      const r = data.result as Result;
      const warn = r.lead_warning ? ` · ⚠ לידים: ${r.lead_warning}` : '';
      setMsg({
        ok: true,
        text: `סונכרן ✓ — קמפיינים ${r.campaigns}, ads ${r.ads}, creatives ${r.creatives}, daily_metrics ${r.daily_metrics}, leads ${r.leads} · סה"כ ${r.rows_written} שורות${warn}`,
      });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>סנכרון Meta</h2>
        <button className="btn primary" onClick={run} disabled={busy}>
          {busy ? 'מסנכרן...' : 'סנכרן עכשיו'}
        </button>
      </div>
      {msg && (
        <div className={msg.ok ? 'banner-ok' : 'banner-error'} style={{ marginTop: '1rem' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
