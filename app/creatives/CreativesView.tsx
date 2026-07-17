'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TAG_FIELDS, tagValueLabel } from '@/lib/tags';
import {
  type Product,
  creativeProfit,
  roas as calcRoas,
  verdict as calcVerdict,
  VERDICT_LABEL,
} from '@/lib/products';

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
  product_id: string | null;
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
  leads: number;
  cpc: number | null;
  cpl: number | null;
  hook_rate: number | null;
  thruplay_rate: number | null;
  frequency: number | null;
  revenue: number;
  closes: number;
  computed: Record<string, number | null>;
};
type FormulaCol = { key: string; label: string; direction: 'higher' | 'lower' | 'neutral' };

const FORMATS = ['video', 'image', 'carousel'];

// הסבר של משפט אחד לכל מדד — מוצג כ-tooltip בריחוף על כותרת/תווית.
const METRIC_INFO: Record<string, string> = {
  spend: 'סך ההוצאה על הקריאטיב בטווח שנבחר.',
  leads: 'מספר הלידים האמיתיים שהקריאטיב הביא (מטבלת הלידים).',
  cpl: 'עלות לליד — הוצאה ÷ לידים. ככל שנמוך יותר, הקריאטיב יעיל יותר במכירה.',
  clicks: 'מספר הקליקים על המודעה.',
  cpc: 'עלות לקליק — הוצאה ÷ קליקים. נמוך יותר = תשומת לב זולה יותר.',
  ctr: 'אחוז ההקלקה — כמה מהחשיפות הפכו לקליק. גבוה = יצירתיב מושך.',
  cpm: 'עלות לאלף חשיפות — יעילות הרכש. עלייה מרמזת על שחיקה.',
  hook_rate: 'אחוז מי שעצרו לצפות 3 שניות מתוך החשיפות — כוח ה-Hook (וידאו בלבד).',
  thruplay_rate: 'אחוז מי שצפו עד הסוף / 15 שניות — כמה הסרטון מחזיק (וידאו בלבד).',
  frequency: 'כמה פעמים בממוצע אדם ראה את המודעה (חשיפות ÷ reach). גבוה = סיכון שחיקה.',
};

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

// מקור התמונה לתצוגה — לווידאו ה-poster (asset_url), לתמונה הנכס המלא ובנפילה ה-thumbnail.
function assetSrc(c: Creative): string | undefined {
  return (c.asset_type === 'video' ? c.asset_url : c.full_asset_url || c.asset_url) ?? undefined;
}

// קובץ וידאו מנגן (fbcdn) — רק URL מדיה מוחלט שאינו עמוד facebook.com.
function playableVideo(c: Creative): string | null {
  const u = c.full_asset_url;
  return u && /^https?:\/\//.test(u) && !u.includes('facebook.com') ? u : null;
}
// לינק צפייה בפייסבוק — כשאין source מנגן. עמיד גם ל-permalink יחסי (/reel/…).
function watchUrl(c: Creative): string | null {
  let u = c.full_asset_url;
  if (!u) return null;
  if (u.startsWith('/')) u = `https://www.facebook.com${u}`;
  return u.includes('facebook.com') ? u : null;
}

// כשמסופק lockedClientId — הגלריה נעולה ללקוח אחד (אזור הלקוח), בלי בורר לקוח.
type Props = { lockedClientId?: string; clientName?: string };

export default function CreativesView({ lockedClientId, clientName }: Props) {
  const locked = Boolean(lockedClientId);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState(lockedClientId ?? '');
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
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  // tooltip ממוקם ב-position:fixed כדי לא להיחתך ע"י ה-overflow של הטבלה.
  function showTip(e: React.MouseEvent, key: string) {
    const text = METRIC_INFO[key];
    if (!text) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ text, x: r.left + r.width / 2, y: r.bottom + 6 });
  }
  const hideTip = () => setTip(null);

  // ביצועים + מיון + טווח תאריכים
  const [since, setSince] = useState(isoDaysAgo(90));
  const [until, setUntil] = useState(isoDaysAgo(0));
  const [sortKey, setSortKey] = useState('spend');
  const [metricsByCreative, setMetricsByCreative] = useState<Map<string, MetricRow>>(new Map());
  const [formulaCols, setFormulaCols] = useState<FormulaCol[]>([]);

  // מוצרים + סף מובהקות — ל-scorecard (רווח/ROAS/פסק דין)
  const [products, setProducts] = useState<Product[]>([]);
  const [minSpend, setMinSpend] = useState(250);

  useEffect(() => {
    if (locked) return;
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        const list: ClientOption[] = d.clients ?? [];
        setClients(list);
        if (list.length > 0) setClientId(list[0].id);
      })
      .catch(() => setError('טעינת לקוחות נכשלה'));
  }, [locked]);

  // החלפת לקוח מהסיידבר
  useEffect(() => {
    if (lockedClientId) setClientId(lockedClientId);
  }, [lockedClientId]);

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

  // מוצרי הלקוח — לשיוך ולחישוב רווח/פסק דין
  useEffect(() => {
    if (!clientId) {
      setProducts([]);
      setMinSpend(250);
      return;
    }
    fetch(`/api/clients/${clientId}/products`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setProducts((d.products ?? []) as Product[]);
        setMinSpend(Number(d.min_spend_significance ?? 250));
      })
      .catch(() => {});
  }, [clientId]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  // scorecard פר קריאטיב — רווח, ROAS, פסק דין (מהמוצר המשויך + revenue/closes)
  const scoreOf = (c: Creative) => {
    const m = metricsByCreative.get(c.id);
    const product = c.product_id ? productById.get(c.product_id) ?? null : null;
    const revenue = m?.revenue ?? 0;
    const closes = m?.closes ?? 0;
    const spend = m?.spend ?? 0;
    const profit = creativeProfit(product, revenue, closes, spend);
    return {
      product,
      profit,
      roas: calcRoas(revenue, spend),
      verdict: calcVerdict(profit, spend, minSpend),
    };
  };

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
      { key: 'profit', label: 'רווח', dir: 'desc' as const },
      { key: 'roas', label: 'ROAS', dir: 'desc' as const },
      { key: 'leads', label: 'לידים', dir: 'desc' as const },
      { key: 'cpl', label: 'CPL', dir: 'asc' as const },
      { key: 'cpc', label: 'CPC', dir: 'asc' as const },
      { key: 'hook_rate', label: 'Hook %', dir: 'desc' as const },
      { key: 'thruplay_rate', label: 'ThruPlay %', dir: 'desc' as const },
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
      if (sortKey === 'profit') return scoreOf(c).profit;
      if (sortKey === 'roas') return scoreOf(c).roas;
      const m = metricsByCreative.get(c.id);
      if (!m) return null;
      if (sortKey === 'spend') return m.spend;
      if (sortKey === 'leads') return m.leads;
      if (sortKey === 'cpl') return m.cpl;
      if (sortKey === 'cpc') return m.cpc;
      if (sortKey === 'hook_rate') return m.hook_rate;
      if (sortKey === 'thruplay_rate') return m.thruplay_rate;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, metricsByCreative, sortKey, sortOptions, productById, minSpend]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // שיוך מוצר לקריאטיב — עדכון אופטימי + PATCH
  async function setCreativeProduct(creativeId: string, productId: string) {
    setCreatives((prev) =>
      prev.map((c) => (c.id === creativeId ? { ...c, product_id: productId || null } : c)),
    );
    await fetch(`/api/creatives/${creativeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId || null }),
    }).catch(() => {});
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
      {locked ? (
        <div className="breadcrumb">
          <Link href="/clients">לקוחות</Link> /{' '}
          <Link href={`/clients/${lockedClientId}`}>{clientName ?? 'לקוח'}</Link> / קריאטיבים
        </div>
      ) : (
        <div className="breadcrumb">קריאטיבים</div>
      )}
      <h1>ספריית קריאטיבים{locked && clientName ? ` — ${clientName}` : ''}</h1>

      <div className="card">
        <div className="toolbar">
          {!locked && (
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
          )}
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
          <div className="field">
            <label>תצוגה</label>
            <div className="view-toggle" role="group" aria-label="מצב תצוגה">
              <button
                type="button"
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
              >
                גלריה
              </button>
              <button
                type="button"
                className={view === 'table' ? 'active' : ''}
                onClick={() => setView('table')}
              >
                טבלה
              </button>
            </div>
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
      ) : view === 'grid' ? (
        <div className="creative-grid">
          {sorted.map((c) => {
            const m = metricsByCreative.get(c.id);
            const s = scoreOf(c);
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
                {c.asset_url || c.full_asset_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetSrc(c)} alt="" />
                ) : (
                  <span className="thumb-empty">אין תצוגה מקדימה</span>
                )}
                {c.format && <span className="thumb-badge">{c.format}</span>}
                {c.asset_type === 'video' && <span className="thumb-play">▶</span>}
              </button>
              <div className="body">
                <div className="score-row">
                  <span className={`verdict verdict-${s.verdict}`}>{VERDICT_LABEL[s.verdict]}</span>
                  <select
                    className="product-select"
                    value={c.product_id ?? ''}
                    onChange={(e) => setCreativeProduct(c.id, e.target.value)}
                    title="מוצר משויך"
                  >
                    <option value="">— מוצר —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {m ? (
                  <div className="metric-row">
                    <span><b>Spend</b> {nf2.format(m.spend)}</span>
                    <span><b>רווח</b> {s.profit != null ? nf2.format(s.profit) : '—'}</span>
                    <span><b>ROAS</b> {s.roas != null ? nf2.format(s.roas) : '—'}</span>
                    <span><b>לידים</b> {nf0.format(m.leads)}</span>
                    <span><b>CPL</b> {m.cpl != null ? nf2.format(m.cpl) : '—'}</span>
                    <span><b>Clicks</b> {nf0.format(m.clicks)}</span>
                    <span><b>CPC</b> {m.cpc != null ? nf2.format(m.cpc) : '—'}</span>
                    <span><b>CTR</b> {nf2.format(m.ctr)}%</span>
                    <span><b>CPM</b> {nf2.format(m.cpm)}</span>
                    <span><b>Hook</b> {m.hook_rate != null ? `${nf2.format(m.hook_rate)}%` : '—'}</span>
                    <span><b>ThruPlay</b> {m.thruplay_rate != null ? `${nf2.format(m.thruplay_rate)}%` : '—'}</span>
                    <span><b>Freq</b> {m.frequency != null ? nf2.format(m.frequency) : '—'}</span>
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
      ) : (
        <div className="table-scroll">
          <table className="table table-compact creatives-table">
            <thead>
              <tr>
                <th className="col-select" aria-label="בחירה" />
                <th className="col-thumb">תצוגה</th>
                <th style={{ textAlign: 'right' }}>שם המודעה</th>
                <th>פסק דין</th>
                <th style={{ textAlign: 'right' }}>מוצר</th>
                <th
                  className="sortable"
                  aria-sort={sortKey === 'profit' ? 'descending' : undefined}
                  onClick={() => setSortKey('profit')}
                >
                  רווח{sortKey === 'profit' && <span className="sort-caret"> ▾</span>}
                </th>
                <th
                  className="sortable"
                  aria-sort={sortKey === 'roas' ? 'descending' : undefined}
                  onClick={() => setSortKey('roas')}
                >
                  ROAS{sortKey === 'roas' && <span className="sort-caret"> ▾</span>}
                </th>
                {[
                  { key: 'spend', label: 'Spend', sortable: true },
                  { key: 'leads', label: 'לידים', sortable: true },
                  { key: 'cpl', label: 'CPL', sortable: true },
                  { key: 'clicks', label: 'Clicks', sortable: false },
                  { key: 'cpc', label: 'CPC', sortable: true },
                  { key: 'ctr', label: 'CTR', sortable: true },
                  { key: 'cpm', label: 'CPM', sortable: true },
                  { key: 'hook_rate', label: 'Hook %', sortable: true },
                  { key: 'thruplay_rate', label: 'ThruPlay %', sortable: true },
                  { key: 'frequency', label: 'Freq', sortable: false },
                  ...formulaCols.map((fc) => ({ key: fc.key, label: fc.label, sortable: true })),
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`${col.sortable ? 'sortable' : ''}${METRIC_INFO[col.key] ? ' has-tip' : ''}`}
                    aria-sort={sortKey === col.key ? 'descending' : undefined}
                    aria-label={METRIC_INFO[col.key] ? `${col.label} — ${METRIC_INFO[col.key]}` : undefined}
                    onClick={col.sortable ? () => setSortKey(col.key) : undefined}
                    onMouseEnter={(e) => showTip(e, col.key)}
                    onMouseLeave={hideTip}
                  >
                    {col.label}
                    {sortKey === col.key && <span className="sort-caret"> ▾</span>}
                  </th>
                ))}
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const m = metricsByCreative.get(c.id);
                const src = assetSrc(c);
                const s = scoreOf(c);
                return (
                  <tr key={c.id} className={selected.has(c.id) ? 'selected' : undefined}>
                    <td className="col-select">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                        aria-label="בחר קריאטיב"
                      />
                    </td>
                    <td className="col-thumb">
                      <button
                        type="button"
                        className="table-thumb"
                        onClick={() => setViewing(c)}
                        title="צפייה בנכס המלא"
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" />
                        ) : (
                          <span className="table-thumb-empty">—</span>
                        )}
                        {c.asset_type === 'video' && <span className="table-thumb-play">▶</span>}
                      </button>
                    </td>
                    <td className="col-name">
                      <Link href={`/creatives/${c.id}`} className="table-name" title={title(c)}>
                        {title(c)}
                      </Link>
                    </td>
                    <td>
                      <span className={`verdict verdict-${s.verdict}`}>{VERDICT_LABEL[s.verdict]}</span>
                    </td>
                    <td className="col-product">
                      <select
                        className="product-select"
                        value={c.product_id ?? ''}
                        onChange={(e) => setCreativeProduct(c.id, e.target.value)}
                        title="מוצר משויך"
                      >
                        <option value="">— מוצר —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>{s.profit != null ? nf2.format(s.profit) : '—'}</td>
                    <td>{s.roas != null ? nf2.format(s.roas) : '—'}</td>
                    <td>{m ? nf2.format(m.spend) : '—'}</td>
                    <td>{m ? nf0.format(m.leads) : '—'}</td>
                    <td>{m?.cpl != null ? nf2.format(m.cpl) : '—'}</td>
                    <td>{m ? nf0.format(m.clicks) : '—'}</td>
                    <td>{m?.cpc != null ? nf2.format(m.cpc) : '—'}</td>
                    <td>{m ? `${nf2.format(m.ctr)}%` : '—'}</td>
                    <td>{m ? nf2.format(m.cpm) : '—'}</td>
                    <td>{m?.hook_rate != null ? `${nf2.format(m.hook_rate)}%` : '—'}</td>
                    <td>{m?.thruplay_rate != null ? `${nf2.format(m.thruplay_rate)}%` : '—'}</td>
                    <td>{m?.frequency != null ? nf2.format(m.frequency) : '—'}</td>
                    {formulaCols.map((fc) => (
                      <td key={fc.key}>
                        {m?.computed?.[fc.key] != null ? nf2.format(m.computed[fc.key] as number) : '—'}
                      </td>
                    ))}
                    <td>{c.status ? <span className="badge">{c.status}</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div className="lightbox" onClick={() => setViewing(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setViewing(null)} aria-label="סגור">
              ✕
            </button>
            {viewing.asset_type === 'video' ? (
              playableVideo(viewing) ? (
                <video src={playableVideo(viewing) as string} controls autoPlay className="lightbox-media" />
              ) : (
                <div className="lightbox-fallback">
                  {viewing.asset_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={viewing.asset_url} alt="" className="lightbox-media" />
                  ) : null}
                  {watchUrl(viewing) ? (
                    <a
                      href={watchUrl(viewing) as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn primary"
                    >
                      ▶ פתח בפייסבוק
                    </a>
                  ) : (
                    <p className="muted">Meta לא חושף את קובץ הווידאו — מוצגת תמונת התצוגה.</p>
                  )}
                </div>
              )
            ) : viewing.full_asset_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.full_asset_url} alt="" className="lightbox-media" />
            ) : (
              <div className="lightbox-fallback">
                {viewing.asset_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewing.asset_url} alt="" className="lightbox-media" />
                ) : null}
                <p className="muted">נכס מלא לא זמין</p>
              </div>
            )}
            <div className="lightbox-caption">{title(viewing)}</div>
          </div>
        </div>
      )}

      {tip && (
        <div className="metric-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </main>
  );
}
