'use client';

/**
 * טבלת לידים לפורטל הלקוח — סגנון Monday/Excel:
 *  - status pills צבעוניים (צבע לכל סטטוס), שינוי מיידי עם auto-save.
 *  - עריכת deal_value inline עם auto-save ב-blur/Enter (בלי כפתור "שמור").
 *  - שורת סיכום: ספירה לפי סטטוס + סה"כ הכנסה מעסקאות שנסגרו.
 *  - RTL מסודר, header דביק, hover/flash על שמירה.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, formatPhone, type EnrichedLead } from '@/lib/leads';
import {
  STATUS_COLORS,
  STATUS_COLOR_NAMES,
  type CustomStatus,
  type StatusColor,
} from '@/lib/lead-statuses';
import LeadDrawer from './LeadDrawer';

type RowState = { status: string; deal_value: string; saving: boolean; saved: boolean };

const STATUS_LABEL: Record<string, string> = {
  new: 'ליד חדש',
  no_answer_1: 'אין מענה 1',
  no_answer_2: 'אין מענה 2',
  followup: 'פולואפ',
  meeting_scheduled: 'תואמה פגישה',
  whatsapp: 'ווטסאפ',
  quote_sent: 'הצעת מחיר',
  closed: 'רכישה',
  irrelevant: 'לא רלוונטי',
};

const nfIls = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

export default function PortalLeadsManager({
  initialLeads,
  canEdit,
}: {
  initialLeads: EnrichedLead[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      initialLeads.map((l) => [
        l.id,
        {
          status: l.status,
          deal_value: l.deal_value != null ? String(l.deal_value) : '',
          saving: false,
          saved: false,
        },
      ]),
    ),
  );

  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterAdset, setFilterAdset] = useState('');
  const [filterAd, setFilterAd] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EnrichedLead | null>(null);
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({});
  const [errMsg, setErrMsg] = useState('');
  // פופאפ סכום רכישה — נפתח כשמשנים סטטוס ל"רכישה" (closed) או בעריכת סכום קיים
  const [amountModal, setAmountModal] = useState<{ lead: EnrichedLead; value: string } | null>(null);

  // סטטוסים מותאמים אישית של הלקוח
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [statusModal, setStatusModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<StatusColor>('blue');

  useEffect(() => {
    fetch('/api/portal/statuses')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCustomStatuses(d.statuses as CustomStatus[]); })
      .catch(() => {});
  }, []);

  const customById = useMemo(
    () => new Map(customStatuses.map((s) => [s.id, s])),
    [customStatuses],
  );

  const statusOptions = useMemo(
    () => [
      ...LEAD_STATUSES.map((k) => ({ key: k as string, label: STATUS_LABEL[k] })),
      ...customStatuses.map((s) => ({ key: s.id, label: s.label })),
    ],
    [customStatuses],
  );

  // תווית/צבע לכל מפתח סטטוס — built-in לפי מפה קבועה, מותאם לפי הפלטה
  const statusLabel = (key: string) => STATUS_LABEL[key] ?? customById.get(key)?.label ?? key;
  const pillClass = (key: string) => (customById.get(key) ? 'status-pill' : `status-pill status-${key}`);
  const pillStyle = (key: string): React.CSSProperties | undefined => {
    const c = customById.get(key);
    if (!c) return undefined;
    return { ['--c']: STATUS_COLORS[c.color] ?? STATUS_COLORS.gray } as React.CSSProperties;
  };

  async function addStatus() {
    const label = newLabel.trim();
    if (!label) return;
    const res = await fetch('/api/portal/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, color: newColor }),
    });
    const d = await res.json();
    if (!res.ok) { setErrMsg(d.error ?? 'יצירת סטטוס נכשלה'); return; }
    setCustomStatuses((prev) => [...prev, d.status as CustomStatus]);
    setNewLabel('');
  }

  async function deleteStatus(id: string) {
    if (!confirm('למחוק את הסטטוס? לידים שסומנו בו יחזרו ל"ליד חדש".')) return;
    const res = await fetch(`/api/portal/statuses/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setCustomStatuses((prev) => prev.filter((s) => s.id !== id));
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v.status === id ? { ...v, status: 'new' } : v]),
      ),
    );
  }

  const campaigns = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of initialLeads) if (l.campaign_id) m.set(l.campaign_id, l.campaign_label || l.campaign_id);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialLeads]);

  const adsets = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of initialLeads) {
      if (filterCampaign && l.campaign_id !== filterCampaign) continue;
      if (l.meta_adset_id) m.set(l.meta_adset_id, l.adset_label || l.meta_adset_id);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialLeads, filterCampaign]);

  const ads = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of initialLeads) {
      if (filterCampaign && l.campaign_id !== filterCampaign) continue;
      if (filterAdset && l.meta_adset_id !== filterAdset) continue;
      if (l.ad_id) m.set(l.ad_id, l.ad_label || l.creative_label || l.ad_id);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initialLeads, filterCampaign, filterAdset]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLeads.filter(
      (l) =>
        (!filterCampaign || l.campaign_id === filterCampaign) &&
        (!filterAdset || l.meta_adset_id === filterAdset) &&
        (!filterAd || l.ad_id === filterAd) &&
        (!q ||
          (l.name ?? '').toLowerCase().includes(q) ||
          (l.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))),
    );
  }, [initialLeads, filterCampaign, filterAdset, filterAd, search]);

  // סיכום — ספירה לפי סטטוס + סה"כ נסגר, על בסיס מצב השורות הנוכחי
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let closedRevenue = 0;
    for (const l of filteredLeads) {
      const r = rows[l.id];
      const st = r?.status ?? l.status;
      counts[st] = (counts[st] ?? 0) + 1;
      if (st === 'closed') {
        const dv = Number(r?.deal_value ?? '');
        if (Number.isFinite(dv)) closedRevenue += dv;
      }
    }
    return { counts, closedRevenue };
  }, [filteredLeads, rows]);

  function setRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveLead(id: string, override?: Partial<Pick<RowState, 'status' | 'deal_value'>>) {
    const r = { ...rows[id], ...override };
    setRow(id, { saving: true, saved: false, ...override });
    setErrMsg('');
    try {
      const res = await fetch(`/api/portal/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: r.status,
          deal_value: r.deal_value.trim() === '' ? null : Number(r.deal_value),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrMsg(`שמירה נכשלה: ${d.error ?? res.statusText}`);
        setRow(id, { saving: false });
        return;
      }
      setRow(id, { saving: false, saved: true });
      router.refresh();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setRow(id, { saving: false });
    }
  }

  // שינוי סטטוס — "רכישה" (closed) פותח פופאפ סכום; אחרת נשמר מיד
  function onStatusChange(l: EnrichedLead, newStatus: string) {
    if (newStatus === 'closed') {
      setAmountModal({ lead: l, value: rows[l.id]?.deal_value || '' });
    } else {
      saveLead(l.id, { status: newStatus });
    }
  }

  function confirmAmount() {
    if (!amountModal) return;
    const { lead, value } = amountModal;
    saveLead(lead.id, { status: 'closed', deal_value: value });
    setAmountModal(null);
  }

  const getCount = (l: EnrichedLead) => notesCounts[l.id] ?? l.notes_count ?? 0;

  const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

  return (
    <>
      {errMsg && <div className="banner-error">{errMsg}</div>}

      {initialLeads.length > 0 && (
        <>
          {/* שורת סיכום */}
          <div className="leads-summary">
            <div className="leads-summary-chips">
              <span className="ls-total">{filteredLeads.length} לידים</span>
              {[...LEAD_STATUSES, ...customStatuses.map((s) => s.id)]
                .filter((k) => summary.counts[k])
                .map((k) => (
                  <span
                    key={k}
                    className={customById.get(k) ? 'status-chip' : `status-chip status-${k}`}
                    style={pillStyle(k)}
                  >
                    {statusLabel(k)}
                    <b>{summary.counts[k]}</b>
                  </span>
                ))}
              {canEdit && (
                <button type="button" className="add-status-btn" onClick={() => setStatusModal(true)}>
                  ＋ סטטוס
                </button>
              )}
            </div>
            {summary.closedRevenue > 0 && (
              <div className="ls-revenue">
                סה"כ נסגר <b>₪{nfIls.format(summary.closedRevenue)}</b>
              </div>
            )}
          </div>

          {/* פילטרים */}
          <div className="card leads-filters">
            <div className="toolbar">
              <div className="field">
                <label>קמפיין</label>
                <select className="select" value={filterCampaign} onChange={(e) => { setFilterCampaign(e.target.value); setFilterAdset(''); setFilterAd(''); }}>
                  <option value="">כל הקמפיינים</option>
                  {campaigns.map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                </select>
              </div>
              <div className="field">
                <label>סדרת מודעות</label>
                <select className="select" value={filterAdset} onChange={(e) => { setFilterAdset(e.target.value); setFilterAd(''); }}>
                  <option value="">כל סדרות המודעות</option>
                  {adsets.map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                </select>
              </div>
              <div className="field">
                <label>מודעה</label>
                <select className="select" value={filterAd} onChange={(e) => setFilterAd(e.target.value)}>
                  <option value="">כל המודעות</option>
                  {ads.map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                </select>
              </div>
              <div className="field" style={{ flex: '1 1 200px' }}>
                <label>חיפוש</label>
                <input
                  className="input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="שם או טלפון…"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {initialLeads.length === 0 && <div className="card muted">אין לידים להצגה כרגע.</div>}

      {initialLeads.length > 0 && filteredLeads.length === 0 ? (
        <div className="card muted">אין לידים התואמים את הסינון.</div>
      ) : initialLeads.length > 0 ? (
        <div className="lead-list">
          {filteredLeads.map((l) => {
            const r = rows[l.id];
            const d = l.created_at ? new Date(l.created_at) : null;
            const isClosed = r.status === 'closed';
            const builtin = !customById.get(r.status);
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                className={`lead-row ${builtin ? `status-${r.status}` : ''} ${isClosed ? 'won' : ''}`.trim()}
                style={builtin ? undefined : pillStyle(r.status)}
                onClick={() => setSelected(l)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(l); } }}
              >
                <span className="lead-row-info">
                  <span className="lead-row-name">{l.name ?? '—'}</span>
                  <span className="lead-row-meta">
                    {l.phone && <span dir="ltr">{formatPhone(l.phone)}</span>}
                    {d && <span>· {d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}</span>}
                    {getCount(l) > 0 && <span>· {getCount(l)} הערות</span>}
                  </span>
                </span>
                {isClosed && r.deal_value && (
                  <span className="lead-row-deal">₪{nfIls.format(Number(r.deal_value))}</span>
                )}
                <span className="status-chip lead-row-tag">{statusLabel(r.status)}</span>
                {l.phone && (
                  <div className="row-actions">
                    <a
                      className="row-act call"
                      href={`tel:${l.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="חיוג"
                      title="חיוג"
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>
                    </a>
                    <a
                      className="row-act wa"
                      href={waLink(l.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="וואטסאפ"
                      title="וואטסאפ"
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-2.8.8.8-2.8-.2-.3A8 8 0 1112 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8.9-.1.2-.3.2-.5.1-1.3-.5-2.1-1.2-2.9-2.6-.2-.4.2-.4.6-1.1.1-.2 0-.3 0-.5s-.5-1.3-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.7.8-.9 1.7-.6 2.8.4 1.4 1.3 2.6 2.9 3.7 2.2 1.5 2.2 1 2.6 1 .5 0 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1z"/></svg>
                    </a>
                  </div>
                )}
                <svg className="lead-row-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </div>
            );
          })}
        </div>
      ) : null}

      {amountModal && (
        <div className="lightbox" onClick={() => setAmountModal(null)}>
          <div className="amount-modal" onClick={(e) => e.stopPropagation()}>
            <h3>סכום הרכישה</h3>
            <p className="muted" style={{ margin: 0 }}>{amountModal.lead.name ?? 'ליד'}</p>
            <div className="amount-field">
              <span className="amount-currency">₪</span>
              <input
                autoFocus
                inputMode="decimal"
                placeholder="0"
                value={amountModal.value}
                onChange={(e) => setAmountModal({ ...amountModal, value: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmAmount(); }}
              />
            </div>
            <div className="amount-actions">
              <button className="btn primary" onClick={confirmAmount}>שמירה</button>
              <button className="btn" onClick={() => setAmountModal(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="lightbox" onClick={() => setStatusModal(false)}>
          <div className="amount-modal statuses-modal" onClick={(e) => e.stopPropagation()}>
            <h3>הסטטוסים שלך</h3>
            <div className="custom-status-list">
              {customStatuses.length === 0 && (
                <span className="muted">אין עדיין סטטוסים מותאמים.</span>
              )}
              {customStatuses.map((s) => (
                <span
                  key={s.id}
                  className="status-chip"
                  style={{ ['--c']: STATUS_COLORS[s.color] ?? STATUS_COLORS.gray } as React.CSSProperties}
                >
                  {s.label}
                  <button className="chip-del" onClick={() => deleteStatus(s.id)} aria-label="מחיקה">✕</button>
                </span>
              ))}
            </div>

            <div className="add-status-form">
              <input
                className="input"
                placeholder="שם הסטטוס החדש…"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStatus(); }}
              />
              <div className="color-swatches">
                {STATUS_COLOR_NAMES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${newColor === c ? 'sel' : ''}`}
                    style={{ background: STATUS_COLORS[c] }}
                    onClick={() => setNewColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
              <button className="btn primary" onClick={addStatus} disabled={!newLabel.trim()}>
                הוסף סטטוס
              </button>
            </div>

            <button className="btn" onClick={() => setStatusModal(false)}>סגור</button>
          </div>
        </div>
      )}

      {selected && rows[selected.id] && (
        <LeadDrawer
          lead={selected}
          statusKey={rows[selected.id].status}
          dealValue={rows[selected.id].deal_value}
          canEdit={canEdit}
          statusOptions={statusOptions}
          statusLabel={statusLabel}
          pillClass={pillClass}
          pillStyle={pillStyle}
          waLink={waLink}
          onStatusChange={(ns) => onStatusChange(selected, ns)}
          onEditAmount={() => setAmountModal({ lead: selected, value: rows[selected.id].deal_value || '' })}
          onClose={() => setSelected(null)}
          onNotesCountChange={(id, c) => setNotesCounts((prev) => ({ ...prev, [id]: c }))}
        />
      )}
    </>
  );
}
