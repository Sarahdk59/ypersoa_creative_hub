create type social_variant as enum ('editorial','avis','selection');
create type social_format as enum ('r4_5','r1_1','r9_16');
create type social_status as enum ('draft','ready','scheduled','published');

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  title text,
  variant social_variant not null default 'editorial',
  payload jsonb not null default '{}',
  legende text,
  hashtags text[] not null default '{}',
  format social_format not null default 'r4_5',
  status social_status not null default 'draft',
  fond_svg text,
  planable_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table social_posts enable row level security;
create policy "social posts read" on social_posts for select using (true);
create policy "social posts write" on social_posts for all using (true) with check (true);
