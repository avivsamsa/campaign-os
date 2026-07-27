-- 0017 — הסתרת קטגוריה (מוצר) מהפורטל של הלקוח.
-- כשמסומן true: הקטגוריה + הלידים שלה לא מוצגים ללקוח (דשבורד, טאבים, רשימה, KPI).
-- ניהול פנימי (אדמין) עדיין רואה הכל.
alter table products add column if not exists portal_hidden boolean not null default false;
