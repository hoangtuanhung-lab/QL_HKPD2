reset role;
insert into public.hkpd_schools(id,code,name,level) values
 ('10000000-0000-4000-8000-000000000001','ONLINE_A','Trường trực tuyến A','TH'),
 ('10000000-0000-4000-8000-000000000002','ONLINE_B','Trường trực tuyến B','TH');
insert into auth.users values
 ('10000000-0000-4000-8000-000000000001','online-a@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000002','online-b@example.invalid',now()),
 ('10000000-0000-4000-8000-000000000003','online-ref@example.invalid',now());
insert into auth.identities values
 ('10000000-0000-4000-8000-000000000001','google'),
 ('10000000-0000-4000-8000-000000000002','google'),
 ('10000000-0000-4000-8000-000000000003','google');
update public.hkpd_admin_configuration set catalog_codes=array['DK_TH_NAM_TC_60M','BOI_TH_NAM_1011_TUDO50','DK_THCS_NAM_TC_1500M'];
insert into public.hkpd_account_access(user_id,role,approved,school_id,sport_codes) values
 ('10000000-0000-4000-8000-000000000001','school',true,'10000000-0000-4000-8000-000000000001','{}'),
 ('10000000-0000-4000-8000-000000000002','school',true,'10000000-0000-4000-8000-000000000002','{}'),
 ('10000000-0000-4000-8000-000000000003','referee',true,null,array['DK']);
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $$ declare p jsonb; result jsonb; begin
 p:='[{"draftId":"draft_20000000-0000-4000-8000-000000000001","fullName":"Học sinh A","className":"5A","identityNumber":"000000000101","birthDate":"2016-05-15","gender":"male","catalogSelections":["DK_TH_NAM_TC_60M","BOI_TH_NAM_1011_TUDO50"],"photoDataUrl":"must-not-persist","role":"admin"}]';
 p:=p || jsonb_build_array(jsonb_set(jsonb_set(p->0,'{draftId}','"draft_20000000-0000-4000-8000-000000000002"'),'{identityNumber}','"000000000102"'));
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000002',0,p,'save');raise exception 'Cross-school write';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',0,jsonb_set(p,'{0,catalogSelections}','["DK_THCS_NAM_TC_1500M"]'),'save');raise exception 'Primary entered THCS';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',0,jsonb_set(p,'{0,gender}','"female"'),'save');raise exception 'Female entered male';exception when invalid_parameter_value then null;end;
 result:=public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',0,p,'save');
 if jsonb_array_length(result->'schools')<>1 or result->'schools'->0->>'revision'<>'1' then raise exception 'School isolation or save broken';end if;
 if result->'schools'->0->'athletes'->0 ? 'photoDataUrl' or result->'schools'->0->'athletes'->0 ? 'role' then raise exception 'Untrusted keys persisted';end if;
 if result->'schools'->0->'athletes'->0->>'athleteCode' not like 'VDV%' then raise exception 'Missing server code';end if;
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',0,p,'save');raise exception 'Lost-update protection';exception when serialization_failure then null;end;
 perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',1,p,'submit');
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',2,p,'save');raise exception 'Submitted roster edited';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',2,'[]','approve');raise exception 'School self-approval';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','schedule',0,'{}');raise exception 'School scheduled';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_authorize_athlete_file('draft_20000000-0000-4000-8000-000000000099');raise exception 'Foreign file access';exception when insufficient_privilege then null;end;
 if public.hkpd_authorize_athlete_file('draft_20000000-0000-4000-8000-000000000001')->>'athleteId' is null then raise exception 'Own files blocked';end if;
 begin perform folder_id from public.hkpd_drive_folders;raise exception 'Physical Drive ID leaked';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
do $$ begin
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000002',0,'[{"draftId":"draft_20000000-0000-4000-8000-000000000001","fullName":"Học sinh B","className":"5A","catalogSelections":[]}]','save');raise exception 'Foreign athlete takeover';exception when insufficient_privilege then null;end;
 if (public.hkpd_online_state()->'schools'->0->'athletes')<>'[]'::jsonb then raise exception 'Other school athletes leaked';end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$ begin
 if jsonb_array_length(public.hkpd_online_state()->'schools')<>0 then raise exception 'Unapproved roster exposed to referee';end if;
 begin perform public.hkpd_authorize_athlete_file('draft_20000000-0000-4000-8000-000000000001');raise exception 'Unapproved file exposed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
reset role;
update public.hkpd_admin_configuration set catalog_codes=array['BOI_TH_NAM_1011_TUDO50'];
set role authenticated;
do $$ begin
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',2,'[]','approve');raise exception 'Closed content approved';exception when invalid_parameter_value then null;end;
end $$;
reset role;
update public.hkpd_admin_configuration set catalog_codes=array['DK_TH_NAM_TC_60M','BOI_TH_NAM_1011_TUDO50','DK_THCS_NAM_TC_1500M'];
set role authenticated;
do $$ declare result jsonb; begin
 result:=public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',2,'[]','approve');
 if not exists(select 1 from jsonb_array_elements(result->'schools') s where s->>'id'='10000000-0000-4000-8000-000000000001' and s->>'status'='approved') then raise exception 'Approval not shared';end if;
 perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','schedule',0,'{"venue":"Sân A","start":"2026-10-24T08:00:00+07:00","end":"2026-10-24T09:00:00+07:00"}');
 begin perform public.hkpd_save_operation('BOI_TH_NAM_1011_TUDO50','schedule',0,'{"venue":"Bể bơi","start":"2026-10-24T08:30:00+07:00","end":"2026-10-24T09:30:00+07:00"}');raise exception 'Shared athlete double-booked';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','lanes',0,'[]');raise exception 'Admin assigned lanes';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$ declare result jsonb; p jsonb; begin
 result:=public.hkpd_online_state();
 if jsonb_array_length(result->'schools')<>1 or result->'schools'->0->'athletes'->0->'catalogSelections'<>'["DK_TH_NAM_TC_60M"]'::jsonb then raise exception 'Referee sport scope broken';end if;
 if result->'schools'->0->'athletes'->0 ? 'identityNumber' then raise exception 'Identity exposed to referee';end if;
 perform public.hkpd_authorize_athlete_file('draft_20000000-0000-4000-8000-000000000001');
 p:='[{"athleteId":"draft_20000000-0000-4000-8000-000000000001","heat":1,"lane":1}]';
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','lanes',0,p || jsonb_set(p,'{0,athleteId}','"draft_20000000-0000-4000-8000-000000000002"'));raise exception 'Duplicate heat/lane accepted';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_save_operation('BOI_TH_NAM_1011_TUDO50','lanes',0,p);raise exception 'Unassigned sport write';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','lanes',0,jsonb_set(p,'{0,athleteId}','"draft_20000000-0000-4000-8000-000000000099"'));raise exception 'Unknown athlete accepted';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','lanes',0,jsonb_set(p,'{0,lane}','1.5'));raise exception 'Fractional lane accepted';exception when invalid_parameter_value then null;end;
 perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','lanes',0,p);
 perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','result',0,'[{"athleteId":"draft_20000000-0000-4000-8000-000000000001","value":"10.50 giây"}]');
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','result',1,null,'confirm');
 begin perform public.hkpd_update_admin_settings((public.hkpd_admin_settings()->>'revision')::integer,'catalog','{"codes":["BOI_TH_NAM_1011_TUDO50"]}');raise exception 'Live result hidden by catalog removal';exception when invalid_parameter_value then null;end;
raise exception 'Referee confirmed own result';exception when insufficient_privilege then null;end;
 begin perform id from public.hkpd_live_athletes;raise exception 'Raw athlete table exposed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
do $$ begin
 if exists(select 1 from jsonb_array_elements(public.hkpd_online_state()->'operations') o where o->>'kind'='result') then raise exception 'Unconfirmed result exposed to school';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ begin
 perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','result',1,null,'confirm');
 begin perform public.hkpd_save_roster('10000000-0000-4000-8000-000000000001',3,'[]','return','Sửa');raise exception 'Roster reopened after competition';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform public.hkpd_save_operation('DK_TH_NAM_TC_60M','result',2,'[{"athleteId":"draft_20000000-0000-4000-8000-000000000001","value":"0"}]');raise exception 'Confirmed result overwritten';exception when invalid_parameter_value then null;end;
end $$;
reset role;
update public.hkpd_account_access set approved=false where user_id='10000000-0000-4000-8000-000000000003';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform public.hkpd_online_state();raise exception 'Revoked read';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_authorize_athlete_file('draft_20000000-0000-4000-8000-000000000001');raise exception 'Revoked file access';exception when insufficient_privilege then null;end;
end $$;
set role anon;
do $$ begin
 begin perform public.hkpd_online_state();raise exception 'Anonymous read';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_save_roster(null,0,'[]','save');raise exception 'Anonymous write';exception when insufficient_privilege then null;end;
end $$;
reset role;
