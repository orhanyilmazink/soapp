create table if not exists bucket_lists (
  id text primary key,
  state jsonb not null default '{"done":[],"custom":[]}'::jsonb,
  owner_id uuid references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.bucket_lists
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

insert into bucket_lists (id, state)
values ('shared', '{"done":[],"custom":[]}'::jsonb)
on conflict (id) do nothing;

alter table public.bucket_lists enable row level security;

drop policy if exists "Shared owner can read state" on public.bucket_lists;
drop policy if exists "Authenticated users can claim shared state" on public.bucket_lists;
drop policy if exists "Shared owner can update state" on public.bucket_lists;
drop policy if exists "PIN-only shared row read" on public.bucket_lists;
drop policy if exists "PIN-only shared row insert" on public.bucket_lists;
drop policy if exists "PIN-only shared row update" on public.bucket_lists;

create policy "PIN-only shared row read"
  on public.bucket_lists for select to anon, authenticated
  using (id = 'shared');

create policy "PIN-only shared row insert"
  on public.bucket_lists for insert to anon, authenticated
  with check (id = 'shared');

create policy "PIN-only shared row update"
  on public.bucket_lists for update to anon, authenticated
  using (id = 'shared')
  with check (id = 'shared');

revoke all on public.bucket_lists from anon, authenticated;
grant select, insert, update on public.bucket_lists to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bucket_lists'
  ) then
    execute 'alter publication supabase_realtime add table public.bucket_lists';
  end if;
end
$$;
