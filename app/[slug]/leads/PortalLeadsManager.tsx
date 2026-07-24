'use client';

/**
 * טבלת לידים לפורטל הלקוח — סגנון Monday/Excel:
 *  - status pills צבעוניים (צבע לכל סטטוס), שינוי מיידי עם auto-save.
 *  - עריכת deal_value inline עם auto-save ב-blur/Enter (בלי כפתור "שמור").
 *  - שורת סיכום: ספירה לפי סטטוס + סה"כ הכנסה מעסקאות שנסגרו.
 *  - RTL מסודר, header דביק, hover/flash על שמירה.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
  categories,
  initialCategory,
}: {
  initialLeads: EnrichedLead[];
  canEdit: boolean;
  categories: { id: string; name: string }[];
  initialCategory?: string | null;
}) {
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

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  // קטגוריה מגיעה מהדשבורד (?category=...) → מדלגים על שער הבחירה
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory ?? null);

  // רשימת הלידים בסטייט — כדי שלידים חדשים ייכנסו בזמן אמת (polling) בלי רענון.
  const [leads, setLeads] = useState<EnrichedLead[]>(initialLeads);
  const leadsRef = useRef(initialLeads);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  // סנכרון כשה-props מהשרת מתחדשים (ניווט/כניסה מחדש)
  useEffect(() => { setLeads(initialLeads); }, [initialLeads]);
  // ids של לידים שזה עתה נכנסו — להדגשה/אנימציה
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());

  // כל ליד ברשימה חייב רשומת rows (כולל לידים חדשים) — בלי לדרוס עריכות מקומיות
  useEffect(() => {
    setRows((r) => {
      let changed = false;
      const next = { ...r };
      for (const l of leads) {
        if (!next[l.id]) {
          next[l.id] = {
            status: l.status,
            deal_value: l.deal_value != null ? String(l.deal_value) : '',
            saving: false,
            saved: false,
          };
          changed = true;
        }
      }
      return changed ? next : r;
    });
  }, [leads]);

  // Polling — לידים חדשים (webhook/סנכרון) נכנסים לבד כל 30 שניות, עם אנימציה
  useEffect(() => {
    let alive = true;
    async function poll() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/portal/leads');
        if (!alive || !res.ok) return;
        const d = await res.json();
        const fresh = d.leads as EnrichedLead[] | undefined;
        if (!Array.isArray(fresh)) return;
        const known = new Set(leadsRef.current.map((l) => l.id));
        const added = fresh.filter((l) => !known.has(l.id));
        if (added.length === 0) return;
        setLeads((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          const toAdd = added.filter((l) => !ids.has(l.id));
          if (toAdd.length === 0) return prev;
          return [...toAdd, ...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        });
        setNewIds((s) => {
          const n = new Set(s);
          added.forEach((l) => n.add(l.id));
          return n;
        });
        setTimeout(() => {
          if (!alive) return;
          setNewIds((s) => {
            const n = new Set(s);
            added.forEach((l) => n.delete(l.id));
            return n;
          });
        }, 2000);
      } catch {
        /* שקט — הפולינג הבא ינסה שוב */
      }
    }
    const iv = setInterval(poll, 30000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // קטגוריות עם ספירות (+ "אחר" ללידים ללא קטגוריה) — לשער הבחירה
  const gateCategories = useMemo(() => {
    const withCount = categories.map((c) => ({
      id: c.id,
      name: c.name,
      count: leads.filter((l) => l.category_id === c.id).length,
    }));
    const uncategorized = leads.filter((l) => !l.category_id).length;
    if (uncategorized > 0) withCount.push({ id: '__none__', name: 'אחר', count: uncategorized });
    return withCount.filter((c) => c.count > 0);
  }, [categories, leads]);

  const needsGate = gateCategories.length > 1;

  // הלידים הרלוונטיים לפי הקטגוריה שנבחרה (או הכל אם אין שער)
  const categoryLeads = useMemo(() => {
    if (!needsGate || !selectedCategory) return leads;
    if (selectedCategory === '__none__') return leads.filter((l) => !l.category_id);
    return leads.filter((l) => l.category_id === selectedCategory);
  }, [leads, needsGate, selectedCategory]);

  const selectedCategoryName =
    selectedCategory === '__none__'
      ? 'אחר'
      : categories.find((c) => c.id === selectedCategory)?.name ?? '';
  const [selected, setSelected] = useState<EnrichedLead | null>(null);
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({});
  const [errMsg, setErrMsg] = useState('');
  // פופאפ סכום רכישה — נפתח כשמשנים סטטוס ל"רכישה" (closed) או בעריכת סכום קיים
  const [amountModal, setAmountModal] = useState<{ lead: EnrichedLead; value: string } | null>(null);

  // פופאפ סיבת "לא רלוונטי" — נפתח כשמשנים סטטוס ל-irrelevant. חובה לבחור סיבה.
  type Reason = { id: string; label: string };
  const [reasonModal, setReasonModal] = useState<{
    lead: EnrichedLead;
    category: string | null;
    admin: Reason[];
    client: Reason[];
    loading: boolean;
    showOther: boolean;
    newLabel: string;
    saving: boolean;
  } | null>(null);

  async function openReasonModal(l: EnrichedLead) {
    const category = l.category_id ?? null;
    setReasonModal({ lead: l, category, admin: [], client: [], loading: true, showOther: false, newLabel: '', saving: false });
    try {
      const res = await fetch(`/api/portal/reasons?category=${category ?? ''}`);
      const d = await res.json();
      const admin = (d.admin ?? []) as Reason[];
      const clientR = (d.client ?? []) as Reason[];
      setReasonModal((m) => (m && m.lead.id === l.id
        ? { ...m, admin, client: clientR, loading: false, showOther: admin.length === 0 }
        : m));
    } catch {
      setReasonModal((m) => (m ? { ...m, loading: false, showOther: true } : m));
    }
  }

  function pickReason(reasonId: string) {
    if (!reasonModal) return;
    saveLead(reasonModal.lead.id, { status: 'irrelevant' }, reasonId);
    setReasonModal(null);
  }

  async function addOtherReason() {
    if (!reasonModal) return;
    const label = reasonModal.newLabel.trim();
    if (!label) return;
    setReasonModal({ ...reasonModal, saving: true });
    try {
      const res = await fetch('/api/portal/reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, category: reasonModal.category }),
      });
      const d = await res.json();
      if (!res.ok || !d.reason) { setErrMsg(d.error ?? 'הוספת סיבה נכשלה'); setReasonModal((m) => m && { ...m, saving: false }); return; }
      pickReason(d.reason.id as string);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setReasonModal((m) => m && { ...m, saving: false });
    }
  }

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

  // סינון חיפוש (שם/טלפון) — בסיס הן לאנליטיקות והן לרשימה (בתוך הקטגוריה הנבחרת)
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryLeads;
    const qd = q.replace(/\D/g, '');
    return categoryLeads.filter(
      (l) =>
        (l.name ?? '').toLowerCase().includes(q) ||
        (qd && (l.phone ?? '').replace(/\D/g, '').includes(qd)),
    );
  }, [categoryLeads, search]);

  // הרשימה מסוננת גם לפי פילטר הסטטוס הפעיל (הצ'יפ שנבחר)
  const filteredLeads = useMemo(() => {
    if (!statusFilter) return searchFiltered;
    return searchFiltered.filter((l) => (rows[l.id]?.status ?? l.status) === statusFilter);
  }, [searchFiltered, statusFilter, rows]);

  // אנליטיקות + ספירה לפי סטטוס — מחושבות על כל הלידים בטווח החיפוש (לא מושפעות מפילטר הסטטוס)
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let closedRevenue = 0;
    let closedCount = 0;
    for (const l of searchFiltered) {
      const r = rows[l.id];
      const st = r?.status ?? l.status;
      counts[st] = (counts[st] ?? 0) + 1;
      if (st === 'closed') {
        closedCount += 1;
        const dv = Number(r?.deal_value ?? '');
        if (Number.isFinite(dv)) closedRevenue += dv;
      }
    }
    return { counts, closedRevenue, closedCount, total: searchFiltered.length };
  }, [searchFiltered, rows]);

  function setRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveLead(
    id: string,
    override?: Partial<Pick<RowState, 'status' | 'deal_value'>>,
    reasonId?: string,
  ) {
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
          ...(reasonId ? { reason_id: reasonId } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrMsg(`שמירה נכשלה: ${d.error ?? res.statusText}`);
        setRow(id, { saving: false });
        return;
      }
      // בלי router.refresh() — המצב כבר עודכן אופטימית וה-poll מסנכרן מול השרת.
      // רענון שרת כאן היה מריץ רינדור מלא + שליפת כל הלידים מחדש בכל שמירה.
      setRow(id, { saving: false, saved: true });
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setRow(id, { saving: false });
    }
  }

  // שינוי סטטוס — "רכישה" פותח פופאפ סכום, "לא רלוונטי" פותח פופאפ סיבה; אחרת נשמר מיד
  function onStatusChange(l: EnrichedLead, newStatus: string) {
    if (newStatus === 'closed') {
      setAmountModal({ lead: l, value: rows[l.id]?.deal_value || '' });
    } else if (newStatus === 'irrelevant') {
      openReasonModal(l);
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
    <div className="enter-up">
      {errMsg && <div className="banner-error">{errMsg}</div>}

      <div className="leads-head">
        {selectedCategory && (
          <button
            type="button"
            className="cat-back"
            onClick={() => { setSelectedCategory(null); setStatusFilter(''); setSearch(''); }}
          >
            → כל הלידים
          </button>
        )}
        <h1>{selectedCategory ? selectedCategoryName : 'הלידים שלך'}</h1>
      </div>

      {categoryLeads.length > 0 && (
        <>
          {/* אנליטיקות */}
          <div className="leads-stats">
            <div className="stat">
              <span className="stat-num">{nfIls.format(summary.total)}</span>
              <span className="stat-lbl">לידים</span>
            </div>
            <div className="stat">
              <span className="stat-num">{nfIls.format(summary.closedCount)}</span>
              <span className="stat-lbl">נסגרו</span>
            </div>
            <div className="stat stat-feature">
              <span className="stat-num">₪{nfIls.format(summary.closedRevenue)}</span>
              <span className="stat-lbl">מכירות שנסגרו</span>
            </div>
          </div>

          {/* חיפוש */}
          <div className="leads-search">
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש שם או טלפון…"
            />
          </div>

          {/* פילטר סטטוסים — ממש מעל הלידים */}
          <div className="status-filterbar">
            <button
              type="button"
              className={`status-filter-chip all ${statusFilter === '' ? 'active' : ''}`.trim()}
              onClick={() => setStatusFilter('')}
            >
              הכל <b>{summary.total}</b>
            </button>
            {[...LEAD_STATUSES, ...customStatuses.map((s) => s.id)]
              .filter((k) => summary.counts[k])
              .map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`status-chip status-filter-chip ${!customById.get(k) ? `status-${k}` : ''} ${statusFilter === k ? 'active' : ''}`.trim()}
                  style={pillStyle(k)}
                  onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
                >
                  {statusLabel(k)} <b>{summary.counts[k]}</b>
                </button>
              ))}
            {canEdit && (
              <button type="button" className="add-status-btn" onClick={() => setStatusModal(true)}>
                ＋ סטטוס
              </button>
            )}
          </div>
        </>
      )}

      {categoryLeads.length === 0 && <div className="card muted">אין לידים בקטגוריה זו כרגע.</div>}

      {categoryLeads.length > 0 && filteredLeads.length === 0 ? (
        <div className="card muted">אין לידים התואמים את הסינון.</div>
      ) : categoryLeads.length > 0 ? (
        <div className="lead-list">
          {filteredLeads.map((l) => {
            const r = rows[l.id];
            if (!r) return null;
            const d = l.created_at ? new Date(l.created_at) : null;
            const isClosed = r.status === 'closed';
            const builtin = !customById.get(r.status);
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                className={`lead-row ${builtin ? `status-${r.status}` : ''} ${isClosed ? 'won' : ''} ${newIds.has(l.id) ? 'lead-row-new' : ''}`.trim()}
                style={builtin ? undefined : pillStyle(r.status)}
                onClick={() => setSelected(l)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(l); } }}
              >
                <span className="lead-row-info">
                  <span className="lead-row-name">{l.name ?? '—'}</span>
                  <span className="lead-row-meta">
                    {l.phone && <span dir="ltr">{formatPhone(l.phone)}</span>}
                    {d && (
                      <span>
                        · {d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}{' '}
                        {d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {getCount(l) > 0 && <span>· {getCount(l)} הערות</span>}
                  </span>
                </span>
                {isClosed && r.deal_value && (
                  <span className="lead-row-deal">₪{nfIls.format(Number(r.deal_value))}</span>
                )}
                <span
                  className="status-chip lead-row-status"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {statusLabel(r.status)}
                  {canEdit && (
                    <select
                      className="status-overlay"
                      value={r.status}
                      onChange={(e) => onStatusChange(l, e.target.value)}
                      aria-label="שינוי סטטוס"
                    >
                      {statusOptions.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                    </select>
                  )}
                </span>
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

      {reasonModal && (
        <div className="lightbox" onClick={() => setReasonModal(null)}>
          <div className="amount-modal reason-modal" onClick={(e) => e.stopPropagation()}>
            <h3>למה לא רלוונטי?</h3>
            <p className="muted" style={{ margin: 0 }}>{reasonModal.lead.name ?? 'ליד'}</p>

            {reasonModal.loading ? (
              <div className="muted" style={{ padding: '0.5rem 0' }}>טוען…</div>
            ) : (
              <>
                <div className="reason-list">
                  {reasonModal.admin.map((r) => (
                    <button key={r.id} type="button" className="reason-btn" onClick={() => pickReason(r.id)}>
                      {r.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`reason-btn reason-other ${reasonModal.showOther ? 'open' : ''}`.trim()}
                    onClick={() => setReasonModal({ ...reasonModal, showOther: !reasonModal.showOther })}
                  >
                    אחר…
                  </button>
                </div>

                {reasonModal.showOther && (
                  <div className="reason-other-panel">
                    {reasonModal.client.length > 0 && (
                      <div className="reason-list">
                        {reasonModal.client.map((r) => (
                          <button key={r.id} type="button" className="reason-btn" onClick={() => pickReason(r.id)}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="reason-add">
                      <input
                        className="input"
                        autoFocus
                        placeholder="סיבה חדשה…"
                        value={reasonModal.newLabel}
                        onChange={(e) => setReasonModal({ ...reasonModal, newLabel: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') addOtherReason(); }}
                      />
                      <button
                        className="btn primary"
                        onClick={addOtherReason}
                        disabled={!reasonModal.newLabel.trim() || reasonModal.saving}
                      >
                        הוסף
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <button className="btn" onClick={() => setReasonModal(null)}>ביטול</button>
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
    </div>
  );
}
