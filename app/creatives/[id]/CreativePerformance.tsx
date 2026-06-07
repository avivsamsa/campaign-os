'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MetricsResult } from '@/lib/metrics';
import MetricsTable from '@/app/performance/MetricsTable';

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// בלוק ביצועים לרשומת קריאטיב בודד — אותה צבירה כמו טבלת Performance,
// scope לפי creative_id ו-group_by=day → המטריקות המלאות (שורת רולאפ) + פירוק יומי.
export default function CreativePerformance({
  clientId,
  creativeId,
}: {
  clientId: string;
  creativeId: string;
}) {
  const [since, setSince] = useState(isoDaysAgo(90));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [result, setResult] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams({
      client_id: clientId,
      creative_id: creativeId,
      group_by: 'day',
      since,
      until,
    });
    fetch(`/api/metrics?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setResult(null);
        } else {
          setResult(d as MetricsResult);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [clientId, creativeId, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>ביצועים</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>
        שורת הרולאפ = המטריקות המלאות של הקריאטיב; השורות מתחתיה = פירוק יומי.
      </p>
      {error && <div className="banner-error">{error}</div>}
      <div style={{ marginTop: '0.5rem' }}>
        <MetricsTable result={result} loading={loading} />
      </div>
    </div>
  );
}
