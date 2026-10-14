begin;
create table if not exists public.hkpd_official_catalog(code text primary key);
insert into public.hkpd_official_catalog(code) values
('DK_TH_NAM_TC_60M'),
('DK_TH_NAM_TC_BATXA'),
('DK_TH_NAM_TC_TS4X50'),
('DK_TH_NU_TC_60M'),
('DK_TH_NU_TC_BATXA'),
('DK_TH_NU_TC_TS4X50'),
('BOI_TH_NAM_0709_TUDO50'),
('BOI_TH_NAM_0709_TUDO100'),
('BOI_TH_NAM_0709_ECH50'),
('BOI_TH_NAM_0709_ECH100'),
('BOI_TH_NU_0709_TUDO50'),
('BOI_TH_NU_0709_TUDO100'),
('BOI_TH_NU_0709_ECH50'),
('BOI_TH_NU_0709_ECH100'),
('BOI_TH_NAM_1011_TUDO50'),
('BOI_TH_NAM_1011_TUDO100'),
('BOI_TH_NAM_1011_ECH50'),
('BOI_TH_NAM_1011_ECH100'),
('BOI_TH_NU_1011_TUDO50'),
('BOI_TH_NU_1011_TUDO100'),
('BOI_TH_NU_1011_ECH50'),
('BOI_TH_NU_1011_ECH100'),
('BOI_TH_HON_HOP_TC_TS4X50'),
('DC_TH_NAM_0709_DONNAM'),
('DC_TH_NU_0709_DONNU'),
('DC_TH_NAM_0709_DOINAM'),
('DC_TH_NU_0709_DOINU'),
('DC_TH_HON_HOP_0709_DOINAMNU'),
('DC_TH_NAM_1011_DONNAM'),
('DC_TH_NU_1011_DONNU'),
('DC_TH_NAM_1011_DOINAM'),
('DC_TH_NU_1011_DOINU'),
('DC_TH_HON_HOP_1011_DOINAMNU'),
('CV_TH_NAM_0709_CANHAN'),
('CV_TH_NU_0709_CANHAN'),
('CV_TH_NAM_1011_CANHAN'),
('CV_TH_NU_1011_CANHAN'),
('BD_TH'),
('DK_THCS_NAM_TC_100M'),
('DK_THCS_NAM_TC_200M'),
('DK_THCS_NAM_TC_1500M'),
('DK_THCS_NAM_TC_NHAYXA'),
('DK_THCS_NAM_TC_NHAYCAO'),
('DK_THCS_NAM_TC_TS4X100'),
('DK_THCS_NU_TC_100M'),
('DK_THCS_NU_TC_200M'),
('DK_THCS_NU_TC_800M'),
('DK_THCS_NU_TC_NHAYXA'),
('DK_THCS_NU_TC_NHAYCAO'),
('DK_THCS_NU_TC_TS4X100'),
('BOI_THCS_NAM_1213_TUDO50'),
('BOI_THCS_NAM_1213_TUDO100'),
('BOI_THCS_NAM_1213_TUDO200'),
('BOI_THCS_NAM_1213_ECH50'),
('BOI_THCS_NAM_1213_ECH100'),
('BOI_THCS_NAM_1213_ECH200'),
('BOI_THCS_NU_1213_TUDO50'),
('BOI_THCS_NU_1213_TUDO100'),
('BOI_THCS_NU_1213_TUDO200'),
('BOI_THCS_NU_1213_ECH50'),
('BOI_THCS_NU_1213_ECH100'),
('BOI_THCS_NU_1213_ECH200'),
('BOI_THCS_NAM_1415_TUDO50'),
('BOI_THCS_NAM_1415_TUDO100'),
('BOI_THCS_NAM_1415_TUDO200'),
('BOI_THCS_NAM_1415_ECH50'),
('BOI_THCS_NAM_1415_ECH100'),
('BOI_THCS_NAM_1415_ECH200'),
('BOI_THCS_NU_1415_TUDO50'),
('BOI_THCS_NU_1415_TUDO100'),
('BOI_THCS_NU_1415_TUDO200'),
('BOI_THCS_NU_1415_ECH50'),
('BOI_THCS_NU_1415_ECH100'),
('BOI_THCS_NU_1415_ECH200'),
('BOI_THCS_HON_HOP_TC_TS4X100'),
('CL_THCS_NAM_1213_DONNAM'),
('CL_THCS_NU_1213_DONNU'),
('CL_THCS_NAM_1213_DOINAM'),
('CL_THCS_NU_1213_DOINU'),
('CL_THCS_HON_HOP_1213_DOINAMNU'),
('CL_THCS_NAM_1415_DONNAM'),
('CL_THCS_NU_1415_DONNU'),
('CL_THCS_NAM_1415_DOINAM'),
('CL_THCS_NU_1415_DOINU'),
('CL_THCS_HON_HOP_1415_DOINAMNU'),
('DC_THCS_NAM_1213_DONNAM'),
('DC_THCS_NU_1213_DONNU'),
('DC_THCS_NAM_1213_DOINAM'),
('DC_THCS_NU_1213_DOINU'),
('DC_THCS_HON_HOP_1213_DOINAMNU'),
('DC_THCS_NAM_1415_DONNAM'),
('DC_THCS_NU_1415_DONNU'),
('DC_THCS_NAM_1415_DOINAM'),
('DC_THCS_NU_1415_DOINU'),
('DC_THCS_HON_HOP_1415_DOINAMNU'),
('CV_THCS_NAM_1213_CANHAN'),
('CV_THCS_NU_1213_CANHAN'),
('CV_THCS_NAM_1415_CANHAN'),
('CV_THCS_NU_1415_CANHAN'),
('BD_THCS'),
('KC_THCS_NAM_TC_DOINAM'),
('KC_THCS_NU_TC_DOINU'),
('KC_THCS_HON_HOP_TC_DOINAMNU'),
('DG_THCS_NAM_TC_DEN41'),
('DG_THCS_NAM_TC_DEN44'),
('DG_THCS_NAM_TC_DEN47'),
('DG_THCS_NAM_TC_DEN50'),
('DG_THCS_NAM_TC_DEN53'),
('DG_THCS_NAM_TC_DEN56'),
('DG_THCS_NAM_TC_TREN56'),
('DG_THCS_NU_TC_DEN35'),
('DG_THCS_NU_TC_DEN38'),
('DG_THCS_NU_TC_DEN41'),
('DG_THCS_NU_TC_DEN44'),
('DG_THCS_NU_TC_DEN47'),
('DG_THCS_NU_TC_DEN50'),
('DG_THCS_NU_TC_TREN50'),
('VNM_THCS_NAM_TC_TUTRUQUYEN'),
('VNM_THCS_NAM_TC_LUONGNGHI'),
('VNM_THCS_NU_TC_LONGHOQUYEN'),
('VNM_THCS_NU_TC_LUONGNGHI'),
('VNM_THCS_NAM_TC_SONGLUYEN1'),
('VNM_THCS_NU_TC_SONGLUYEN1'),
('VNM_THCS_NAM_TC_DK3942'),
('VNM_THCS_NAM_TC_DK4245'),
('VNM_THCS_NAM_TC_DK4548'),
('VNM_THCS_NAM_TC_DK4851'),
('VNM_THCS_NAM_TC_DK5154'),
('VNM_THCS_NU_TC_DK3942'),
('VNM_THCS_NU_TC_DK4245'),
('VNM_THCS_NU_TC_DK4548'),
('VNM_THCS_NU_TC_DK4851'),
('VNM_THCS_NU_TC_DK5154')
on conflict do nothing;
create table if not exists public.hkpd_admin_configuration (
  edition_id text primary key check (edition_id = 'edition-2026'),
  revision integer not null default 0 check (revision >= 0),
  catalog_codes text[] not null
);
insert into public.hkpd_admin_configuration(edition_id, catalog_codes)
select 'edition-2026', array_agg(code order by code) from public.hkpd_official_catalog
on conflict do nothing;
create table if not exists public.hkpd_schools (
  id uuid primary key default gen_random_uuid(),
  edition_id text not null default 'edition-2026' references public.hkpd_admin_configuration(edition_id),
  code text not null check (code ~ '^[A-Z0-9_]{2,30}$'),
  name text not null check (length(btrim(name)) between 2 and 200),
  level text not null check (level in ('TH','THCS','TH_THCS')),
  unique(edition_id,code)
);
alter table public.hkpd_official_catalog enable row level security;
alter table public.hkpd_admin_configuration enable row level security;
alter table public.hkpd_schools enable row level security;
revoke all on public.hkpd_official_catalog, public.hkpd_admin_configuration, public.hkpd_schools from public, anon, authenticated;
grant select on public.hkpd_official_catalog to authenticated;
grant select, update on public.hkpd_admin_configuration to authenticated;
grant select, insert, update, delete on public.hkpd_schools to authenticated;
drop policy if exists hkpd_catalog_admin_read on public.hkpd_official_catalog;
create policy hkpd_catalog_admin_read on public.hkpd_official_catalog for select to authenticated
using (exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved));
drop policy if exists hkpd_config_admin on public.hkpd_admin_configuration;
create policy hkpd_config_admin on public.hkpd_admin_configuration for all to authenticated
using (exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved and a.edition_id = hkpd_admin_configuration.edition_id))
with check (exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved and a.edition_id = hkpd_admin_configuration.edition_id));
drop policy if exists hkpd_schools_admin on public.hkpd_schools;
create policy hkpd_schools_admin on public.hkpd_schools for all to authenticated
using (exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved and a.edition_id = hkpd_schools.edition_id))
with check (exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved and a.edition_id = hkpd_schools.edition_id));

create or replace function public.hkpd_admin_settings() returns jsonb
language sql stable security invoker set search_path = '' as $$
select jsonb_build_object('revision', c.revision, 'catalogCodes', c.catalog_codes,
  'schools', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'level',s.level) order by s.name,s.id)
    from public.hkpd_schools s where s.edition_id = c.edition_id),'[]'::jsonb))
from public.hkpd_admin_configuration c where c.edition_id = 'edition-2026';
$$;

-- All writes go through a single transaction and revision check. Table writes
-- are not exposed to clients: the private owner function rechecks auth.uid().
create or replace function public.hkpd_update_admin_settings(p_revision integer, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare codes text[]; school_id uuid;
begin
  if not exists(select 1 from public.hkpd_admin_access a where a.user_id = (select auth.uid()) and a.approved and a.edition_id = 'edition-2026') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.hkpd_admin_configuration set revision = revision + 1
  where edition_id = 'edition-2026' and revision = p_revision;
  if not found then raise exception 'Configuration changed. Reload before saving.' using errcode = '40001'; end if;
  if p_action = 'catalog' then
    if jsonb_typeof(p_payload->'codes') is distinct from 'array' then raise exception 'Invalid catalog'; end if;
    select coalesce(array_agg(distinct value order by value),'{}'::text[]) into codes
    from jsonb_array_elements_text(p_payload->'codes');
    if exists(select 1 from unnest(codes) x where x is null or not exists(select 1 from public.hkpd_official_catalog c where c.code = x)) then
      raise exception 'Unknown catalog code';
    end if;
    update public.hkpd_admin_configuration set catalog_codes = codes where edition_id = 'edition-2026';
  elsif p_action = 'school.save' then
    school_id := coalesce(nullif(p_payload->>'id','')::uuid, gen_random_uuid());
    if nullif(p_payload->>'id','') is not null and not exists(select 1 from public.hkpd_schools where id = school_id and edition_id = 'edition-2026') then raise exception 'School not found'; end if;
    insert into public.hkpd_schools(id,code,name,level)
    values (school_id, upper(btrim(p_payload->>'code')), btrim(p_payload->>'name'), p_payload->>'level')
    on conflict(id) do update set code = excluded.code, name = excluded.name, level = excluded.level;
  elsif p_action = 'school.delete' then
    delete from public.hkpd_schools where id = (p_payload->>'id')::uuid and edition_id = 'edition-2026';
    if not found then raise exception 'School not found'; end if;
  else raise exception 'Unknown action';
  end if;
  return public.hkpd_admin_settings();
end;
$$;
-- Owner-only RPC mutation: no direct client writes bypass the revision check.
revoke insert, update, delete on public.hkpd_schools from authenticated;
revoke update on public.hkpd_admin_configuration from authenticated;
revoke all on function public.hkpd_admin_settings(), public.hkpd_update_admin_settings(integer,text,jsonb) from public, anon;
grant execute on function public.hkpd_admin_settings(), public.hkpd_update_admin_settings(integer,text,jsonb) to authenticated;
commit;
