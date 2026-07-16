-- פאזה 14 — לידים של סוכנויות שמתעניינות במערכת (דף הנחיתה בדומיין הראשי).
-- טופס ציבורי; נשמר לכאן לצורך מכירה עתידית של המערכת לסוכנויות.
create table if not exists agency_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  agency_name text,
  email text not null,
  phone text,
  message text,
  created_at timestamptz default now()
);
create index if not exists agency_leads_created_idx on agency_leads(created_at desc);

-- RLS מופעל בלי policies — נועל anon; השרת עובד עם service_role שעוקף RLS.
alter table agency_leads enable row level security;
