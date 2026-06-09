-- שם של סדרת מודעות (ad set) — כדי לפלטר לידים לפי שם adset קריא ולא ID.
alter table ads add column if not exists meta_adset_name text;
