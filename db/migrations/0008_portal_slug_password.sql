-- פאזה 9 — פורטל לקוח מבוסס slug + סיסמה (מחליף את מודל ה-token).
-- slug: שם ייחודי ל-URL (domain/<slug>/). ייחודי case-insensitive.
-- portal_password_hash: סיסמה מוצפנת (scrypt$salt$hash) — לעולם לא plaintext.
-- show flags: מה מוצג ללקוח בפורטל (ברירת מחדל: הכל; ייקבע בעריכה בהמשך).
alter table clients add column if not exists slug text;
create unique index if not exists clients_slug_unique on clients (lower(slug)) where slug is not null;

alter table clients add column if not exists portal_password_hash text;
alter table clients add column if not exists portal_show_leads boolean not null default true;
alter table clients add column if not exists portal_show_performance boolean not null default true;
alter table clients add column if not exists portal_show_creatives boolean not null default true;
