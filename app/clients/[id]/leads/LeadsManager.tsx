'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, type EnrichedLead } from '@/lib/leads';

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

  return (
    <>
      <div className="card">
        <div className="row-between" style={{ marginBottom: 0 }}>
          <h2 style={{ margin: 0 }}>צינור גיליון / CSV</h2>
          <div className="btn-row" style={{ marginTop: 0 }}>
            <a className="btn" href={`/api/clients/${clientId}/leads/export`}>
              ⬇ ייצוא CSV
            </a>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              ⬆ ייבוא CSV
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
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
          ייצא CSV ממולא מראש (תאריך, שם, טלפון, קריאטיב), הלקוח ממלא <b>status</b> ו-<b>deal_value</b>,
          וייבא חזרה. <b>נקודת החיבור האוטומטי ל-Google Sheets</b> תיכנס באותו חוזה נתונים (ראה{' '}
          <code>lib/leadsheet.ts</code>).
        </p>
        {importMsg && (
          <div className={importMsg.ok ? 'banner-ok' : 'banner-error'} style={{ marginTop: '1rem' }}>
            {importMsg.text}
          </div>
        )}
      </div>

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
            <div className="field" style={{ flex: '1 1 auto', textAlign: 'left' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {filteredLeads.length} מתוך {initialLeads.length} לידים
              </span>
            </div>
          </div>
        </div>
      )}

      {initialLeads.length === 0 ? (
        <div className="card muted">אין לידים. סנכרן קמפיין lead, או ייבא CSV.</div>
      ) : filteredLeads.length === 0 ? (
        <div className="card muted">אין לידים התואמים את הסינון.</div>
      ) : (
        <table className="table table-compact">
          <thead>
            <tr>
              <th style={{ width: 90 }}>תאריך</th>
              <th>שם</th>
              <th style={{ width: 130 }}>טלפון</th>
              <th style={{ width: 72 }} />
              <th>קריאטיב</th>
              <th style={{ width: 130 }}>סטטוס</th>
              <th style={{ width: 110 }}>deal_value</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((l) => {
              const r = rows[l.id];
              return (
                <tr key={l.id}>
                  <td>{l.created_at?.slice(0, 10)}</td>
                  <td>{l.name ?? '—'}</td>
                  <td>{l.phone ?? '—'}</td>
                  <td>
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
                  <td className="truncate" title={l.creative_label ?? ''}>
                    {l.creative_label ?? '—'}
                  </td>
                  <td>
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
                  <td>
                    <input
                      className="input input-sm"
                      inputMode="decimal"
                      value={r.deal_value}
                      onChange={(e) => setRow(l.id, { deal_value: e.target.value, saved: false })}
                    />
                  </td>
                  <td>
                    <button className="btn btn-sm primary" onClick={() => saveLead(l.id)} disabled={r.saving}>
                      {r.saving ? '...' : r.saved ? '✓' : 'שמור'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
