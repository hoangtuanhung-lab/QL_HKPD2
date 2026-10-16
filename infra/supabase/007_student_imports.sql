-- Apply after 001..006. Additive migration; existing registration IDs and files are preserved.
begin;
create table if not exists public.hkpd_student_registry (
 identity_number text primary key check(identity_number ~ '^\d{12}$'),
 school_id uuid not null references public.hkpd_schools(id) on delete restrict,
 full_name text not null, birth_date date not null, gender text not null check(gender in ('male','female')),
 grade integer not null check(grade between 1 and 9), updated_by uuid not null,updated_at timestamptz not null default now()
);
create table if not exists public.hkpd_registry_revision(id boolean primary key default true check(id),revision integer not null default 0);
insert into public.hkpd_registry_revision(id) values(true) on conflict do nothing;
create index if not exists hkpd_student_registry_school on public.hkpd_student_registry(school_id);
create index if not exists hkpd_active_athlete_school on public.hkpd_live_athletes(school_id) where active;
alter table public.hkpd_student_registry enable row level security;
alter table public.hkpd_registry_revision enable row level security;
revoke all on public.hkpd_student_registry,public.hkpd_registry_revision from public,anon,authenticated;
do $$ begin
 if to_regprocedure('public.hkpd_online_state_v5()') is null then alter function public.hkpd_online_state() rename to hkpd_online_state_v5; end if;
end $$;
revoke all on function public.hkpd_online_state_v5() from public,anon,authenticated;
do $install$ begin if to_regprocedure('public.hkpd_online_state_v7()') is null then execute $wrapper$
create or replace function public.hkpd_online_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare access jsonb; result jsonb;
begin
 result:=public.hkpd_online_state_v5();access:=public.hkpd_workspace_access();
 if access->>'role'='admin' then result:=result||jsonb_build_object('registryRevision',(select revision from public.hkpd_registry_revision where id),'studentCount',(select count(*) from public.hkpd_student_registry)); end if;
 return result;
end;
$$;
$wrapper$;end if;end $install$;
create or replace function public.hkpd_lookup_students(p_identities text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare access jsonb;
begin
 access:=public.hkpd_workspace_access();
 if access is null or access->>'role' not in ('admin','school') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_identities is null or cardinality(p_identities)>2000 then raise exception 'Invalid batch' using errcode='22023'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('identityNumber',identity_number,'schoolId',school_id,'fullName',full_name,'birthDate',birth_date,'gender',gender,'className',grade::text,'requestedEvent','')) from public.hkpd_student_registry s where s.identity_number=any(p_identities) and (access->>'role'='admin' or s.school_id=(access->'school'->>'id')::uuid)),'[]'::jsonb);
end;
$$;
create or replace function public.hkpd_import_students(p_revision integer,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; item jsonb; current_revision integer;
begin
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();if access is null or access->>'role'<>'admin' then raise exception 'Admin only' using errcode='42501'; end if;
 select revision into current_revision from public.hkpd_registry_revision where id for update;
 if p_revision is null or p_revision<>current_revision then raise exception 'Reload first' using errcode='40001'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 2000 or octet_length(p_rows::text)>3000000 then raise exception 'Invalid import' using errcode='22023'; end if;
 if (select count(*)<>count(distinct x->>'identityNumber') from jsonb_array_elements(p_rows) x) then raise exception 'Duplicate identity' using errcode='22023'; end if;
 for item in select * from jsonb_array_elements(p_rows) loop
  if coalesce(item->>'identityNumber','') !~ '^\d{12}$' or coalesce(length(btrim(item->>'fullName')),0) not between 1 and 150 or item->>'gender' is null or item->>'gender' not in ('male','female') or coalesce(item->>'className','') !~ '^[1-9]$' or coalesce(item->>'birthDate','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid student' using errcode='22023'; end if;
  if (item->>'birthDate')::date>current_date or not exists(select 1 from public.hkpd_schools where id=(item->>'schoolId')::uuid and edition_id='edition-2026' and (level='TH_THCS' or level=case when (item->>'className')::integer<=5 then 'TH' else 'THCS' end)) then raise exception 'School/grade/date mismatch' using errcode='22023'; end if;
  if exists(select 1 from public.hkpd_live_athletes a where a.active and a.profile->>'identityNumber'=item->>'identityNumber' and a.school_id<>(item->>'schoolId')::uuid) then raise exception 'Student registered at another school' using errcode='22023'; end if;
  insert into public.hkpd_student_registry(identity_number,school_id,full_name,birth_date,gender,grade,updated_by) values(item->>'identityNumber',(item->>'schoolId')::uuid,btrim(item->>'fullName'),(item->>'birthDate')::date,item->>'gender',(item->>'className')::integer,auth.uid())
  on conflict(identity_number) do update set school_id=excluded.school_id,full_name=excluded.full_name,birth_date=excluded.birth_date,gender=excluded.gender,grade=excluded.grade,updated_by=excluded.updated_by,updated_at=now();
 end loop;
 update public.hkpd_registry_revision set revision=revision+1 where id;
 insert into public.hkpd_live_audit(actor_id,action,resource,revision) values(auth.uid(),'student.import','edition-2026',current_revision+1);
 return public.hkpd_online_state();
end;
$$;
create or replace function public.hkpd_save_roster(p_school_id uuid,p_revision integer,p_athletes jsonb,p_action text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; roster public.hkpd_school_rosters; a jsonb; codes text[]; c text; d jsonb; student_level text; student_gender text; born date; age integer; grade integer; bounds text[]; next_status text;
begin
 -- Same lock as account/catalog writes: revocation and configuration changes cannot race a write.
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();
 if access is null or not ((access->>'role'='school' and access->'school'->>'id'=p_school_id::text) or access->>'role'='admin') then raise exception 'Not authorized' using errcode='42501'; end if;
 if not exists(select 1 from public.hkpd_schools where id=p_school_id and edition_id='edition-2026') then raise exception 'Unknown school' using errcode='22023'; end if;
 insert into public.hkpd_school_rosters(school_id) values(p_school_id) on conflict do nothing;
 select * into roster from public.hkpd_school_rosters where school_id=p_school_id for update;
 if p_revision is null or roster.revision<>p_revision then raise exception 'Reload before saving' using errcode='40001'; end if;
 if p_action in ('approve','return') then
  if access->>'role'<>'admin' then raise exception 'Admin only' using errcode='42501'; end if;
  if (p_action='approve' and roster.status<>'submitted') or (p_action='return' and roster.status not in ('submitted','approved')) then raise exception 'Invalid transition' using errcode='22023'; end if;
  if p_action='return' and coalesce(length(btrim(p_note)),0)=0 then raise exception 'Return reason required' using errcode='22023'; end if;
  if exists(select 1 from public.hkpd_event_operations o where o.kind in ('lanes','result') and exists(select 1 from public.hkpd_live_athletes x where x.school_id=p_school_id and x.active and x.profile->'catalogSelections' ? o.code)) then raise exception 'Competition data exists; cannot reopen roster' using errcode='22023'; end if;
  if p_action='approve' and exists(select 1 from public.hkpd_live_athletes x, jsonb_array_elements_text(x.profile->'catalogSelections') selected(code) where x.school_id=p_school_id and x.active and not (access->'catalogCodes' ? selected.code)) then raise exception 'Content closed after submission' using errcode='22023'; end if;
  if p_action='approve' and exists(select 1 from public.hkpd_live_athletes x join public.hkpd_event_operations a on a.kind='schedule' and x.profile->'catalogSelections' ? a.code join public.hkpd_event_operations b on b.kind='schedule' and b.code>a.code and x.profile->'catalogSelections' ? b.code where x.school_id=p_school_id and x.active and (a.payload->>'start')::timestamptz<(b.payload->>'end')::timestamptz and (b.payload->>'start')::timestamptz<(a.payload->>'end')::timestamptz) then raise exception 'Athlete schedule conflict before approval' using errcode='22023'; end if;
  next_status:=case when p_action='approve' then 'approved' else 'returned' end;
 elsif p_action in ('save','submit') then
  if access->>'role' not in ('school','admin') then raise exception 'School or admin only' using errcode='42501'; end if;
  if roster.status not in ('draft','returned') then raise exception 'Roster is locked' using errcode='22023'; end if;
  if jsonb_typeof(p_athletes) is distinct from 'array' or jsonb_array_length(p_athletes)>3000 or octet_length(p_athletes::text)>3000000 then raise exception 'Invalid roster' using errcode='22023'; end if;
  if p_action='submit' and jsonb_array_length(p_athletes)=0 then raise exception 'Empty roster' using errcode='22023'; end if;
  if (select count(*)<>count(distinct x->>'draftId') from jsonb_array_elements(p_athletes) x) then raise exception 'Duplicate athlete' using errcode='22023'; end if;
  for a in select * from jsonb_array_elements(p_athletes) loop
   if jsonb_typeof(a) is distinct from 'object' or coalesce(a->>'draftId','') !~ '^draft_[0-9a-fA-F-]{36}$' or coalesce(length(btrim(a->>'fullName')),0) not between 2 and 150
    or length(coalesce(a->>'className',''))>40 or length(coalesce(a->>'note',''))>1000
    or (coalesce(a->>'identityNumber','')<>'' and a->>'identityNumber' !~ '^[0-9]{12}$') then raise exception 'Invalid athlete profile' using errcode='22023'; end if;
   if coalesce(a->>'athleteCode','')<>'' and not exists(select 1 from public.hkpd_live_athletes x where x.id=a->>'draftId' and x.code=a->>'athleteCode' and x.school_id=p_school_id) then raise exception 'Athlete code does not match' using errcode='22023'; end if;
   if exists(select 1 from public.hkpd_live_athletes x where x.id=a->>'draftId' and x.school_id<>p_school_id) then raise exception 'Athlete belongs to another school' using errcode='42501'; end if;
   if jsonb_typeof(a->'catalogSelections') is distinct from 'array' then raise exception 'Content selections required' using errcode='22023'; end if;
   select coalesce(array_agg(x),'{}') into codes from jsonb_array_elements_text(a->'catalogSelections') x;
   if cardinality(codes)<>(select count(distinct x) from unnest(codes) x) or (select count(distinct split_part(x,'_',1)) from unnest(codes) x)>2 then raise exception 'Invalid or too many selections' using errcode='22023'; end if;
   if p_action='submit' and (cardinality(codes)=0 or coalesce(a->>'identityNumber','')='' or coalesce(a->>'className','')='') then raise exception 'Complete profile before submission' using errcode='22023'; end if;
   if cardinality(codes)>0 then
    if coalesce(a->>'birthDate','') !~ '^\d{4}-\d{2}-\d{2}$' or a->>'gender' is null or a->>'gender' not in ('male','female') then raise exception 'Date and gender required' using errcode='22023'; end if;
    born:=(a->>'birthDate')::date; age:=2026-extract(year from born)::integer;
    grade:=substring(a->>'className' from '^([0-9]{1,2})')::integer;
    student_level:=case when grade between 1 and 5 then 'TH' when grade between 6 and 9 then 'THCS' else a->>'educationLevel' end;
    if grade>=10 or student_level is null or student_level not in ('TH','THCS') or age<0 or (student_level='TH' and age>=11) or (student_level='THCS' and age<11) then raise exception 'Ineligible school level or age' using errcode='22023'; end if;
    if not exists(select 1 from public.hkpd_schools where id=p_school_id and (level='TH_THCS' or level=student_level)) then raise exception 'School level mismatch' using errcode='22023'; end if;
    student_gender:=case when a->>'gender'='male' then 'Nam' else 'Nữ' end;
    foreach c in array codes loop
     select detail into d from public.hkpd_catalog_details where code=c;
     if d is null or not (access->'catalogCodes' ? c) or d->>'level'<>student_level or d->>'gender' not in (student_gender,'Nam - nữ') then raise exception 'Ineligible or closed content' using errcode='22023'; end if;
     bounds:=regexp_match(d->>'group','^(\d+)\s*-\s*(\d+)\s+tuổi$');
     if bounds is not null and age not between bounds[1]::integer and bounds[2]::integer then raise exception 'Age group mismatch' using errcode='22023'; end if;
    end loop;
   end if;
  end loop;
  update public.hkpd_live_athletes set active=false where school_id=p_school_id;
  for a in select * from jsonb_array_elements(p_athletes) loop
   -- Whitelist stored profile. Inline photos and arbitrary role/status keys never persist.
   a:=jsonb_build_object('draftId',a->>'draftId','fullName',btrim(a->>'fullName'),'className',coalesce(a->>'className',''),
    'identityNumber',coalesce(a->>'identityNumber',''),'birthDate',coalesce(a->>'birthDate',''),'gender',coalesce(a->>'gender','male'),
    'note',coalesce(a->>'note',''),'educationLevel',coalesce(a->>'educationLevel',''),'catalogSelections',a->'catalogSelections','requestedEvent','');
   insert into public.hkpd_live_athletes(id,school_id,profile) values(a->>'draftId',p_school_id,a)
   on conflict(id) do update set profile=excluded.profile,active=true;
  end loop;
  next_status:=case when p_action='submit' then 'submitted' else 'draft' end;
 else raise exception 'Unknown action' using errcode='22023'; end if;
 update public.hkpd_school_rosters set revision=revision+1,status=next_status,note=left(coalesce(p_note,''),1000),updated_at=now() where school_id=p_school_id;
 insert into public.hkpd_live_audit(actor_id,action,resource,revision) values(auth.uid(),'roster.'||p_action,p_school_id::text,roster.revision+1);
 return public.hkpd_online_state();
end;
$$;

create or replace function public.hkpd_import_registrations(p_rosters jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; item jsonb;
begin
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();if access is null or access->>'role'<>'admin' then raise exception 'Admin only' using errcode='42501'; end if;
 if jsonb_typeof(p_rosters) is distinct from 'array' or jsonb_array_length(p_rosters) not between 1 and 2000 or octet_length(p_rosters::text)>6000000 then raise exception 'Invalid batch' using errcode='22023'; end if;
 for item in select * from jsonb_array_elements(p_rosters) loop
  perform public.hkpd_save_roster((item->>'schoolId')::uuid,(item->>'revision')::integer,item->'athletes','save','');
 end loop;
 return public.hkpd_online_state();
end;
$$;
revoke all on function public.hkpd_import_students(integer,jsonb),public.hkpd_import_registrations(jsonb),public.hkpd_lookup_students(text[]) from public,anon;
revoke all on function public.hkpd_online_state() from public,anon;
grant execute on function public.hkpd_online_state(),public.hkpd_import_students(integer,jsonb),public.hkpd_import_registrations(jsonb),public.hkpd_lookup_students(text[]) to authenticated;
notify pgrst, 'reload schema';
commit;
