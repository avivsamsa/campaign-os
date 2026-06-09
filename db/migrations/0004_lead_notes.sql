-- הערות פר ליד (היסטוריית אינטראקציה — שיחות, מעקב, וכו').
-- מחיקת ליד מוחקת את ההערות שלו (cascade).
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists lead_notes_lead_created_idx
  on lead_notes(lead_id, created_at desc);

alter table lead_notes enable row level security;
