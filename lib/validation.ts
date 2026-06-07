/**
 * ולידציית שדות חשבון הלקוח (שלב א'). משותפת ל-UI ול-API.
 * מקבלת ערכים כמחרוזות (כפי שמגיעים מהטופס) ומחזירה מפת שגיאות לפי שם שדה.
 */
export type AccountInput = {
  name?: string;
  meta_account_id?: string;
  gross_margin?: string | number;
};

export function validateAccount(input: AccountInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = (input.name ?? '').toString().trim();
  if (!name) errors.name = 'שם חובה';

  const metaId = (input.meta_account_id ?? '').toString().trim();
  if (!metaId) errors.meta_account_id = 'Meta Account ID חובה';
  else if (!/^\d+$/.test(metaId)) errors.meta_account_id = 'ספרות בלבד';

  const gmRaw = (input.gross_margin ?? '').toString().trim();
  const gm = Number(gmRaw);
  if (gmRaw === '' || Number.isNaN(gm)) errors.gross_margin = 'מספר חובה';
  else if (gm < 0 || gm > 1) errors.gross_margin = 'בטווח 0 עד 1';

  return errors;
}
