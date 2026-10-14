-- Run as project owner in Supabase SQL Editor. No client can write grants.
begin;
create table if not exists public.hkpd_admin_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approved boolean not null default false,
  edition_id text not null default 'edition-2026' check (edition_id = 'edition-2026'),
  granted_at timestamptz not null default now()
);
alter table public.hkpd_admin_access enable row level security;
revoke all on public.hkpd_admin_access from public, anon, authenticated;
grant select on public.hkpd_admin_access to authenticated;
drop policy if exists hkpd_read_own_admin_access on public.hkpd_admin_access;
create policy hkpd_read_own_admin_access on public.hkpd_admin_access
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.hkpd_workspace_access()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'userId', a.user_id,
    'editionId', a.edition_id,
    'approved', a.approved,
    'role', 'admin'
  ) from public.hkpd_admin_access a
  where a.user_id = (select auth.uid()) and a.approved;
$$;
revoke all on function public.hkpd_workspace_access() from public, anon;
grant execute on function public.hkpd_workspace_access() to authenticated;
commit;
