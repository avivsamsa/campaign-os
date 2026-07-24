-- 0016 — אינדקס חסר על leads. כל טעינת פורטל/אפליקציה שולפת לידים של לקוח
-- ממוינים לפי תאריך; בלי האינדקס הזה Postgres עושה seq-scan על כל הטבלה בכל בקשה.
create index if not exists leads_client_created_idx
  on leads (client_id, created_at desc);
