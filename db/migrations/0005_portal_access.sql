-- פורטל לקוח — גישה מבוססת token.
-- כל שורה = קישור גישה ייעודי ללקוח, עם הרשאות פר-טוקן.
create table if not exists portal_access (
  token uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  label text,
  can_edit_leads boolean not null default true,
  can_view_metrics boolean not null default false,
  can_view_creatives boolean not null default false,
  created_at timestamptz default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists portal_access_client_idx on portal_access(client_id);

alter table portal_access enable row level security;
