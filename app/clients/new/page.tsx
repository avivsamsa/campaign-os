'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { makeBrandSkeleton } from '@/lib/brand';
import { validateAccount } from '@/lib/validation';

type AdAccount = { id: string; name: string };

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // שלב א' — הגדרות חשבון
  const [name, setName] = useState('');
  const [metaAccountId, setMetaAccountId] = useState('');
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adAccountsError, setAdAccountsError] = useState('');

  // טעינת חשבונות המודעות שהטוקן רואה — picker במקום הקלדה ידנית
  useEffect(() => {
    fetch('/api/meta/ad-accounts')
      .then((r) => r.json())
      .then((d) => {
        setAdAccounts(d.accounts ?? []);
        if (d.error) setAdAccountsError(d.error);
      })
      .catch((e) => setAdAccountsError(e instanceof Error ? e.message : String(e)));
  }, []);
  const [niche, setNiche] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [grossMargin, setGrossMargin] = useState('0.5');
  const [agencyFee, setAgencyFee] = useState('0');

  // שלב ב' — Client Brain
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState('');
  const [tone, setTone] = useState('');
  const [offers, setOffers] = useState('');
  const [brandMd, setBrandMd] = useState('');
  const [brandTouched, setBrandTouched] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  function runValidation(): boolean {
    const e = validateAccount({ name, meta_account_id: metaAccountId, gross_margin: grossMargin });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToStep2() {
    if (!runValidation()) return;
    // טעינת השלד מראש בכניסה לשלב ב' (אם המשתמש לא ערך כבר ידנית)
    if (!brandTouched) setBrandMd(makeBrandSkeleton(name));
    setStep(2);
  }

  async function createClient() {
    if (!runValidation()) {
      setStep(1);
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          meta_account_id: metaAccountId.trim(),
          niche: niche.trim() || null,
          currency: currency.trim() || 'ILS',
          gross_margin: Number(grossMargin),
          agency_fee_monthly: Number(agencyFee) || 0,
          brain: {
            audience: audience.trim() || null,
            language: language.trim() || null,
            tone: tone.trim() || null,
            offers: offers
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            brand_md: brandMd,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setSubmitError(data.error ?? 'יצירה נכשלה');
        setSaving(false);
        return;
      }
      router.push(`/clients/${data.client.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <div className="breadcrumb">
        <Link href="/clients">לקוחות</Link> / לקוח חדש
      </div>
      <h1>לקוח חדש</h1>

      <div className="steps">
        <div className={`step ${step === 1 ? 'active' : ''}`}>1. הגדרות חשבון</div>
        <div className={`step ${step === 2 ? 'active' : ''}`}>2. Client Brain</div>
      </div>

      {submitError && <div className="banner-error">{submitError}</div>}

      {step === 1 && (
        <div className="card">
          <h2>הגדרות חשבון</h2>

          <div className="field">
            <label>
              שם הלקוח <span className="hint">(חובה)</span>
            </label>
            <input
              className={`input ${errors.name ? 'invalid' : ''}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מסעדת השף"
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="field">
            <label>
              חשבון מודעות (Meta){' '}
              <span className="hint">
                {adAccounts.length > 0
                  ? '(מתוך החשבונות שהטוקן רואה — בחירה מבטיחה הרשאה נכונה)'
                  : '(הזנה ידנית — ספרות בלבד)'}
              </span>
            </label>
            {adAccounts.length > 0 ? (
              <select
                className={`select ${errors.meta_account_id ? 'invalid' : ''}`}
                value={metaAccountId}
                onChange={(e) => setMetaAccountId(e.target.value)}
              >
                <option value="">— בחר חשבון —</option>
                {adAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={`input ${errors.meta_account_id ? 'invalid' : ''}`}
                value={metaAccountId}
                onChange={(e) => setMetaAccountId(e.target.value)}
                inputMode="numeric"
                placeholder="123456789012345"
              />
            )}
            {errors.meta_account_id && <div className="field-error">{errors.meta_account_id}</div>}
            {adAccountsError && (
              <div className="field-error">לא ניתן לטעון רשימת חשבונות: {adAccountsError}</div>
            )}
          </div>

          <div className="field">
            <label>נישה</label>
            <input
              className="input"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="מסעדות, נדל״ן, אופנה..."
            />
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
                className={`input ${errors.gross_margin ? 'invalid' : ''}`}
                value={grossMargin}
                onChange={(e) => setGrossMargin(e.target.value)}
                inputMode="decimal"
                placeholder="0.5"
              />
              {errors.gross_margin && <div className="field-error">{errors.gross_margin}</div>}
            </div>
          </div>

          <div className="field">
            <label>
              Agency fee חודשי <span className="hint">(לחישוב con_profit בהמשך)</span>
            </label>
            <input
              className="input"
              value={agencyFee}
              onChange={(e) => setAgencyFee(e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>

          <div className="btn-row">
            <button className="btn primary" onClick={goToStep2}>
              המשך ל-Brain →
            </button>
            <Link className="btn" href="/clients">
              ביטול
            </Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Client Brain</h2>

          <div className="grid-2">
            <div className="field">
              <label>קהל יעד</label>
              <input
                className="input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="מי הקהל"
              />
            </div>
            <div className="field">
              <label>שפה</label>
              <input
                className="input"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="עברית, אנגלית..."
              />
            </div>
          </div>

          <div className="field">
            <label>טון</label>
            <input
              className="input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="רשמי / חברי / מקצועי..."
            />
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
              placeholder={'חבילת בסיס\nחבילת פרימיום'}
            />
          </div>

          <div className="field">
            <label>
              brand_md <span className="hint">(Markdown — נטען עם שלד התחלתי)</span>
            </label>
            <textarea
              className="textarea"
              rows={16}
              value={brandMd}
              onChange={(e) => {
                setBrandTouched(true);
                setBrandMd(e.target.value);
              }}
            />
          </div>

          <div className="btn-row">
            <button className="btn" onClick={() => setStep(1)}>
              ← חזרה
            </button>
            <button className="btn primary" onClick={createClient} disabled={saving}>
              {saving ? 'יוצר...' : 'צור לקוח'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
