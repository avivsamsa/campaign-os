'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TAG_FIELDS } from '@/lib/tags';

export type CreativeRecord = {
  id: string;
  concept: string | null;
  hook: string | null;
  variation: string | null;
  format: string | null;
  status: string | null;
  asset_url: string | null;
  meta_creative_id: string | null;
  tags: Record<string, string> | null;
};

export type AdUsing = {
  id: string;
  name: string | null;
  status: string | null;
  campaign: string | null;
};

const FORMATS = ['video', 'image', 'carousel'];

export default function CreativeDetail({
  creative,
  adsUsing,
}: {
  creative: CreativeRecord;
  adsUsing: AdUsing[];
}) {
  const router = useRouter();

  const [concept, setConcept] = useState(creative.concept ?? '');
  const [hook, setHook] = useState(creative.hook ?? '');
  const [variation, setVariation] = useState(creative.variation ?? '');
  const [format, setFormat] = useState(creative.format ?? '');
  const [status, setStatus] = useState(creative.status ?? '');
  const [assetUrl, setAssetUrl] = useState(creative.asset_url ?? '');
  const [tags, setTags] = useState<Record<string, string>>(creative.tags ?? {});

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function setTag(field: string, value: string) {
    setTags((prev) => {
      const next = { ...prev };
      if (value === '') delete next[field];
      else next[field] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/creatives/${creative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, hook, variation, format, status, asset_url: assetUrl, tags }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: d.error ?? 'שמירה נכשלה' });
        return;
      }
      setMsg({ ok: true, text: 'נשמר ✓' });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>{concept || (creative.meta_creative_id ? `קריאטיב ${creative.meta_creative_id}` : 'קריאטיב')}</h1>

      <div className="card">
        <h2>פרטי הקריאטיב</h2>
        {msg && <div className={msg.ok ? 'banner-ok' : 'banner-error'}>{msg.text}</div>}

        {assetUrl && (
          <div className="thumb" style={{ height: 180, borderRadius: 8, marginBottom: '1rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}

        <div className="grid-2">
          <div className="field">
            <label>קונספט</label>
            <input className="input" value={concept} onChange={(e) => setConcept(e.target.value)} />
          </div>
          <div className="field">
            <label>Hook</label>
            <input className="input" value={hook} onChange={(e) => setHook(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>וריאציה</label>
            <input className="input" value={variation} onChange={(e) => setVariation(e.target.value)} />
          </div>
          <div className="field">
            <label>פורמט</label>
            <select className="select" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">—</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>סטטוס</label>
            <input className="input" value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div className="field">
            <label>asset_url</label>
            <input className="input" value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} />
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.82rem' }}>
          meta_creative_id: {creative.meta_creative_id ?? '—'}
        </p>
      </div>

      <div className="card">
        <h2>תיוג</h2>
        <div className="grid-2">
          {TAG_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <select className="select" value={tags[f.key] ?? ''} onChange={(e) => setTag(f.key, e.target.value)}>
                <option value="">— ללא —</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'שומר...' : 'שמור'}
        </button>
      </div>

      <div className="card">
        <h2>ads שמשתמשים בקריאטיב ({adsUsing.length})</h2>
        {adsUsing.length === 0 ? (
          <p className="muted">אין ads המקושרים לקריאטיב הזה.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ad</th>
                <th>קמפיין</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {adsUsing.map((a) => (
                <tr key={a.id}>
                  <td>{a.name ?? a.id.slice(0, 8)}</td>
                  <td>{a.campaign ?? '—'}</td>
                  <td>{a.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
