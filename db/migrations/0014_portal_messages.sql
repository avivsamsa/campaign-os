-- 0014_portal_messages.sql
-- עדכונים/הודעות מהאדמין (הסוכנות) ללקוח — מוצגים בפעמון ההתראות בפורטל ובאפליקציה.

create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists portal_messages_client_created_idx
  on portal_messages (client_id, created_at desc);

-- RLS מופעל ללא policies — השרת ניגש עם service_role (עוקף RLS), כמו שאר הטבלאות.
alter table portal_messages enable row level security;
