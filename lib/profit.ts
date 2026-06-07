/**
 * מנוע הרווח — פאזה 4. מריץ נוסחאות profit_config דרך mathjs.
 *
 * scope = { ...variables, ...baseScope }. הנוסחאות רצות לפי הסדר, וכל תוצאה
 * תקפה נכנסת ל-scope כך שנוסחה הבאה יכולה להשתמש בה.
 *
 * הרצה בטוחה: נוסחה שנכשלת (משתנה חסר / תחביר) או מחזירה ערך לא-סופי
 * (כולל חלוקה באפס → Infinity/NaN) מחזירה null לאותה עמודה בלבד, ולא
 * מפילה את שאר הטבלה.
 */
import { create, all } from 'mathjs';

const math = create(all, {});

export type Direction = 'higher' | 'lower' | 'neutral';

export type Formula = {
  key: string;
  label: string;
  expression: string;
  direction?: Direction;
};

export type ProfitConfig = {
  variables: Record<string, unknown>;
  formulas: Formula[];
};

export type RunResult = {
  values: Record<string, number | null>;
  errors: Record<string, string>;
};

/** המרת ערכי variables למספרים כשאפשר (jsonb עשוי לשמור מחרוזות). */
function coerceVars(vars: Record<string, unknown>): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(vars ?? {})) {
    if (typeof v === 'number') {
      out[k] = v;
    } else {
      const s = String(v).trim();
      const n = Number(s);
      out[k] = s !== '' && Number.isFinite(n) ? n : String(v);
    }
  }
  return out;
}

export function runFormulas(
  baseScope: Record<string, number>,
  variables: Record<string, unknown>,
  formulas: Formula[],
): RunResult {
  const scope: Record<string, unknown> = { ...coerceVars(variables), ...baseScope };
  const values: Record<string, number | null> = {};
  const errors: Record<string, string> = {};

  for (const f of formulas) {
    if (!f.key) continue;
    if (!f.expression || !f.expression.trim()) {
      values[f.key] = null;
      continue;
    }
    try {
      const res = math.evaluate(f.expression, scope);
      const n = typeof res === 'number' ? res : Number(res);
      if (Number.isFinite(n)) {
        values[f.key] = n;
        scope[f.key] = n; // זמין לנוסחאות הבאות
      } else {
        values[f.key] = null; // Infinity / NaN
      }
    } catch (err) {
      values[f.key] = null;
      errors[f.key] = err instanceof Error ? err.message : String(err);
    }
  }

  return { values, errors };
}
