'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TAG_FIELDS, tagValueLabel } from '@/lib/tags';

type ClientOption = { id: string; name: string };
type Creative = {
  id: string;
  concept: string | null;
  hook: string | null;
  variation: string | null;
  format: string | null;
  status: string | null;
  asset_url: string | null;
  full_asset_url: string | null;
  asset_type: 'image' | 'video' | null;
  meta_creative_id: string | null;
  tags: Record<string, string> | null;
};

// ביצועים פר-קריאטיב — מגיעים מ-/api/metrics group_by=creative (אותה צבירה כמו טבלת Performance)
type MetricRow = {
  key: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  computed: Record<string, number | null>;
};
type FormulaCol = { key: string; label: string; direction: 'higher' | 'lower' | 'neutral' };

const FORMATS = ['video', 'image', 'carousel'];

const nf0 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 });

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function title(c: Creative): string {
  return c.concept || (c.meta_creative_id ? `קריאטיב ${c.meta_creative_id}` : c.id.slice(0, 8));
}

export default function CreativesPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState('');
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formatFilter, setFormatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState(TAG_FIELDS[0].key);
  const [bulkValue, setBulkValue] = useState('');
  const [bulkMsg, setBulkMsg] = useState('');

  const [viewing, setViewing] = useState<Creative | null>(null);

  // ביצועים + מיון + טווח תאריכים
  const [since, setSince] = useState(isoDaysAgo(90));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [sortKey, setSortKey] = useState('spend');
  const [metricsByCreative, setMetricsByCreative] = useState<Map<string, MetricRow>>(new Map());
  const [formulaCols, setFormulaCols] = useState<FormulaCol[]>([]);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        const list: ClientOption[] = d.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId(list[0].id);
      })
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, []);

  function loadCreatives(cid: string) {
    setLoading(true);
    setError('');
    setSelected(new Set());
    fetch(`/api/clients/${cid}/creatives`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setCreatives(d.creatives as Creative[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (clientId) loadCreatives(clientId);
    else setCreatives([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ביצועים פר-קריאטיב — אותה צבירה כמו טבלת Performance (group_by=creative)
  useEffect(() => {
    if (!clientId) {
      setMetricsByCreative(new Map());
      setFormulaCols([]);
      return;
    }
    const p = new URLSearchParams({ client_id: clientId, group_by: 'creative', since, until });
    fetch(`/api/metrics?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const m = new Map<string, MetricRow>();
        for (const row of (d.rows ?? []) as MetricRow[]) m.set(row.key, row);
        setMetricsByCreative(m);
        setFormulaCols((d.formula_columns ?? []) as FormulaCol[]);
      })
      .catch(() => {});
  }, [clientId, since, until]);

  const statuses = useMemo(
    () => [...new Set(creatives.map((c) => c.status).filter(Boolean) as string[])],
    [creatives],
  );

  const filtered = useMemo(
    () =>
      creatives.filter(
        (c) =>
          (!formatFilter || c.format === formatFilter) &&
          (!statusFilter || c.status === statusFilter),
      ),
    [creatives, formatFilter, statusFilter],
  );

  const sortOptions = useMemo(
    () => [
      { key: 'spend', label: 'Spend', dir: 'desc' as const },
      { key: 'ctr', label: 'CTR', dir: 'desc' as const },
      { key: 'cpm', label: 'CPM', dir: 'asc' as const },
      ...formulaCols.map((f) => ({
        key: f.key,
        label: f.label,
        dir: (f.direction === 'lower' ? 'asc' : 'desc') as 'asc' | 'desc',
      })),
    ],
    [formulaCols],
  );

  const sorted = useMemo(() => {
    const dir = sortOptions.find((o) => o.key === sortKey)?.dir ?? 'desc';
    const val = (c: Creative): number | null => {
      const m = metricsByCreative.get(c.id);
      if (!m) return null;
      if (sortKey === 'spend') return m.spend;
      if (sortKey === 'ctr') return m.ctr;
      if (sortKey === 'cpm') return m.impressions > 0 ? m.cpm : null;
      return m.computed?.[sortKey] ?? null;
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // ללא דאטה — בסוף
      if (vb === null) return -1;
      return dir === 'asc' ? va - vb : vb - va;
    });
  }, [filtered, metricsByCreative, sortKey, sortOptions]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bulkOptions = TAG_FIELDS.find((f) => f.key === bulkField)?.options ?? [];

  async function applyBulk() {
    if (selected.size === 0 || !bulkValue) return;
    setBulkMsg('');
    const res = await fetch('/api/creatives/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], tags: { [bulkField]: bulkValue } }),
    });
    const d = await res.json();
    if (!res.ok) {
      setBulkMsg(d.error ?? 'החלת תג נכשלה');
      return;
    }
    setBulkMsg(`הוחל על ${d.updated} קריאטיבים ✓`);
    setSelected(new Set());
    loadCreatives(clientId);
  }

  return (
    <main className="container">
      <div className="breadcrumb">קריאטיבים</div>
      <h1>ספריית קריאטיבים</h1>

      <div className="card">
        <div className="toolbar">
          <div className="field">
            <label>לקוח</label>
            <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— בחר לקוח —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>פורמט</label>
            <select className="select" value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
              <option value="">הכל</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>סטטוס</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">הכל</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
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
          <div className="field">
            <label>מיון לפי</label>
            <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {sortOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 auto', textAlign: 'left' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {filtered.length} קריאטיבים{selected.size > 0 ? ` · ${selected.size} נבחרו` : ''}
            </span>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <strong>תיוג מרובה ({selected.size}):</strong>
          <div className="field">
            <label>שדה</label>
            <select
              className="select"
              value={bulkField}
              onChange={(e) => {
                setBulkField(e.target.value);
                setBulkValue('');
              }}
            >
              {TAG_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ערך</label>
            <select className="select" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
              <option value="">— בחר —</option>
              {bulkOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn primary" onClick={applyBulk} disabled={!bulkValue}>
            החל על {selected.size}
          </button>
          <button className="btn" onClick={() => setSelected(new Set())}>
            נקה בחירה
          </button>
          {bulkMsg && <span className="ok">{bulkMsg}</span>}
        </div>
      )}

      {error && <div className="banner-error">{error}</div>}

      {!clientId ? (
        <div className="card muted">בחר לקוח כדי להציג קריאטיבים.</div>
      ) : loading ? (
        <div className="card muted">טוען…</div>
      ) : filtered.length === 0 ? (
        <div className="card muted">אין קריאטיבים תואמים.</div>
      ) : (
        <div className="creative-grid">
          {sorted.map((c) => {
            const m = metricsByCreative.get(c.id);
            return (
            <div key={c.id} className={`creative-card ${selected.has(c.id) ? 'selected' : ''}`}>
              <input
                type="checkbox"
                className="select-box"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                aria-label="בחר קריאטיב"
              />
              <button type="button" className="thumb" onClick={() => setViewing(c)} title="צפייה בנכס המלא">
                {c.asset_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.asset_url} alt="" />
                ) : (
                  <span className="thumb-empty">אין תצוגה מקדימה</span>
                )}
                {c.format && <span className="thumb-badge">{c.format}</span>}
                {c.asset_type === 'video' && <span className="thumb-play">▶</span>}
              </button>
              <div className="body">
                {m ? (
                  <div className="metric-row">
                    <span><b>Spend</b> {nf2.format(m.spend)}</span>
                    <span><b>Clicks</b> {nf0.format(m.clicks)}</span>
                    <span><b>CTR</b> {nf2.format(m.ctr)}%</span>
                    <span><b>CPM</b> {nf2.format(m.cpm)}</span>
                    {formulaCols.map((fc) => (
                      <span key={fc.key}>
                        <b>{fc.label}</b>{' '}
                        {m.computed?.[fc.key] != null ? nf2.format(m.computed[fc.key] as number) : '—'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="metric-row muted">אין דאטה בטווח</div>
                )}
                <div className="chips">
                  {Object.entries(c.tags ?? {}).map(([k, v]) => (
                    <span key={k} className="chip">
                      {tagValueLabel(k, v)}
                    </span>
                  ))}
                  {Object.keys(c.tags ?? {}).length === 0 && (
                    <span className="muted" style={{ fontSize: '0.76rem' }}>ללא תגים</span>
                  )}
                </div>
                <div className="card-foot">
                  <Link href={`/creatives/${c.id}`} className="meta-name" title={title(c)}>
                    {title(c)}
                  </Link>
                  {c.status && <span className="badge">{c.status}</span>}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="lightbox" onClick={() => setViewing(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setViewing(null)} aria-label="סגור">
              ✕
            </button>
            {viewing.full_asset_url && viewing.asset_type === 'video' ? (
              <video src={viewing.full_asset_url} controls autoPlay className="lightbox-media" />
            ) : viewing.full_asset_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.full_asset_url} alt="" className="lightbox-media" />
            ) : (
              <div className="lightbox-fallback">
                {viewing.asset_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewing.asset_url} alt="" className="lightbox-media" />
                ) : null}
                <p className="muted">
                  {viewing.asset_type === 'video'
                    ? 'נכס הווידאו המלא דורש הרשאת Meta נוספת — מוצגת תמונת התצוגה (poster).'
                    : 'נכס מלא לא זמין'}
                </p>
              </div>
            )}
            <div className="lightbox-caption">{title(viewing)}</div>
          </div>
        </div>
      )}
    </main>
  );
}
