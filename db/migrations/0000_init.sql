create extension if not exists "pgcrypto";

-- ניקוי — מוחק טבלאות קיימות כדי לאפשר הרצה חוזרת נקייה (cascade מטפל ב-FK).
drop table if exists daily_metrics cascade;
drop table if exists leads cascade;
drop table if exists ads cascade;
drop table if exists creatives cascade;
drop table if exists campaigns cascade;
drop table if exists profit_config cascade;
drop table if exists client_brain cascade;
drop table if exists sync_log cascade;
drop table if exists clients cascade;

-- שכבה 1
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meta_account_id text not null,
  niche text,                                       -- לקיבוץ ידע פר-נישה, לא למדידה
  currency text default 'ILS',
  gross_margin numeric not null default 0.5,        -- 0..1, קבוע הרווח הגולמי
  agency_fee_monthly numeric default 0,
  created_at timestamptz default now()
);

create table client_brain (
  client_id uuid primary key references clients(id) on delete cascade,
  audience text,
  language text,
  tone text,
  offers jsonb default '[]',
  brand_md text
);

-- שכבה 3
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  meta_campaign_id text not null,
  name text,
  objective text,
  conversion_type text not null check (conversion_type in ('purchase','lead')),
  status text,
  synced_at timestamptz
);

-- שכבה 2
create table creatives (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  concept text,
  hook text,
  variation text,
  format text check (format in ('video','image','carousel')),
  status text,
  asset_url text,
  meta_creative_id text,
  higgsfield_job_id text,
  tags jsonb default '{}',                          -- תיוג מובנה לשכבת ה-AI
  created_at timestamptz default now()
);

create table ads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  creative_id uuid references creatives(id),
  meta_ad_id text not null,
  meta_adset_id text,
  name text,
  status text,
  synced_at timestamptz
);

-- שכבה 4 — הטיים-סיריז, ברמת ad
create table daily_metrics (
  ad_id uuid references ads(id) on delete cascade,
  date date not null,
  spend numeric default 0,
  impressions integer default 0,
  reach integer default 0,
  clicks integer default 0,
  ctr numeric default 0,
  cpm numeric default 0,
  leads integer default 0,
  purchases integer default 0,
  purchase_value numeric default 0,
  primary key (ad_id, date)
);

-- מקור הכנסה למודל lead
create table leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id),
  ad_id uuid references ads(id),
  meta_lead_id text,
  name text,
  phone text,
  email text,
  status text default 'new' check (status in ('new','contacted','closed','lost')),
  deal_value numeric,
  source text default 'meta',
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- מנוע המטריקות, פר לקוח
create table profit_config (
  client_id uuid primary key references clients(id) on delete cascade,
  variables jsonb default '{}',
  formulas jsonb default '[]'
);

create table sync_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz default now(),
  account_id text,
  level text,
  rows_written integer,
  status text,
  error text
);

create index on daily_metrics (date);
create index on leads (closed_at);
create index on leads (status);
create index on ads (creative_id);

-- RLS — נועל את ה-API הציבורי (anon). השרת עובד עם service_role שעוקף RLS.
-- ללא policies בכוונה — בידוד per-client מגיע בפאזה 5.
alter table clients        enable row level security;
alter table client_brain   enable row level security;
alter table campaigns      enable row level security;
alter table creatives      enable row level security;
alter table ads            enable row level security;
alter table daily_metrics  enable row level security;
alter table leads          enable row level security;
alter table profit_config  enable row level security;
alter table sync_log       enable row level security;
