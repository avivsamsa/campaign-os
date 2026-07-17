'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { GroupBy, MetricsResult } from '@/lib/metrics';
import MetricsTable from './MetricsTable';

type ClientOption = { id: string; name: string };
type CampaignOption = { id: string; name: string | null };
type CreativeOption = { id: string; label: string };

// כשמסופק lockedClientId — התצוגה נעולה ללקוח אחד (אזור הלקוח), בלי בורר לקוח.
type Props = { lockedClientId?: string; clientName?: string };

const GROUP_BYS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'יום' },
  { value: 'week', label: 'שבוע' },
  { value: 'creative', label: 'קריאטיב' },
  { value: 'campaign', label: 'קמפיין' },
  { value: 'category', label: 'קטגוריה' },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function PerformanceView({ lockedClientId, clientName }: Props) {
  const locked = Boolean(lockedClientId);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [creatives, setCreatives] = useState<CreativeOption[]>([]);

  const [clientId, setClientId] = useState(lockedClientId ?? '');
  const [campaignId, setCampaignId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [since, setSince] = useState(isoDaysAgo(29));
  const [until, setUntil] = useState(isoDaysAgo(0));

  const [result, setResult] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // טעינת לקוחות בעלייה — רק בתצוגה ראשית (כשאין נעילה)
  useEffect(() => {
    if (locked) return;
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, [locked]);

  // החלפת לקוח מהסיידבר — עדכון ה-scope
  useEffect(() => {
    if (lockedClientId) {
      setClientId(lockedClientId);
      setCampaignId('');
      setCreativeId('');
    }
  }, [lockedClientId]);

  // טעינת אפשרויות scope לפי לקוח (+ קמפיין נבחר לסינון קריאטיבים)
  useEffect(() => {
    if (!clientId) {
      setCampaigns([]);
      setCreatives([]);
      return;
    }
    const qs = campaignId ? `?campaign_id=${campaignId}` : '';
    fetch(`/api/clients/${clientId}/scope${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d.campaigns ?? []);
        setCreatives(d.creatives ?? []);
      })
      .catch(() => setError('טעינת scope נכשלה'));
  }, [clientId, campaignId]);

  const loadMetrics = useCallback(() => {
    if (!clientId) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ client_id: clientId, group_by: groupBy, since, until });
    if (campaignId) params.set('campaign_id', campaignId);
    if (creativeId) params.set('creative_id', creativeId);

    fetch(`/api/metrics?${params.toString()}`)
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
  }, [clientId, campaignId, creativeId, groupBy, since, until]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <main className="container">
      {locked ? (
        <div className="breadcrumb">
          <Link href="/clients">לקוחות</Link> /{' '}
          <Link href={`/clients/${lockedClientId}`}>{clientName ?? 'לקוח'}</Link> / Performance
        </div>
      ) : (
        <div className="breadcrumb">
          <Link href="/adminadmin">בית</Link> / Performance
        </div>
      )}
      <h1>Performance{locked && clientName ? ` — ${clientName}` : ''}</h1>

      <div className="card">
        <div className="toolbar">
          {!locked && (
            <div className="field">
              <label>לקוח</label>
              <select
                className="select"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setCampaignId('');
                  setCreativeId('');
                }}
              >
                <option value="">— בחר לקוח —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label>קמפיין</label>
            <select
              className="select"
              value={campaignId}
              disabled={!clientId}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setCreativeId('');
              }}
            >
              <option value="">כל הקמפיינים</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>קריאטיב</label>
            <select
              className="select"
              value={creativeId}
              disabled={!clientId}
              onChange={(e) => setCreativeId(e.target.value)}
            >
              <option value="">כל הקריאטיבים</option>
              {creatives.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>קיבוץ לפי</label>
            <select
              className="select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              {GROUP_BYS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>מתאריך</label>
            <input
              className="input"
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </div>

          <div className="field">
            <label>עד תאריך</label>
            <input
              className="input"
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <MetricsTable result={result} loading={loading} />
    </main>
  );
}
