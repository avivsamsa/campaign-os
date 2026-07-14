-- פאזה 8 — מוצרים ורווח (יסוד ל-scorecard וללמידה).
-- כל קריאטיב מוכר מוצר אחד. למוצר יש הגדרת רווח בשני מצבים (toggle):
--   margin: רווח = הכנסה בפועל × margin_pct  (price = מחיר ייחוס/מילוי-מראש)
--   fixed : רווח = מספר רכישות × profit_amount
-- "רכישה" = ליד status='closed' + deal_value — נשען על המנגנון הקיים.
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  profit_mode text not null default 'margin' check (profit_mode in ('margin', 'fixed')),
  price numeric,          -- margin mode: מחיר ייחוס
  margin_pct numeric,     -- margin mode: 0..1
  profit_amount numeric,  -- fixed mode: ₪ רווח לרכישה
  created_at timestamptz default now()
);
create index if not exists idx_products_client on products(client_id);
alter table products enable row level security;

-- שיוך מוצר לקריאטיב (אחד לכל קריאטיב כרגע).
alter table creatives add column if not exists product_id uuid references products(id) on delete set null;

-- סף הוצאה למובהקות scorecard (מתחתיו "אין מספיק דאטה").
alter table clients add column if not exists min_spend_significance numeric default 250;
