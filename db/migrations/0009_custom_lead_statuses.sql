-- פאזה 10 — סטטוסי לידים מותאמים אישית לכל לקוח.
-- מסירים את ה-check הקשיח כדי שאפשר יהיה לשמור סטטוס מותאם (id של lead_statuses).
-- הוולידציה עוברת לשכבת ה-API: status תקין = built-in או סטטוס של אותו לקוח.
alter table leads drop constraint if exists leads_status_check;

create table if not exists lead_statuses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  color text not null default 'gray',
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists lead_statuses_client_idx on lead_statuses(client_id);
alter table lead_statuses enable row level security;
