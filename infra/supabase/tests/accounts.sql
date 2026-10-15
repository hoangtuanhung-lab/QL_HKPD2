-- Owner fixtures: only verified Google users may receive a role.
insert into auth.users values
('00000000-0000-4000-8000-000000000003','school@example.invalid',now()),
('00000000-0000-4000-8000-000000000004','referee@example.invalid',now()),
('00000000-0000-4000-8000-000000000005','leader@example.invalid',now()),
('00000000-0000-4000-8000-000000000006','admin2@example.invalid',now()),
('00000000-0000-4000-8000-000000000007','nongoogle@example.invalid',now()),
('00000000-0000-4000-8000-000000000008','unverified@example.invalid',null);
insert into auth.identities values
('00000000-0000-4000-8000-000000000002','google'),
('00000000-0000-4000-8000-000000000003','google'),
('00000000-0000-4000-8000-000000000004','google'),
('00000000-0000-4000-8000-000000000005','google'),
('00000000-0000-4000-8000-000000000006','google'),
('00000000-0000-4000-8000-000000000008','google');
update public.hkpd_admin_configuration set catalog_codes = array['BD_TH','BOI_TH_NAM_0709_TUDO50'];
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare result jsonb; sid uuid; begin
  result := public.hkpd_list_accounts();
  if jsonb_array_length(result) is distinct from 6 then raise exception 'Unexpected account list'; end if;
  if public.hkpd_workspace_access()->>'role' is distinct from 'admin' then raise exception 'Bootstrap admin lost access'; end if;
  begin
    perform public.hkpd_update_account(auth.uid(),0,'',false,null,'{}');
    raise exception 'Self-revocation accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.hkpd_update_account('00000000-0000-4000-8000-000000000007',0,'admin',true,null,'{}');
    raise exception 'Non-Google accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.hkpd_update_account('00000000-0000-4000-8000-000000000008',0,'admin',true,null,'{}');
    raise exception 'Unverified accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.hkpd_update_account('00000000-0000-4000-8000-000000000003',0,'school',true,null,'{}');
    raise exception 'Missing school accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.hkpd_update_account('00000000-0000-4000-8000-000000000004',0,'referee',true,null,array['FAKE']);
    raise exception 'Unknown sport accepted';
  exception when invalid_parameter_value then null; end;
  select id into sid from public.hkpd_schools where code='PROTECTED';
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000003',0,'school',true,sid,'{}');
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000004',0,'referee',true,null,array['BD']);
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000005',0,'leader',true,null,array['BOI']);
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000006',0,'admin',true,null,'{}');
  begin
    perform public.hkpd_update_account('00000000-0000-4000-8000-000000000004',0,'admin',true,null,'{}');
    raise exception 'Stale revision accepted';
  exception when serialization_failure then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ declare result jsonb; begin
  result:=public.hkpd_workspace_access();
  if result->>'role' is distinct from 'school' or result->'school'->>'code' is distinct from 'PROTECTED' or result->'school'->>'id' is null then raise exception 'School binding missing'; end if;
  if (select count(*) from public.hkpd_account_access)<>1 then raise exception 'Cross-user rows leaked'; end if;
  begin
    perform public.hkpd_list_accounts();raise exception 'School listed users';
  exception when insufficient_privilege then null; end;
  begin
    perform public.hkpd_update_account(auth.uid(),1,'admin',true,null,'{}');raise exception 'Self-promotion accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.hkpd_account_access set role='admin';raise exception 'Direct grant update accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.hkpd_admin_access set approved=true;raise exception 'Legacy direct promotion accepted';
  exception when insufficient_privilege then null; end;
  if public.hkpd_admin_settings() is not null then raise exception 'School read admin settings'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$ declare result jsonb; begin
  result:=public.hkpd_workspace_access();
  if result->>'role' is distinct from 'referee' or result->'sportCodes' is distinct from '["BD"]'::jsonb or result->'school' is distinct from 'null'::jsonb then raise exception 'Referee scope wrong'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
do $$ begin
  if public.hkpd_workspace_access()->'sportCodes' is distinct from '["BOI"]'::jsonb then raise exception 'Leader scope wrong'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$ begin
  if public.hkpd_workspace_access() is not null then raise exception 'Unapproved access'; end if;
  begin
    perform public.hkpd_list_accounts();raise exception 'Unapproved read accounts';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.identities where user_id='00000000-0000-4000-8000-000000000004';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ begin
  if not exists(select 1 from jsonb_array_elements(public.hkpd_list_accounts()) a where a->>'userId'='00000000-0000-4000-8000-000000000004') then raise exception 'Unlinked managed user disappeared'; end if;
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000004',1,'referee',false,null,array['BD']);
  perform public.hkpd_update_account('00000000-0000-4000-8000-000000000006',1,'admin',false,null,'{}');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
do $$ begin if public.hkpd_workspace_access() is not null then raise exception 'Revoked referee retained access'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
do $$ begin
  if public.hkpd_workspace_access() is not null then raise exception 'Revoked admin retained access'; end if;
  begin
    perform public.hkpd_list_accounts();raise exception 'Revoked admin read accounts';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare sid uuid; begin
  select id into sid from public.hkpd_schools where code='PROTECTED';
  begin delete from public.hkpd_schools where id=sid;raise exception 'Bound school deleted';
  exception when foreign_key_violation then null; end;
  if (select count(*) from public.hkpd_account_audit)<>6 then raise exception 'Audit missing or failed transaction wrote audit'; end if;
end $$;
set role anon;
do $$ begin
  begin perform public.hkpd_list_accounts();raise exception 'Anonymous list accepted';exception when insufficient_privilege then null;end;
  begin perform public.hkpd_update_account('00000000-0000-4000-8000-000000000002',0,'admin',true,null,'{}');raise exception 'Anonymous write accepted';exception when insufficient_privilege then null;end;
  begin perform public.hkpd_workspace_access();raise exception 'Anonymous workspace accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
