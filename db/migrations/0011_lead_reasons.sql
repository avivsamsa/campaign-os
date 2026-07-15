-- פאזה 12 — סיבות "לא רלוונטי" פר לקוח + קטגוריה.
-- כשמסמנים ליד "לא רלוונטי" בפורטל קופץ פופאפ חובה לבחירת סיבה.
-- הסיבות מוגדרות פר קטגוריה (מוצר): admin מגדיר רשימת בסיס, והלקוח מוסיף "אחר".
-- reason_id נשמר על הליד → מאפשר גרף התפלגות סיבות לאופטימיזציה.
create table if not exists lead_reasons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,  -- קטגוריה (null = כלל-לקוח / ללא קטגוריה)
  label text not null,
  source text not null default 'client',                       -- 'admin' | 'client'
  created_at timestamptz default now()
);
create index if not exists lead_reasons_scope_idx on lead_reasons(client_id, product_id);

-- מונע כפילות סיבה זהה באותה קטגוריה (product_id null → מטופל באפליקציה).
create unique index if not exists lead_reasons_uniq
  on lead_reasons(client_id, product_id, label)
  where product_id is not null;

alter table leads add column if not exists reason_id uuid references lead_reasons(id) on delete set null;
create index if not exists leads_reason_id_idx on leads(reason_id);

-- RLS מופעל בלי policies — נועל את ה-anon; השרת עובד עם service_role שעוקף RLS.
alter table lead_reasons enable row level security;
