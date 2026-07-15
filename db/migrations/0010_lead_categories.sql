-- פאזה 11 — קטגוריות לידים (=מוצרים) עם ניתוב לפי טופס לידים של פייסבוק.
-- קטגוריה = מוצר (טבלת products הקיימת). ליד משויך לקטגוריה דרך הטופס שלו.
-- form_id נשמר על הליד; lead_form_routes ממפה טופס → מוצר (קטגוריה).
alter table leads add column if not exists form_id text;
create index if not exists leads_form_id_idx on leads(form_id);

-- מטמון טפסי הלידים של הלקוח (נמשך מ-Meta בסנכרון) — למסך השיוך בניהול.
create table if not exists lead_forms (
  id text primary key,                -- Meta form_id
  client_id uuid references clients(id) on delete cascade,
  name text,
  synced_at timestamptz default now()
);
create index if not exists lead_forms_client_idx on lead_forms(client_id);

-- ניתוב: טופס → קטגוריה (מוצר). טופס אחד מנותב לקטגוריה אחת.
create table if not exists lead_form_routes (
  form_id text primary key,
  client_id uuid references clients(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists lead_form_routes_client_idx on lead_form_routes(client_id);
