/**
 * מוצרים ורווח — מודל משותף ל-API ולתצוגה.
 * profit_mode:
 *   'margin' → רווח = הכנסה בפועל × margin_pct   (price = מחיר ייחוס)
 *   'fixed'  → רווח = מספר רכישות × profit_amount
 */

export type ProfitMode = 'margin' | 'fixed';

export type Product = {
  id: string;
  name: string;
  profit_mode: ProfitMode;
  price: number | null;
  margin_pct: number | null;
  profit_amount: number | null;
  portal_hidden?: boolean; // true = מוסתר מהפורטל של הלקוח
};

export type ProductInput = {
  name: string;
  profit_mode: ProfitMode;
  price: number | null;
  margin_pct: number | null;
  profit_amount: number | null;
};

function toNum(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ולידציה + נירמול קלט ליצירה/עדכון מוצר. */
export function normalizeProduct(
  body: Record<string, unknown>,
): { value: ProductInput } | { error: string } {
  const name = (body.name as string)?.toString().trim();
  if (!name) return { error: 'שם מוצר חובה' };

  const mode = (body.profit_mode as string)?.toString().trim();
  if (mode !== 'margin' && mode !== 'fixed') return { error: 'profit_mode לא תקין' };

  const price = toNum(body.price);
  const margin_pct = toNum(body.margin_pct);
  const profit_amount = toNum(body.profit_amount);

  if (mode === 'margin') {
    if (margin_pct === null || margin_pct < 0 || margin_pct > 1) {
      return { error: 'אחוז רווח חייב להיות בין 0 ל-1 (למשל 0.4)' };
    }
  } else {
    if (profit_amount === null || profit_amount < 0) {
      return { error: 'סכום רווח למכירה חייב להיות מספר חיובי' };
    }
  }

  return { value: { name, profit_mode: mode, price, margin_pct, profit_amount } };
}

/** רווח נטו לקריאטיב = רווח-מכירות − הוצאה. null אם אין מוצר משויך. */
export function creativeProfit(
  product: Product | null | undefined,
  revenue: number,
  closes: number,
  spend: number,
): number | null {
  if (!product) return null;
  const grossProfit =
    product.profit_mode === 'margin'
      ? revenue * (product.margin_pct ?? 0)
      : closes * (product.profit_amount ?? 0);
  return grossProfit - spend;
}

/** ROAS = הכנסה / הוצאה. null אם אין הוצאה. */
export function roas(revenue: number, spend: number): number | null {
  return spend > 0 ? revenue / spend : null;
}

export type Verdict = 'scale' | 'keep' | 'kill' | 'test' | 'none';

/**
 * פסק דין scorecard לקריאטיב:
 *   ⚪ test  — פחות מסף הוצאה למובהקות (אין מספיק דאטה)
 *   🔴 kill  — רווח שלילי
 *   🟢 scale — רווחי מאוד (רווח ≥ הוצאה, כלומר ROI ≥ 100%)
 *   🟡 keep  — רווחי אך מתון
 *   —  none  — אין מוצר משויך (אי אפשר לחשב רווח)
 */
export function verdict(profit: number | null, spend: number, minSpend: number): Verdict {
  if (profit === null) return 'none';
  if (spend < minSpend) return 'test';
  if (profit <= 0) return 'kill';
  if (profit >= spend) return 'scale';
  return 'keep';
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  scale: '🟢 להגדיל',
  keep: '🟡 להשאיר',
  kill: '🔴 לכבות',
  test: '⚪ אין דאטה',
  none: '—',
};
