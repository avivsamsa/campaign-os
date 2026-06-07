'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Client, ClientBrain } from '@/lib/types';
import { validateAccount } from '@/lib/validation';

type Props = {
  client: Client;
  brain: ClientBrain | null;
  /** מסנן אילו כרטיסים מוצגים — לארגון בטאבים. ברירת מחדל: שניהם. הלוגיקה זהה. */
  section?: 'account' | 'brain' | 'both';
};

export default function ClientEditor({ client, brain, section = 'both' }: Props) {
  const router = useRouter();

  // הגדרות חשבון
  const [name, setName] = useState(client.name);
  const [metaAccountId, setMetaAccountId] = useState(client.meta_account_id);
  const [niche, setNiche] = useState(client.niche ?? '');
  const [currency, setCurrency] = useState(client.currency ?? 'ILS');
  const [grossMargin, setGrossMargin] = useState(String(client.gross_margin));
  const [agencyFee, setAgencyFee] = useState(String(client.agency_fee_monthly ?? 0));
  const [accErrors, setAccErrors] = useState<Record<string, string>>({});
  const [accMsg, setAccMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingAcc, setSavingAcc] = useState(false);

  // Brain
  const [audience, setAudience] = useState(brain?.audience ?? '');
  const [language, setLanguage] = useState(brain?.language ?? '');
  const [tone, setTone] = useState(brain?.tone ?? '');
  const [offers, setOffers] = useState((brain?.offers ?? []).join('\n'));
  const [brandMd, setBrandMd] = useState(brain?.brand_md ?? '');
  const [brainMsg, setBrainMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingBrain, setSavingBrain] = useState(false);

  async function saveAccount() {
    const e = validateAccount({ name, meta_account_id: metaAccountId, gross_margin: grossMargin });
    setAccErrors(e);
    if (Object.keys(e).length > 0) return;

    setSavingAcc(true);
    setAccMsg(null);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          meta_account_id: metaAccountId.trim(),
          niche: niche.trim() || null,
          currency: currency.trim() || 'ILS',
          gross_margin: Number(grossMargin),
          agency_fee_monthly: Number(agencyFee) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setAccErrors(data.errors);
        setAccMsg({ ok: false, text: data.error ?? 'שמירה נכשלה' });
        setSavingAcc(false);
        return;
      }
      setAccMsg({ ok: true, text: 'ההגדרות נשמרו ✓' });
      router.refresh();
    } catch (err) {
      setAccMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSavingAcc(false);
    }
  }

  async function saveBrain() {
    setSavingBrain(true);
    setBrainMsg(null);
    try {
      const res = await fetch(`/api/clients/${client.id}/brain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: audience.trim() || null,
          language: language.trim() || null,
          tone: tone.trim() || null,
          offers: offers
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          brand_md: brandMd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBrainMsg({ ok: false, text: data.error ?? 'שמירה נכשלה' });
        setSavingBrain(false);
        return;
      }
      setBrainMsg({ ok: true, text: 'ה-Brain נשמר ✓' });
      router.refresh();
    } catch (err) {
      setBrainMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSavingBrain(false);
    }
  }

  return (
    <>
      {section === 'both' && <h1>{client.name}</h1>}

      {/* הגדרות חשבון */}
      {section !== 'brain' && (
      <div className="card">
        <h2>הגדרות חשבון</h2>
        {accMsg && <div className={accMsg.ok ? 'banner-ok' : 'banner-error'}>{accMsg.text}</div>}

        <div className="field">
          <label>שם הלקוח</label>
          <input
            className={`input ${accErrors.name ? 'invalid' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {accErrors.name && <div className="field-error">{accErrors.name}</div>}
        </div>

        <div className="field">
          <label>Meta Account ID</label>
          <input
            className={`input ${accErrors.meta_account_id ? 'invalid' : ''}`}
            value={metaAccountId}
            onChange={(e) => setMetaAccountId(e.target.value)}
            inputMode="numeric"
          />
          {accErrors.meta_account_id && <div className="field-error">{accErrors.meta_account_id}</div>}
        </div>

        <div className="field">
          <label>נישה</label>
          <input className="input" value={niche} onChange={(e) => setNiche(e.target.value)} />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>מטבע</label>
            <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="ILS">ILS ₪</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
            </select>
          </div>
          <div className="field">
            <label>
              Gross margin <span className="hint">(0 עד 1)</span>
            </label>
            <input
              className={`input ${accErrors.gross_margin ? 'invalid' : ''}`}
              value={grossMargin}
              onChange={(e) => setGrossMargin(e.target.value)}
              inputMode="decimal"
            />
            {accErrors.gross_margin && <div className="field-error">{accErrors.gross_margin}</div>}
          </div>
        </div>

        <div className="field">
          <label>Agency fee חודשי</label>
          <input
            className="input"
            value={agencyFee}
            onChange={(e) => setAgencyFee(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className="btn-row">
          <button className="btn primary" onClick={saveAccount} disabled={savingAcc}>
            {savingAcc ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
      )}

      {/* Client Brain */}
      {section !== 'account' && (
      <div className="card">
        <h2>Client Brain</h2>
        {brainMsg && <div className={brainMsg.ok ? 'banner-ok' : 'banner-error'}>{brainMsg.text}</div>}

        <div className="grid-2">
          <div className="field">
            <label>קהל יעד</label>
            <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <div className="field">
            <label>שפה</label>
            <input className="input" value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>טון</label>
          <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} />
        </div>

        <div className="field">
          <label>
            הצעות <span className="hint">(שורה אחת לכל הצעה)</span>
          </label>
          <textarea
            className="textarea"
            rows={3}
            value={offers}
            onChange={(e) => setOffers(e.target.value)}
          />
        </div>

        <div className="field">
          <label>
            brand_md <span className="hint">(עריכת Markdown גולמי)</span>
          </label>
          <textarea
            className="textarea"
            rows={18}
            value={brandMd}
            onChange={(e) => setBrandMd(e.target.value)}
          />
        </div>

        <div className="btn-row">
          <button className="btn primary" onClick={saveBrain} disabled={savingBrain}>
            {savingBrain ? 'שומר...' : 'שמור Brain'}
          </button>
        </div>
      </div>
      )}
    </>
  );
}
