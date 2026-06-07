'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { GroupBy, MetricsResult } from '@/lib/metrics';
import MetricsTable from './MetricsTable';

type ClientOption = { id: string; name: string };
type CampaignOption = { id: string; name: string | null };
type CreativeOption = { id: string; label: string };

const GROUP_BYS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'יום' },
  { value: 'week', label: 'שבוע' },
  { value: 'creative', label: 'קריאטיב' },
  { value: 'campaign', label: 'קמפיין' },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function PerformancePage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [creatives, setCreatives] = useState<CreativeOption[]>([]);

  const [clientId, setClientId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [since, setSince] = useState(isoDaysAgo(29));
  const [until, setUntil] = useState(isoDaysAgo(0));

  const [result, setResult] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // טעינת לקוחות בעלייה
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, []);

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
      <div className="breadcrumb">
        <Link href="/">בית</Link> / Performance
      </div>
      <h1>Performance</h1>

      <div className="card">
        <div className="toolbar">
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
