'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, type EnrichedLead } from '@/lib/leads';

type Props = { clientId: string; initialLeads: EnrichedLead[] };

type RowState = { status: string; deal_value: string; saving: boolean; saved: boolean };

const STATUS_LABEL: Record<string, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  closed: 'נסגר',
  lost: 'אבוד',
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

      {initialLeads.length === 0 ? (
        <div className="card muted">אין לידים. סנכרן קמפיין lead, או ייבא CSV.</div>
      ) : (
        <table className="table table-compact">
          <thead>
            <tr>
              <th style={{ width: 90 }}>תאריך</th>
              <th>שם</th>
              <th style={{ width: 130 }}>טלפון</th>
              <th style={{ width: 44 }} />
              <th>קריאטיב</th>
              <th style={{ width: 130 }}>סטטוס</th>
              <th style={{ width: 110 }}>deal_value</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {initialLeads.map((l) => {
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
