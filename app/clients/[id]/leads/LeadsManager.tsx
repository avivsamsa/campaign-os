'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, type EnrichedLead } from '@/lib/leads';
import LeadNotesPanel from './LeadNotesPanel';

type Props = { clientId: string; initialLeads: EnrichedLead[] };

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

export default function LeadsManager({ clientId, initialLeads }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      initialLeads.map((l) => [
        l.id,
        { status: l.status, deal_value: l.deal_value != null ? String(l.deal_value) : '', saving: false, saved: false },
      ]),
    ),
  );
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [notesFor, setNotesFor] = useState<EnrichedLead | null>(null);
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({});

  function getCount(l: EnrichedLead): number {
    return notesCounts[l.id] ?? l.notes_count ?? 0;
  }

  // פילטרים מדורגים: קמפיין → סדרת מודעות → מודעה
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterAdset, setFilterAdset] = useState('');
  const [filterAd, setFilterAd] = useState('');

  // אופציות נגזרות מתוך הלידים — מסתננות לפי הבחירה בשלב הקודם
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
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: r.status,
          deal_value: r.deal_value.trim() === '' ? null : Number(r.deal_value),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setImportMsg({ ok: false, text: `שמירת ליד נכשלה: ${d.error ?? res.statusText}` });
        setRow(id, { saving: false });
        return;
      }
      setRow(id, { saving: false, saved: true });
      router.refresh();
    } catch (err) {
      setImportMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
      setRow(id, { saving: false });
    }
  }

  async function onImport(file: File) {
    setImportMsg(null);
    const text = await file.text();
    try {
      const res = await fetch(`/api/clients/${clientId}/leads/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      });
      const d = await res.json();
      if (!res.ok) {
        setImportMsg({ ok: false, text: d.error ?? 'ייבוא נכשל' });
        return;
      }
      setImportMsg({ ok: true, text: `יובא ✓ — עודכנו ${d.updated}, דולגו ${d.skipped}` });
      router.refresh();
    } catch (err) {
      setImportMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }

  const csvActions = (
    <>
      <a
        className="btn btn-sm"
        href={`/api/clients/${clientId}/leads/export`}
        title="ייצוא CSV ממולא מראש (תאריך, שם, טלפון, קריאטיב, סטטוס, deal_value)"
      >
        ⬇ ייצוא
      </a>
      <button
        className="btn btn-sm"
        onClick={() => fileRef.current?.click()}
        title="ייבוא CSV — מעדכן status ו-deal_value לפי lead_id / meta_lead_id"
      >
        ⬆ ייבוא
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = '';
        }}
      />
    </>
  );

  return (
    <>
      {importMsg && (
        <div className={importMsg.ok ? 'banner-ok' : 'banner-error'}>{importMsg.text}</div>
      )}

      {initialLeads.length > 0 && (
        <div className="card">
          <div className="toolbar">
            <div className="field">
              <label>קמפיין</label>
              <select
                className="select"
                value={filterCampaign}
                onChange={(e) => {
                  setFilterCampaign(e.target.value);
                  setFilterAdset('');
                  setFilterAd('');
                }}
              >
                <option value="">כל הקמפיינים</option>
                {campaigns.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>סדרת מודעות</label>
              <select
                className="select"
                value={filterAdset}
                onChange={(e) => {
                  setFilterAdset(e.target.value);
                  setFilterAd('');
                }}
              >
                <option value="">כל סדרות המודעות</option>
                {adsets.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>מודעה</label>
              <select className="select" value={filterAd} onChange={(e) => setFilterAd(e.target.value)}>
                <option value="">כל המודעות</option>
                {ads.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="field"
              style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}
            >
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                {filteredLeads.length} מתוך {initialLeads.length}
              </span>
              {csvActions}
            </div>
          </div>
        </div>
      )}

      {initialLeads.length === 0 && (
        <div className="card muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span>אין לידים. סנכרן קמפיין lead, או ייבא CSV.</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>{csvActions}</div>
        </div>
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
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((l) => {
              const r = rows[l.id];
              const d = l.created_at ? new Date(l.created_at) : null;
              return (
                <tr key={l.id}>
                  <td className="m-date">
                    {d ? (
                      <div className="cell-stack">
                        <span>{d.toISOString().slice(0, 10)}</span>
                        <span className="sub">
                          {d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="m-name">
                    <div className="line-clamp-2" title={l.name ?? ''}>
                      {l.name ?? '—'}
                    </div>
                  </td>
                  <td className="m-phone">{l.phone ?? '—'}</td>
                  <td className="m-thumb">
                    {l.creative_thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.creative_thumb}
                        alt=""
                        className="lead-thumb"
                        title={l.creative_label ?? ''}
                      />
                    ) : (
                      <span className="muted" style={{ fontSize: '0.7rem' }}>—</span>
                    )}
                  </td>
                  <td className="m-creative">
                    <div className="line-clamp-2" title={l.creative_label ?? ''}>
                      {l.creative_label ?? '—'}
                    </div>
                  </td>
                  <td className="m-status">
                    <select
                      className="select select-sm"
                      value={r.status}
                      onChange={(e) => setRow(l.id, { status: e.target.value, saved: false })}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="m-deal">
                    <input
                      className="input input-sm"
                      inputMode="decimal"
                      placeholder="deal_value"
                      value={r.deal_value}
                      onChange={(e) => setRow(l.id, { deal_value: e.target.value, saved: false })}
                    />
                  </td>
                  <td className="m-notes">
                    <button
                      className="btn btn-sm"
                      onClick={() => setNotesFor(l)}
                      title="צפייה והוספת הערות"
                    >
                      💬 {getCount(l) > 0 ? getCount(l) : ''}
                    </button>
                  </td>
                  <td className="m-save">
                    <button className="btn btn-sm primary" onClick={() => saveLead(l.id)} disabled={r.saving}>
                      {r.saving ? '...' : r.saved ? '✓' : 'שמור'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : null}

      {notesFor && (
        <LeadNotesPanel
          leadId={notesFor.id}
          leadName={notesFor.name}
          onClose={() => setNotesFor(null)}
          onChange={(count) => setNotesCounts((prev) => ({ ...prev, [notesFor.id]: count }))}
        />
      )}
    </>
  );
}
