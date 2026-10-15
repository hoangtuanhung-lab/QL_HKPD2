begin;
create table if not exists public.hkpd_drive_folders (
 athlete_id text primary key references public.hkpd_live_athletes(id) on delete restrict,
 folder_id text not null unique,root_id text not null,created_at timestamptz not null default now()
);
alter table public.hkpd_drive_folders enable row level security;
revoke all on public.hkpd_drive_folders from public,anon,authenticated;
-- Only the server-side key may access physical Drive IDs. End-user authorization stays on their JWT.
grant select,insert on public.hkpd_drive_folders to service_role;
create or replace function public.hkpd_authorize_athlete_file(p_athlete_id text,p_write boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare access jsonb; athlete public.hkpd_live_athletes; roster_status text;
begin
 access:=public.hkpd_workspace_access();
 if access is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into athlete from public.hkpd_live_athletes where id=p_athlete_id and active;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 select status into roster_status from public.hkpd_school_rosters where school_id=athlete.school_id;
 if access->>'role'='admin' or (access->>'role'='school' and access->'school'->>'id'=athlete.school_id::text)
 or (access->>'role' in ('leader','referee') and roster_status='approved' and exists(select 1 from jsonb_array_elements_text(athlete.profile->'catalogSelections') c where access->'sportCodes' ? split_part(c,'_',1) and access->'catalogCodes' ? c)) then
  return jsonb_build_object('athleteId',athlete.id,'athleteCode',athlete.code,'editionId','edition-2026');
 end if;
 raise exception 'Not authorized' using errcode='42501';
end;
$$;
revoke all on function public.hkpd_authorize_athlete_file(text,boolean) from public,anon;
grant execute on function public.hkpd_authorize_athlete_file(text,boolean) to authenticated;
commit;
