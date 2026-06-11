'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GroupBy, MetricsResult } from '@/lib/metrics';
import MetricsTable from '@/app/performance/MetricsTable';

const GROUP_BYS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'יום' },
  { value: 'week', label: 'שבוע' },
  { value: 'creative', label: 'קריאטיב' },
  { value: 'campaign', label: 'קמפיין' },
];

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function PortalPerformance({ token }: { token: string }) {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [since, setSince] = useState(isoDaysAgo(29));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [result, setResult] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const p = new URLSearchParams({ group_by: groupBy, since, until });
    fetch(`/api/portal/${token}/metrics?${p.toString()}`)
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
  }, [token, groupBy, since, until]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <div className="field">
            <label>קיבוץ לפי</label>
            <select className="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              {GROUP_BYS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>מתאריך</label>
            <input className="input" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
          <div className="field">
            <label>עד תאריך</label>
            <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <MetricsTable result={result} loading={loading} />
    </>
  );
}
