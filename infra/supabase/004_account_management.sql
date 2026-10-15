-- Requires 001 + 003. Owner-run migration; browser gets no auth.admin secret.
begin;
create table if not exists public.hkpd_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  edition_id text not null default 'edition-2026' check (edition_id = 'edition-2026'),
  role text not null default '' check (role in ('','admin','school','leader','referee')),
  approved boolean not null default false,
  school_id uuid references public.hkpd_schools(id) on delete restrict,
  sport_codes text[] not null default '{}',
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  check (not approved or role <> ''),
  check ((role = 'school' and school_id is not null and cardinality(sport_codes) = 0)
    or (role in ('leader','referee') and school_id is null and cardinality(sport_codes) > 0)
    or (role in ('','admin') and school_id is null and cardinality(sport_codes) = 0))
);
insert into public.hkpd_account_access(user_id,role,approved)
select user_id,'admin',true from public.hkpd_admin_access where approved
on conflict do nothing;
create table if not exists public.hkpd_account_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  target_id uuid not null,
  previous_access jsonb,
  next_access jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.hkpd_account_access enable row level security;
alter table public.hkpd_account_audit enable row level security;
revoke all on public.hkpd_account_access, public.hkpd_account_audit from public,anon,authenticated;
grant select on public.hkpd_account_access to authenticated;
drop policy if exists hkpd_account_read_own on public.hkpd_account_access;
create policy hkpd_account_read_own on public.hkpd_account_access for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.hkpd_list_accounts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.hkpd_admin_access where user_id = (select auth.uid()) and approved and edition_id = 'edition-2026') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'userId',u.id,'email',u.email,
    'role',case when a.approved then 'admin' else coalesce(p.role,'') end,
    'approved',case when a.approved then true when p.role = 'admin' then false else coalesce(p.approved,false) end,
    'schoolId',case when a.approved then null else p.school_id end,
    'sportCodes',case when a.approved then '{}'::text[] else coalesce(p.sport_codes,'{}'::text[]) end,
    'revision',coalesce(p.revision,0), 'updatedAt',p.updated_at
  ) order by lower(u.email),u.id)
  from auth.users u left join public.hkpd_account_access p on p.user_id = u.id
  left join public.hkpd_admin_access a on a.user_id = u.id
  where (u.email_confirmed_at is not null and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')) or p.user_id is not null or a.approved),'[]'::jsonb);
end;
$$;

create or replace function public.hkpd_update_account(p_user_id uuid, p_revision integer, p_role text, p_approved boolean, p_school_id uuid, p_sport_codes text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare before_row jsonb; current_revision integer; clean_codes text[];
begin
  if not exists(select 1 from public.hkpd_admin_access where user_id = (select auth.uid()) and approved and edition_id = 'edition-2026') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  -- Serialize account changes; recheck caller AFTER acquiring the lock so two
  -- admins cannot concurrently revoke each other and leave no active admin.
  perform 1 from public.hkpd_admin_configuration where edition_id = 'edition-2026' for update;
  if not found then raise exception 'Configuration missing'; end if;
  if not exists(select 1 from public.hkpd_admin_access where user_id = (select auth.uid()) and approved and edition_id = 'edition-2026') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then raise exception 'Cannot change own access' using errcode = '22023'; end if;
  if not exists(select 1 from auth.users u where u.id = p_user_id) or (p_approved and not exists(select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null
    and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google'))) then
    raise exception 'Verified Google account required' using errcode = '22023';
  end if;
  select to_jsonb(p),p.revision into before_row,current_revision from public.hkpd_account_access p where p.user_id = p_user_id;
  if p_revision is null or p_revision <> coalesce(current_revision,0) then
    raise exception 'Account changed. Reload first.' using errcode = '40001';
  end if;
  if p_role is null or p_role not in ('','admin','school','leader','referee') or p_approved is null or (p_approved and p_role = '') or p_sport_codes is null then
    raise exception 'Invalid access' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct x order by x),'{}'::text[]) into clean_codes from unnest(p_sport_codes) x;
  if exists(select 1 from unnest(clean_codes) x where x is null or not exists(select 1 from public.hkpd_official_catalog c where split_part(c.code,'_',1) = x)) then
    raise exception 'Invalid sport' using errcode = '22023';
  end if;
  if p_role = 'school' then
    if p_school_id is null or cardinality(clean_codes) <> 0 or not exists(select 1 from public.hkpd_schools where id = p_school_id and edition_id = 'edition-2026') then
      raise exception 'School binding required' using errcode = '22023';
    end if;
  elsif p_role in ('leader','referee') then
    if p_school_id is not null or cardinality(clean_codes) = 0 then raise exception 'Sport assignment required' using errcode = '22023'; end if;
  elsif p_school_id is not null or cardinality(clean_codes) <> 0 then raise exception 'Unexpected assignment' using errcode = '22023';
  end if;
  if not (p_role = 'admin' and p_approved) and exists(select 1 from public.hkpd_admin_access where user_id = p_user_id and approved)
    and (select count(*) from public.hkpd_admin_access where approved and edition_id = 'edition-2026') <= 1 then
    raise exception 'Last admin cannot be revoked' using errcode = '22023';
  end if;
  insert into public.hkpd_account_access(user_id,role,approved,school_id,sport_codes,revision)
  values(p_user_id,p_role,p_approved,p_school_id,clean_codes,coalesce(current_revision,0)+1)
  on conflict(user_id) do update set role=excluded.role, approved=excluded.approved,
    school_id=excluded.school_id, sport_codes=excluded.sport_codes,revision=excluded.revision,updated_at=now();
  insert into public.hkpd_admin_access(user_id,approved)
  values(p_user_id,p_role='admin' and p_approved)
  on conflict(user_id) do update set approved=excluded.approved,granted_at=now();
  insert into public.hkpd_account_audit(actor_id,target_id,previous_access,next_access)
  select (select auth.uid()),p_user_id,before_row,to_jsonb(p) from public.hkpd_account_access p where p.user_id=p_user_id;
  return public.hkpd_list_accounts();
end;
$$;

-- Caller receives ONLY their own approved role and scope. Admin bootstrap stays
-- compatible, including owner-run recovery through 002. Metadata/email never
-- select a role. Configuration and school data are read with explicit auth.uid.
create or replace function public.hkpd_workspace_access() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare granted_role text; granted_school uuid; granted_sports text[]; result jsonb;
begin
  if exists(select 1 from public.hkpd_admin_access where user_id=(select auth.uid()) and approved and edition_id='edition-2026') then
    granted_role := 'admin'; granted_sports := '{}';
  else
    select role,school_id,sport_codes into granted_role,granted_school,granted_sports
    from public.hkpd_account_access where user_id=(select auth.uid()) and approved and role in ('school','leader','referee') and edition_id='edition-2026';
  end if;
  if granted_role is null then return null; end if;
  select jsonb_build_object('userId',(select auth.uid()),'editionId','edition-2026','approved',true,'role',granted_role,
    'catalogCodes',c.catalog_codes,'sportCodes',granted_sports,
    'school',case when granted_school is null then null else (select jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'level',s.level)
      from public.hkpd_schools s where s.id=granted_school and s.edition_id='edition-2026') end)
  into result from public.hkpd_admin_configuration c where c.edition_id='edition-2026';
  return result;
end;
$$;
revoke all on function public.hkpd_list_accounts(), public.hkpd_update_account(uuid,integer,text,boolean,uuid,text[]), public.hkpd_workspace_access() from public,anon;
grant execute on function public.hkpd_list_accounts(), public.hkpd_update_account(uuid,integer,text,boolean,uuid,text[]), public.hkpd_workspace_access() to authenticated;
commit;
