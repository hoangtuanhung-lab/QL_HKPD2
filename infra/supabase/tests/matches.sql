reset role;
insert into public.hkpd_schools(id,code,name,level) values
('30000000-0000-4000-8000-000000000001','MATCH_A','Trường trận A','THCS'),('30000000-0000-4000-8000-000000000002','MATCH_B','Trường trận B','THCS'),('30000000-0000-4000-8000-000000000003','MATCH_C','Trường trận C','THCS');
insert into auth.users values
('30000000-0000-4000-8000-000000000010','leader-match@example.invalid',now()),('30000000-0000-4000-8000-000000000011','ref-match@example.invalid',now()),('30000000-0000-4000-8000-000000000012','school-match@example.invalid',now());
insert into auth.identities values('30000000-0000-4000-8000-000000000010','google'),('30000000-0000-4000-8000-000000000011','google'),('30000000-0000-4000-8000-000000000012','google');
insert into public.hkpd_account_access(user_id,role,approved,school_id,sport_codes) values
('30000000-0000-4000-8000-000000000010','leader',true,null,array['CL','BOI']),('30000000-0000-4000-8000-000000000011','referee',true,null,array['CL','BOI']),('30000000-0000-4000-8000-000000000012','school',true,'30000000-0000-4000-8000-000000000001','{}');
update public.hkpd_admin_configuration set catalog_codes=catalog_codes||array['CL_THCS_NAM_1213_DONNAM','CL_THCS_NAM_1213_DOINAM','BOI_THCS_NAM_1213_TUDO50'];
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare a jsonb; b jsonb; c jsonb; state jsonb; begin
 a:='[{"identityNumber":"300000000001","fullName":"Học sinh nền A","schoolId":"30000000-0000-4000-8000-000000000001","className":"7","birthDate":"2014-05-15","gender":"male"},{"identityNumber":"300000000002","fullName":"Học sinh nền B","schoolId":"30000000-0000-4000-8000-000000000002","className":"7","birthDate":"2014-05-15","gender":"male"}]';
 state:=public.hkpd_import_students(0,a);
 if state->>'studentCount'<>'2' or state->>'registryRevision'<>'1' then raise exception 'Registry metadata missing';end if;
 begin perform public.hkpd_import_students(0,a);raise exception 'Stale registry imported';exception when serialization_failure then null;end;
 select jsonb_agg(jsonb_build_object('draftId','draft_40000000-0000-4000-8000-'||lpad(i::text,12,'0'),'fullName','VĐV '||i,'className','7','identityNumber','40000000000'||i,'birthDate','2014-05-15','gender','male','requestedEvent','','catalogSelections',array['CL_THCS_NAM_1213_DONNAM','CL_THCS_NAM_1213_DOINAM','BOI_THCS_NAM_1213_TUDO50'])) into a from generate_series(1,4) i;
 select jsonb_agg(jsonb_build_object('draftId','draft_40000000-0000-4000-8000-'||lpad(i::text,12,'0'),'fullName','VĐV '||i,'className','7','identityNumber','40000000000'||i,'birthDate','2014-05-15','gender','male','requestedEvent','','catalogSelections',array['CL_THCS_NAM_1213_DONNAM','CL_THCS_NAM_1213_DOINAM','BOI_THCS_NAM_1213_TUDO50'])) into b from generate_series(5,6) i;
 select jsonb_agg(jsonb_build_object('draftId','draft_40000000-0000-4000-8000-'||lpad(i::text,12,'0'),'fullName','VĐV '||i,'className','7','identityNumber','40000000000'||i,'birthDate','2014-05-15','gender','male','requestedEvent','','catalogSelections',array['CL_THCS_NAM_1213_DONNAM','CL_THCS_NAM_1213_DOINAM','BOI_THCS_NAM_1213_TUDO50'])) into c from generate_series(7,8) i;
 begin
  perform public.hkpd_import_registrations(jsonb_build_array(jsonb_build_object('schoolId','30000000-0000-4000-8000-000000000001','revision',0,'athletes',a),jsonb_build_object('schoolId','30000000-0000-4000-8000-000000000002','revision',0,'athletes',jsonb_set(b,'{0,identityNumber}','"invalid"'))));raise exception 'Partial invalid batch imported';
 exception when invalid_parameter_value then null;end;
 if exists(select 1 from jsonb_array_elements(public.hkpd_online_state()->'schools') s where s->>'id'='30000000-0000-4000-8000-000000000001' and jsonb_array_length(s->'athletes')<>0) then raise exception 'Atomic import leaked partial write';end if;
 perform public.hkpd_import_registrations(jsonb_build_array(jsonb_build_object('schoolId','30000000-0000-4000-8000-000000000001','revision',0,'athletes',a),jsonb_build_object('schoolId','30000000-0000-4000-8000-000000000002','revision',0,'athletes',b)));
 perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000003',0,c,'save');perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000003',1,c,'submit');perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000003',2,'[]','approve');
 perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000001',1,a,'submit');perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000002',1,b,'submit');
 perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000001',2,'[]','approve');perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000002',2,'[]','approve');
 begin perform public.hkpd_create_event_matches('CL_THCS_NAM_1213_DONNAM',0,'{}');raise exception 'Admin configured leader scoring';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000012',false);
do $$ begin
 if jsonb_array_length(public.hkpd_lookup_students(array['300000000001','300000000002']))<>1 then raise exception 'Registry school scope leaked';end if;
 begin perform public.hkpd_import_students(1,'[]');raise exception 'School imported baseline';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_import_registrations('[]');raise exception 'School bulk imported other schools';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);
do $$ declare entries jsonb; state jsonb; begin
 select jsonb_agg(jsonb_build_object('id','draft_40000000-0000-4000-8000-'||lpad(i::text,12,'0'),'label','VĐV '||i,'schoolId',case when i<=4 then '30000000-0000-4000-8000-000000000001' else '30000000-0000-4000-8000-000000000002' end,'members',array['draft_40000000-0000-4000-8000-'||lpad(i::text,12,'0')])) into entries from unnest(array[1,2,5]) i;
 begin perform public.hkpd_create_event_matches('CL_THCS_NAM_1213_DONNAM',0,jsonb_build_object('mode','round_robin','entrants',entries));raise exception 'Missing scoring config accepted';exception when invalid_parameter_value then null;end;
 state:=public.hkpd_create_event_matches('CL_THCS_NAM_1213_DONNAM',0,jsonb_build_object('mode','round_robin','entrants',entries,'winPoints',2,'drawPoints',1,'lossPoints',0,'allowDraw',false));
 if (select count(*) from jsonb_array_elements(state->'matches') m where m->>'code'='CL_THCS_NAM_1213_DONNAM')<>3 then raise exception 'RR pair count wrong';end if;
 select jsonb_agg(jsonb_build_object('id','pair'||i,'label','Cặp '||i,'schoolId',case when i<=2 then '30000000-0000-4000-8000-000000000001' when i=3 then '30000000-0000-4000-8000-000000000002' else '30000000-0000-4000-8000-000000000003' end,'members',array['draft_40000000-0000-4000-8000-'||lpad((2*i-1)::text,12,'0'),'draft_40000000-0000-4000-8000-'||lpad((2*i)::text,12,'0')])) into entries from generate_series(1,4) i;
 perform public.hkpd_create_event_matches('CL_THCS_NAM_1213_DOINAM',0,jsonb_build_object('mode','knockout','entrants',entries,'winPoints',1,'drawPoints',0,'lossPoints',0,'allowDraw',false));
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',false);
do $$ declare m jsonb; state jsonb;begin
 select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='CL_THCS_NAM_1213_DONNAM' and x->>'match_no'='1';
 state:=public.hkpd_match_command((m->>'id')::uuid,0,'submit',2,1);
 begin perform public.hkpd_match_command((m->>'id')::uuid,1,'confirm');raise exception 'Referee self-confirmed';exception when insufficient_privilege then null;end;
 begin perform public.hkpd_match_command((m->>'id')::uuid,1,'submit',3,1);raise exception 'Pending scores overwritten';exception when invalid_parameter_value then null;end;
 begin perform public.hkpd_match_command((m->>'id')::uuid,0,'request_reentry',null,null,'Sửa');raise exception 'Stale CAS accepted';exception when serialization_failure then null;end;
 begin perform public.hkpd_save_operation('CL_THCS_NAM_1213_DONNAM','result',0,'[{"athleteId":"draft_40000000-0000-4000-8000-000000000001","value":"10"}]');raise exception 'Legacy direct result accepted';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);
do $$ declare m jsonb;begin
 select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='CL_THCS_NAM_1213_DONNAM' and x->>'match_no'='1';
 perform public.hkpd_match_command((m->>'id')::uuid,1,'reject',null,null,'Nhập sai điểm');
 begin perform public.hkpd_match_command((m->>'id')::uuid,2,'submit',2,1);raise exception 'Leader entered referee scores';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);
do $$ begin
 perform public.hkpd_create_event_matches('BOI_THCS_NAM_1213_TUDO50',0,'{"mode":"performance","winPoints":0,"drawPoints":0,"lossPoints":0,"allowDraw":false,"unit":"giây","entrants":[{"id":"swim1","label":"Bơi A","schoolId":"30000000-0000-4000-8000-000000000001","members":["draft_40000000-0000-4000-8000-000000000001"]}]}');
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',false);
do $$ declare m jsonb;begin select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='BOI_THCS_NAM_1213_TUDO50';perform public.hkpd_match_command((m->>'id')::uuid,0,'submit',12.5,null);end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);
do $$ declare m jsonb;begin select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='BOI_THCS_NAM_1213_TUDO50';perform public.hkpd_match_command((m->>'id')::uuid,1,'confirm');end $$;
-- Enter and confirm both first-round pair matches and their final.
reset role;
do $$ declare m public.hkpd_result_matches; begin
 for m in select * from public.hkpd_result_matches where code='CL_THCS_NAM_1213_DOINAM' order by round_no,match_no loop
  perform set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',false);perform public.hkpd_match_command(m.id,m.revision,'submit',2,1);
  perform set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);perform public.hkpd_match_command(m.id,m.revision+1,'confirm');
 end loop;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000011',false);
do $$ declare m jsonb; final jsonb; err text; begin
 select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='CL_THCS_NAM_1213_DOINAM' and x->>'match_no'='1';
 perform public.hkpd_match_command((m->>'id')::uuid,2,'request_reentry',null,null,'Đối chiếu lại biên bản');
 select x into final from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='CL_THCS_NAM_1213_DOINAM' and x->>'round_no'='2';
 begin perform public.hkpd_match_command((final->>'id')::uuid,(final->>'revision')::integer,'submit',1,2);raise exception 'Disputed upstream accepted';exception when invalid_parameter_value then get stacked diagnostics err=message_text;if err<>'Upstream result under review' then raise exception 'Wrong upstream failure: %',err;end if;end;
 begin perform public.hkpd_match_command((m->>'id')::uuid,3,'submit',1,2);raise exception 'Requested reentry unlocked before rejection';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000010',false);
do $$ declare m jsonb;state jsonb;final jsonb;begin
 select x into m from jsonb_array_elements(public.hkpd_online_state()->'matches') x where x->>'code'='CL_THCS_NAM_1213_DOINAM' and x->>'match_no'='1';
 state:=public.hkpd_match_command((m->>'id')::uuid,3,'reject',null,null,'Sửa kết quả vòng trước');
 select x into final from jsonb_array_elements(state->'matches') x where x->>'code'='CL_THCS_NAM_1213_DOINAM' and x->>'round_no'='2';
 if final->>'status'<>'reentry' or final->'side1'<>'null'::jsonb or final->'score1'<>'null'::jsonb then raise exception 'Stale downstream result remained official';end if;
 if not exists(select 1 from jsonb_array_elements(final->'log') l where l->>'action'='source_invalidated' and l->'before_state'->>'score1'='2') then raise exception 'Old score audit lost';end if;
 begin perform public.hkpd_create_event_matches('CL_THCS_NAM_1213_DOINAM',1,'{}');raise exception 'Active fixtures replaced';exception when invalid_parameter_value then null;end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.hkpd_result_matches where code='CL_THCS_NAM_1213_DONNAM' and side1=side2) then raise exception 'Self RR match';end if;
 if (select count(distinct array[least(side1,side2),greatest(side1,side2)]) from public.hkpd_result_matches where code='CL_THCS_NAM_1213_DONNAM')<>3 then raise exception 'RR pairs repeated';end if;
end $$;
set role anon;
do $$ begin begin perform public.hkpd_lookup_students(array['300000000001']);raise exception 'Anonymous registry access';exception when insufficient_privilege then null;end;begin perform public.hkpd_match_command(null,0,'submit',1,0);raise exception 'Anonymous result';exception when insufficient_privilege then null;end;end $$;
reset role;
