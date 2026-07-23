-- 0015_push_tokens — טוקנים של Expo Push לכל לקוח (התראות על ליד חדש לאפליקציה)
create table if not exists client_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  token       text not null unique,
  platform    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_client_push_tokens_client on client_push_tokens (client_id);

-- כמו שאר הטבלאות: RLS מופעל בלי policies — רק service_role (השרת) ניגש, anon חסום.
alter table client_push_tokens enable row level security;
