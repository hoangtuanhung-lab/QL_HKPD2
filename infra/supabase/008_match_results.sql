-- Apply after 007. Match-based results with server-enforced review/re-entry.
begin;
create table if not exists public.hkpd_event_draws(
 code text primary key references public.hkpd_catalog_details(code),
 mode text not null check(mode in ('knockout','round_robin','performance')),
 revision integer not null default 0,entrants jsonb not null,
 win_points numeric not null,draw_points numeric not null,loss_points numeric not null,
 score_unit text not null default '',
 allow_draw boolean not null default false,created_by uuid not null,created_at timestamptz not null default now()
);
create table if not exists public.hkpd_result_matches(
 id uuid primary key default gen_random_uuid(),code text not null references public.hkpd_event_draws(code) on delete cascade,
 round_no integer not null,match_no integer not null,side1 text,side2 text,
 source1 uuid references public.hkpd_result_matches(id),source2 uuid references public.hkpd_result_matches(id),
 score1 numeric,score2 numeric,status text not null default 'not_started' check(status in ('not_started','pending','confirmed','reentry')),
 revision integer not null default 0,reported_by uuid,reopen_requested boolean not null default false,winner text,bye boolean not null default false,
 unique(code,match_no)
);
create table if not exists public.hkpd_match_audit(
 id uuid primary key default gen_random_uuid(),match_id uuid not null references public.hkpd_result_matches(id) on delete cascade,
 actor_id uuid not null,action text not null,reason text not null default '',before_state jsonb,after_state jsonb,at timestamptz not null default now()
);
create index if not exists hkpd_match_audit_lookup on public.hkpd_match_audit(match_id,at,id);
create index if not exists hkpd_match_source1 on public.hkpd_result_matches(source1);
create index if not exists hkpd_match_source2 on public.hkpd_result_matches(source2);
alter table public.hkpd_event_draws enable row level security;
alter table public.hkpd_result_matches enable row level security;
alter table public.hkpd_match_audit enable row level security;
revoke all on public.hkpd_event_draws,public.hkpd_result_matches,public.hkpd_match_audit from public,anon,authenticated;
do $$ begin if to_regprocedure('public.hkpd_online_state_v7()') is null then alter function public.hkpd_online_state() rename to hkpd_online_state_v7; end if;end $$;
revoke all on function public.hkpd_online_state_v7() from public,anon,authenticated;
create or replace function public.hkpd_online_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare access jsonb;result jsonb;codes text[];
begin
 result:=public.hkpd_online_state_v7();access:=public.hkpd_workspace_access();
 select coalesce(array_agg(d.code),'{}') into codes from public.hkpd_event_draws d
 where access->'catalogCodes' ? d.code and (access->>'role'='admin' or (access->>'role' in ('leader','referee') and access->'sportCodes' ? split_part(d.code,'_',1)) or (access->>'role'='school' and exists(select 1 from public.hkpd_live_athletes a where a.active and a.school_id=(access->'school'->>'id')::uuid and a.profile->'catalogSelections' ? d.code)));
 return result||jsonb_build_object('draws',coalesce((select jsonb_agg(to_jsonb(d)-'created_by') from public.hkpd_event_draws d where d.code=any(codes)),'[]'::jsonb),
 'matches',coalesce((select jsonb_agg((to_jsonb(m)-'reported_by')||jsonb_build_object('log',case when access->>'role'='school' then '[]'::jsonb else coalesce((select jsonb_agg((to_jsonb(l)-'id'-'match_id')||jsonb_build_object('actor_email',u.email) order by l.at,l.id) from public.hkpd_match_audit l left join auth.users u on u.id=l.actor_id where l.match_id=m.id),'[]'::jsonb) end) order by m.round_no,m.match_no)
 from public.hkpd_result_matches m where m.code=any(codes) and (access->>'role'<>'school' or m.status='confirmed')),'[]'::jsonb));
end;
$$;
create or replace function public.hkpd_resolve_match_sides(p_code text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.hkpd_result_matches m set
 side1=case when a.status='confirmed' then a.winner else null end,
 side2=case when b.status='confirmed' then b.winner else null end
 from public.hkpd_result_matches a,public.hkpd_result_matches b
 where m.code=p_code and m.source1=a.id and m.source2=b.id;
end;
$$;
create or replace function public.hkpd_create_event_matches(p_code text,p_revision integer,p_draw jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; previous public.hkpd_event_draws; e jsonb;member text;seen text[]:='{}';entry_ids text[]:='{}';detail jsonb;size integer;count_entries integer;mode_name text;positions text[];pool text[];rotated text[];ids uuid[];previous_ids uuid[];mid uuid;left_id text;right_id text;r integer;j integer;n integer;k integer;match_number integer:=0;total_rounds integer;wp numeric;dp numeric;lp numeric;ties boolean;
begin
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();
 if access is null or access->>'role'<>'leader' or not (access->'sportCodes' ? split_part(p_code,'_',1)) then raise exception 'Assigned leader required' using errcode='42501';end if;
 select d.detail into detail from public.hkpd_catalog_details d where d.code=p_code;
 if detail is null or not(access->'catalogCodes' ? p_code) then raise exception 'Head-to-head event required' using errcode='22023';end if;
 select * into previous from public.hkpd_event_draws where code=p_code for update;
 if p_revision is null or p_revision<>coalesce(previous.revision,0) then raise exception 'Reload first' using errcode='40001';end if;
 if exists(select 1 from public.hkpd_result_matches m join public.hkpd_match_audit l on l.match_id=m.id where m.code=p_code and l.action<>'created') then raise exception 'Matches already have activity' using errcode='22023';end if;
 if jsonb_typeof(p_draw->'entrants') is distinct from 'array' or octet_length(p_draw::text)>500000 then raise exception 'Invalid draw' using errcode='22023';end if;
 count_entries:=jsonb_array_length(p_draw->'entrants');mode_name:=p_draw->>'mode';
 if count_entries not between 1 and 3000 or (mode_name<>'performance' and count_entries not between 2 and 64) or mode_name is null or mode_name not in ('knockout','round_robin','performance') or (mode_name='round_robin' and count_entries>16) then raise exception 'Invalid draw size/mode' using errcode='22023';end if;
 if (mode_name='performance') is distinct from (detail->>'sportCode' in ('DK','BOI') or (detail->>'sportCode'='VNM' and detail->>'form'<>'DOI_KHANG')) then raise exception 'Event format mismatch' using errcode='22023';end if;
 if mode_name='performance' and coalesce(length(btrim(p_draw->>'unit')),0) not between 1 and 40 then raise exception 'Configure result unit' using errcode='22023';end if;
 if mode_name<>'performance' and (count_entries<3 or (select count(distinct x->>'schoolId') from jsonb_array_elements(p_draw->'entrants') x)<case when detail->>'form' in ('CA_NHAN','DOI_KHANG') then 2 else 3 end) then raise exception 'Not enough entrants/schools under competition policy' using errcode='22023';end if;
 if detail->>'form' in ('CA_NHAN','DOI_KHANG') and ((mode_name='round_robin' and count_entries>5) or (mode_name='knockout' and count_entries<6)) then raise exception 'Individual format must follow entrant count' using errcode='22023';end if;
 if jsonb_typeof(p_draw->'winPoints') is distinct from 'number' or jsonb_typeof(p_draw->'drawPoints') is distinct from 'number' or jsonb_typeof(p_draw->'lossPoints') is distinct from 'number' or jsonb_typeof(p_draw->'allowDraw') is distinct from 'boolean' then raise exception 'Configure points before creating matches' using errcode='22023';end if;
 wp:=(p_draw->>'winPoints')::numeric;dp:=(p_draw->>'drawPoints')::numeric;lp:=(p_draw->>'lossPoints')::numeric;ties:=(p_draw->>'allowDraw')::boolean;
 if wp not between 0 and 100 or dp not between 0 and 100 or lp not between 0 and 100 or wp<dp or dp<lp or scale(wp)>3 or scale(dp)>3 or scale(lp)>3 or (mode_name='knockout' and ties) then raise exception 'Invalid scoring policy' using errcode='22023';end if;
 for e in select * from jsonb_array_elements(p_draw->'entrants') loop
  if coalesce(e->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$' or e->>'id'=any(entry_ids) or coalesce(length(btrim(e->>'label')),0) not between 1 and 150 or jsonb_typeof(e->'members') is distinct from 'array' or jsonb_array_length(e->'members') not between 1 and 50 then raise exception 'Invalid entrant' using errcode='22023';end if;
  if detail->>'form' in ('CA_NHAN','DOI_KHANG') and jsonb_array_length(e->'members')<>1 then raise exception 'Individual entrant required' using errcode='22023';end if;
  if detail->>'form' not in ('CA_NHAN','DOI_KHANG') and jsonb_array_length(e->'members')<2 then raise exception 'Confirmed team/pair members required' using errcode='22023';end if;
  if detail->>'form'='DOI' and jsonb_array_length(e->'members')<>2 then raise exception 'A pair requires two members' using errcode='22023';end if;
  entry_ids:=array_append(entry_ids,e->>'id');
  for member in select jsonb_array_elements_text(e->'members') loop
   if member=any(seen) or not exists(select 1 from public.hkpd_live_athletes a join public.hkpd_school_rosters sr on sr.school_id=a.school_id where a.id=member and a.active and a.school_id=(e->>'schoolId')::uuid and sr.status='approved' and a.profile->'catalogSelections' ? p_code) then raise exception 'Duplicate/unapproved/foreign entrant' using errcode='22023';end if;
   seen:=array_append(seen,member);
  end loop;
 end loop;
 delete from public.hkpd_result_matches where code=p_code;
 insert into public.hkpd_event_draws(code,mode,revision,entrants,win_points,draw_points,loss_points,allow_draw,score_unit,created_by)
 values(p_code,mode_name,coalesce(previous.revision,0)+1,(select jsonb_agg(jsonb_build_object('id',x->>'id','label',case when jsonb_array_length(x->'members')=1 then (select a.profile->>'fullName' from public.hkpd_live_athletes a where a.id=x->'members'->>0) else btrim(x->>'label') end,'schoolId',x->>'schoolId','schoolName',(select s.name from public.hkpd_schools s where s.id=(x->>'schoolId')::uuid),'members',x->'members')) from jsonb_array_elements(p_draw->'entrants') x),wp,dp,lp,ties,left(coalesce(p_draw->>'unit',''),40),auth.uid())
 on conflict(code) do update set mode=excluded.mode,revision=excluded.revision,entrants=excluded.entrants,win_points=excluded.win_points,draw_points=excluded.draw_points,loss_points=excluded.loss_points,allow_draw=excluded.allow_draw,score_unit=excluded.score_unit,created_by=excluded.created_by,created_at=now();
 if mode_name='performance' then
  for j in 1..cardinality(entry_ids) loop insert into public.hkpd_result_matches(code,round_no,match_no,side1) values(p_code,1,j,entry_ids[j]);end loop;
 elsif mode_name='round_robin' then
  pool:=entry_ids;if count_entries%2=1 then pool:=array_append(pool,null);end if;n:=cardinality(pool);
  for r in 1..n-1 loop
   for j in 1..n/2 loop
    left_id:=pool[j];right_id:=pool[n+1-j];
    if left_id is not null and right_id is not null then match_number:=match_number+1;insert into public.hkpd_result_matches(code,round_no,match_no,side1,side2) values(p_code,r,match_number,left_id,right_id);end if;
   end loop;
   rotated:=array[pool[1],pool[n]];for k in 2..n-1 loop rotated:=array_append(rotated,pool[k]);end loop;pool:=rotated;
  end loop;
 else
  size:=2;total_rounds:=1;while size<count_entries loop size:=size*2;total_rounds:=total_rounds+1;end loop;
  -- Alternate bye positions to avoid ghost-vs-ghost matches; fixed branch thereafter.
  positions:='{}';n:=size-count_entries;k:=1;
  for j in 1..size/2 loop
   positions:=array_append(positions,entry_ids[k]);k:=k+1;
   if j<=n then positions:=array_append(positions,null);else positions:=array_append(positions,entry_ids[k]);k:=k+1;end if;
  end loop;
  ids:='{}';
  for j in 1..size/2 loop
   match_number:=match_number+1;left_id:=positions[2*j-1];right_id:=positions[2*j];
   insert into public.hkpd_result_matches(code,round_no,match_no,side1,side2,bye,status,winner)
   values(p_code,1,match_number,left_id,right_id,right_id is null,case when right_id is null then 'confirmed' else 'not_started' end,case when right_id is null then left_id else null end) returning id into mid;
   ids:=array_append(ids,mid);
  end loop;
  for r in 2..total_rounds loop
   previous_ids:=ids;ids:='{}';for j in 1..cardinality(previous_ids)/2 loop
    match_number:=match_number+1;insert into public.hkpd_result_matches(code,round_no,match_no,source1,source2) values(p_code,r,match_number,previous_ids[2*j-1],previous_ids[2*j]) returning id into mid;ids:=array_append(ids,mid);
   end loop;
  end loop;
  perform public.hkpd_resolve_match_sides(p_code);
 end if;
 insert into public.hkpd_match_audit(match_id,actor_id,action,after_state) select id,auth.uid(),'created',to_jsonb(m) from public.hkpd_result_matches m where code=p_code;
 return public.hkpd_online_state();
end;
$$;
create or replace function public.hkpd_match_command(p_match_id uuid,p_revision integer,p_action text,p_score1 numeric default null,p_score2 numeric default null,p_reason text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb;m public.hkpd_result_matches;d public.hkpd_event_draws;before_row jsonb;dependent public.hkpd_result_matches;
begin
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();
 if access is null then raise exception 'Not authorized' using errcode='42501';end if;
 select * into m from public.hkpd_result_matches where id=p_match_id for update;
 if not found or not(access->'catalogCodes' ? m.code) then raise exception 'Not authorized' using errcode='42501';end if;
 if access->>'role'<>'admin' and (access->>'role' not in ('leader','referee') or not (access->'sportCodes' ? split_part(m.code,'_',1))) then raise exception 'Not assigned' using errcode='42501';end if;
 if p_revision is null or p_revision<>m.revision then raise exception 'Reload first' using errcode='40001';end if;
 if m.bye then raise exception 'Bye cannot be scored' using errcode='22023';end if;
 select * into d from public.hkpd_event_draws where code=m.code for update;before_row:=to_jsonb(m);
 if p_action in ('submit','confirm') and exists(with recursive parents as (
 select x.id,x.source1,x.source2,x.status,x.reopen_requested from public.hkpd_result_matches x where x.id=m.source1 or x.id=m.source2
 union select x.id,x.source1,x.source2,x.status,x.reopen_requested from public.hkpd_result_matches x join parents p on x.id=p.source1 or x.id=p.source2)
 select 1 from parents where status<>'confirmed' or reopen_requested) then raise exception 'Upstream result under review' using errcode='22023';end if;
 if p_action='submit' then
  if access->>'role'<>'referee' then raise exception 'Referee only' using errcode='42501';end if;
  if m.status not in ('not_started','reentry') or m.side1 is null or p_score1 is null or p_score1 not between 0 and 1000000 or scale(p_score1)>3 or (d.mode<>'performance' and (m.side2 is null or p_score2 is null or p_score2 not between 0 and 1000000 or scale(p_score2)>3)) or (d.mode='performance' and p_score2 is not null) or (p_score1=p_score2 and (d.mode='knockout' or not d.allow_draw)) then raise exception 'Invalid/locked score' using errcode='22023';end if;
  update public.hkpd_result_matches set score1=p_score1,score2=p_score2,status='pending',reported_by=auth.uid(),reopen_requested=false,revision=revision+1 where id=m.id;
 elsif p_action='request_reentry' then
  if access->>'role'<>'referee' then raise exception 'Referee only' using errcode='42501';end if;
  if m.status not in ('pending','confirmed') or m.reopen_requested or coalesce(length(btrim(p_reason)),0) not between 1 and 1000 then raise exception 'Reason/status invalid' using errcode='22023';end if;
  update public.hkpd_result_matches set reopen_requested=true,revision=revision+1 where id=m.id;
 elsif p_action in ('confirm','reject') then
  if access->>'role' not in ('admin','leader') then raise exception 'Reviewer required' using errcode='42501';end if;
  if p_action='confirm' then
   if m.status<>'pending' or m.reopen_requested or m.reported_by=auth.uid() then raise exception 'Cannot confirm' using errcode='22023';end if;
   update public.hkpd_result_matches set status='confirmed',winner=case when score1>score2 then side1 when score2>score1 then side2 else null end,revision=revision+1 where id=m.id;
  else
   if not(m.status='pending' or (m.status='confirmed' and m.reopen_requested)) or coalesce(length(btrim(p_reason)),0) not between 1 and 1000 then raise exception 'Reason/status invalid' using errcode='22023';end if;
   update public.hkpd_result_matches set status='reentry',score1=null,score2=null,winner=null,reopen_requested=false,revision=revision+1 where id=m.id;
   -- Invalidate every dependent, preserve old scores in audit, never silently keep stale downstream officials.
   for dependent in with recursive downstream as (select x.* from public.hkpd_result_matches x where x.source1=m.id or x.source2=m.id union all select x.* from public.hkpd_result_matches x join downstream y on x.source1=y.id or x.source2=y.id) select * from downstream order by round_no loop
    update public.hkpd_result_matches set status=case when dependent.status='not_started' then 'not_started' else 'reentry' end,score1=null,score2=null,winner=null,reopen_requested=false,reported_by=null,revision=revision+1 where id=dependent.id;
    perform public.hkpd_resolve_match_sides(m.code);
    insert into public.hkpd_match_audit(match_id,actor_id,action,reason,before_state,after_state) select id,auth.uid(),'source_invalidated',left(p_reason,1000),to_jsonb(dependent),to_jsonb(x) from public.hkpd_result_matches x where id=dependent.id;
   end loop;
  end if;
 else raise exception 'Unknown command' using errcode='22023';end if;
 perform public.hkpd_resolve_match_sides(m.code);
 insert into public.hkpd_match_audit(match_id,actor_id,action,reason,before_state,after_state) select id,auth.uid(),p_action,left(coalesce(p_reason,''),1000),before_row,to_jsonb(x) from public.hkpd_result_matches x where id=m.id;
 return public.hkpd_online_state();
end;
$$;
-- Keep the former per-athlete score tool read-only: match results are the new source.
create or replace function public.hkpd_block_legacy_result() returns trigger
language plpgsql set search_path='' as $$ begin if new.kind='result' then raise exception 'Use match workflow' using errcode='22023';end if;return new;end;$$;
drop trigger if exists hkpd_block_legacy_result on public.hkpd_event_operations;
create trigger hkpd_block_legacy_result before insert or update on public.hkpd_event_operations for each row execute function public.hkpd_block_legacy_result();
create or replace function public.hkpd_guard_live_catalog() returns trigger
language plpgsql security definer set search_path='' as $$ begin if exists(select 1 from public.hkpd_event_operations o where not(o.code=any(new.catalog_codes))) or exists(select 1 from public.hkpd_event_draws d where not(d.code=any(new.catalog_codes))) then raise exception 'Content has competition data' using errcode='22023';end if;return new;end;$$;
create or replace function public.hkpd_guard_match_roster() returns trigger
language plpgsql security definer set search_path='' as $$ begin if new.status='returned' and exists(select 1 from public.hkpd_event_draws d,jsonb_array_elements(d.entrants) e where e->>'schoolId'=new.school_id::text) then raise exception 'Draw already uses this roster' using errcode='22023';end if;return new;end;$$;
drop trigger if exists hkpd_guard_match_roster on public.hkpd_school_rosters;
create trigger hkpd_guard_match_roster before update of status on public.hkpd_school_rosters for each row execute function public.hkpd_guard_match_roster();
revoke all on function public.hkpd_create_event_matches(text,integer,jsonb),public.hkpd_match_command(uuid,integer,text,numeric,numeric,text),public.hkpd_resolve_match_sides(text),public.hkpd_guard_match_roster(),public.hkpd_guard_live_catalog(),public.hkpd_block_legacy_result() from public,anon,authenticated;
revoke all on function public.hkpd_online_state() from public,anon;
grant execute on function public.hkpd_online_state(),public.hkpd_create_event_matches(text,integer,jsonb),public.hkpd_match_command(uuid,integer,text,numeric,numeric,text) to authenticated;
notify pgrst, 'reload schema';
commit;
