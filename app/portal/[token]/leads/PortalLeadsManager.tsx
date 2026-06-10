'use client';

/**
 * גרסת LeadsManager עבור פורטל לקוח.
 * - מציג את אותם פילטרים, preview, וטבלה כמו במערכת הניהול.
 * - קורא ל-API פורטל (token בנתיב) במקום ל-API ניהול.
 * - בלי CSV import/export ובלי ייצוא מסיבי — שמירה inline בלבד.
 * - canEdit=false → השדות נעולים לקריאה בלבד (העמודה "שמור" תיעלם).
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, type EnrichedLead } from '@/lib/leads';
import PortalNotesPanel from './PortalNotesPanel';

type RowState = { status: string; deal_value: string; saving: boolean; saved: boolean };

const STATUS_LABEL: Record<string, string> = {
  new: 'ליד חדש',
  no_answer_1: 'אין מענה 1',
  no_answer_2: 'אין מענה 2',
  followup: 'פולואפ',
  meeting_scheduled: 'תואמה פגישה',
  whatsapp: 'התכתבות בווטסאפ',
  quote_sent: 'נשלחה הצעת מחיר',
  closed: 'נסגר',
  irrelevant: 'לא רלוונטי',
};

export default function PortalLeadsManager({
  token,
  initialLeads,
  canEdit,
}: {
  token: string;
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
  const [notesFor, setNotesFor] = useState<EnrichedLead | null>(null);
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({});
  const [errMsg, setErrMsg] = useState('');

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

  const filteredLeads = useMemo(
    () =>
      initialLeads.filter(
        (l) =>
          (!filterCampaign || l.campaign_id === filterCampaign) &&
          (!filterAdset || l.meta_adset_id === filterAdset) &&
          (!filterAd || l.ad_id === filterAd),
      ),
    [initialLeads, filterCampaign, filterAdset, filterAd],
  );

  function setRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveLead(id: string) {
    const r = rows[id];
    setRow(id, { saving: true, saved: false });
    setErrMsg('');
    try {
      const res = await fetch(`/api/portal/${token}/leads/${id}`, {
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

  const getCount = (l: EnrichedLead) => notesCounts[l.id] ?? l.notes_count ?? 0;

  return (
    <>
      {errMsg && <div className="banner-error">{errMsg}</div>}

      {initialLeads.length > 0 && (
        <div className="card">
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
            <div className="field" style={{ flex: '1 1 auto', textAlign: 'left' }}>
              <span className="muted" style={{ fontSize: '0.82rem' }}>{filteredLeads.length} מתוך {initialLeads.length}</span>
            </div>
          </div>
        </div>
      )}

      {initialLeads.length === 0 && (
        <div className="card muted">אין לידים להצגה כרגע.</div>
      )}

      {initialLeads.length > 0 && filteredLeads.length === 0 ? (
        <div className="card muted">אין לידים התואמים את הסינון.</div>
      ) : initialLeads.length > 0 ? (
        <div className="table-scroll">
          <table className="table table-compact">
            <thead>
              <tr>
                <th style={{ width: 110 }}>תאריך</th>
                <th>שם</th>
                <th style={{ width: 130 }}>טלפון</th>
                <th style={{ width: 72 }} />
                <th>קריאטיב</th>
                <th style={{ width: 140 }}>סטטוס</th>
                <th style={{ width: 110 }}>deal_value</th>
                <th style={{ width: 80 }}>הערות</th>
                {canEdit && <th style={{ width: 80 }} />}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => {
                const r = rows[l.id];
                const d = l.created_at ? new Date(l.created_at) : null;
                return (
                  <tr key={l.id}>
                    <td>
                      {d ? (
                        <div className="cell-stack">
                          <span>{d.toISOString().slice(0, 10)}</span>
                          <span className="sub">{d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="line-clamp-2" title={l.name ?? ''}>{l.name ?? '—'}</div>
                    </td>
                    <td>{l.phone ?? '—'}</td>
                    <td>
                      {l.creative_thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.creative_thumb} alt="" className="lead-thumb" title={l.creative_label ?? ''} />
                      ) : (
                        <span className="muted" style={{ fontSize: '0.7rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="line-clamp-2" title={l.creative_label ?? ''}>{l.creative_label ?? '—'}</div>
                    </td>
                    <td>
                      <select className="select select-sm" value={r.status} disabled={!canEdit} onChange={(e) => setRow(l.id, { status: e.target.value, saved: false })}>
                        {LEAD_STATUSES.map((s) => (<option key={s} value={s}>{STATUS_LABEL[s]}</option>))}
                      </select>
                    </td>
                    <td>
                      <input className="input input-sm" inputMode="decimal" disabled={!canEdit} value={r.deal_value} onChange={(e) => setRow(l.id, { deal_value: e.target.value, saved: false })} />
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => setNotesFor(l)} title="צפייה והוספת הערות">
                        💬 {getCount(l) > 0 ? getCount(l) : ''}
                      </button>
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-sm primary" onClick={() => saveLead(l.id)} disabled={r.saving}>
                          {r.saving ? '...' : r.saved ? '✓' : 'שמור'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {notesFor && (
        <PortalNotesPanel
          token={token}
          leadId={notesFor.id}
          leadName={notesFor.name}
          canEdit={canEdit}
          onClose={() => setNotesFor(null)}
          onChange={(count) => setNotesCounts((prev) => ({ ...prev, [notesFor.id]: count }))}
        />
      )}
    </>
  );
}
