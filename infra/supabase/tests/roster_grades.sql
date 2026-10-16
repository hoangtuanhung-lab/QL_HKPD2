-- Direct RPC calls must not bypass grade checks by supplying educationLevel.
reset role;
insert into public.hkpd_schools(id,code,name,level) values
('50000000-0000-4000-8000-000000000001','GRADE_GUARD','Trường kiểm tra khối','THCS');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare a jsonb; invalid_grade text; err text; state jsonb; action text; roster_revision integer; begin
 a:='[{"draftId":"draft_50000000-0000-4000-8000-000000000002","fullName":"Học sinh kiểm tra khối","className":"7A","identityNumber":"500000000001","birthDate":"2014-05-15","gender":"male","educationLevel":"THCS","catalogSelections":["CL_THCS_NAM_1213_DONNAM"]}]';
 foreach invalid_grade in array array['0','abc','','10','007'] loop
  foreach action in array array['save','submit'] loop
   begin
    perform public.hkpd_save_roster('50000000-0000-4000-8000-000000000001',0,jsonb_set(a,'{0,className}',to_jsonb(invalid_grade)),action);
    raise exception 'Invalid grade accepted: % / %',invalid_grade,action;
   exception when invalid_parameter_value then null;
   end;
  end loop;
 end loop;
 state:=public.hkpd_online_state();
 if jsonb_array_length(state->'draws')<>3 then raise exception 'Existing draw state lost after 009';end if;
 select (s->>'revision')::integer into roster_revision from jsonb_array_elements(state->'schools') s where s->>'id'='30000000-0000-4000-8000-000000000001';
 begin
  perform public.hkpd_save_roster('30000000-0000-4000-8000-000000000001',roster_revision,'[]','return','Reopen draw source');
  raise exception 'Match source guard lost after 009';
 exception when invalid_parameter_value then get stacked diagnostics err=message_text;if err<>'Draw already uses this roster' then raise exception 'Unexpected reopen failure: %',err;end if;
 end;
 state:=public.hkpd_save_roster('50000000-0000-4000-8000-000000000001',0,a,'save');
 if not exists(select 1 from jsonb_array_elements(state->'schools') s where s->>'id'='50000000-0000-4000-8000-000000000001' and s->>'revision'='1' and s->'athletes'->0->>'className'='7A') then raise exception 'Valid class suffix rejected or revision changed by failed calls';end if;
end $$;
reset role;
