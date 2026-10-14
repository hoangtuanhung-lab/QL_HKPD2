set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare result jsonb; saved_id text; begin
  result := public.hkpd_admin_settings();
  if result is null or jsonb_array_length(result->'catalogCodes') <> 133 then raise exception 'Initial catalog missing'; end if;
  result := public.hkpd_update_admin_settings(0,'school.save','{"code":"th_quang_phu","name":"Trường Quảng Phú","level":"TH"}');
  if result->>'revision' <> '1' or result->'schools'->0->>'code' <> 'TH_QUANG_PHU' then raise exception 'Create failed'; end if;
  saved_id := result->'schools'->0->>'id';
  begin
    perform public.hkpd_update_admin_settings(0,'catalog','{"codes":[]}');
    raise exception 'Stale revision accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.hkpd_update_admin_settings(1,'catalog','{"codes":["FAKE"]}');
    raise exception 'Unknown code accepted';
  exception when raise_exception then if sqlerrm <> 'Unknown catalog code' then raise; end if; end;
  begin
    perform public.hkpd_update_admin_settings(1,'school.save','{"code":"TH_QUANG_PHU","name":"Trùng mã","level":"THCS"}');
    raise exception 'Duplicate school accepted';
  exception when unique_violation then null; end;
  begin
    perform public.hkpd_update_admin_settings(1,'school.save','{"code":"BAD","name":"Trường lỗi","level":"bad"}');
    raise exception 'Invalid school level accepted';
  exception when check_violation then null; end;
  result := public.hkpd_update_admin_settings(1,'catalog','{"codes":["BD_TH"]}');
  if result->>'revision' <> '2' or result->'catalogCodes' <> '["BD_TH"]'::jsonb then raise exception 'Catalog update failed'; end if;
  result := public.hkpd_update_admin_settings(2,'school.save',jsonb_build_object('id',saved_id,'code','TH_QUANG_PHU','name','Đổi tên trường','level','TH_THCS'));
  if result->'schools'->0->>'name' <> 'Đổi tên trường' then raise exception 'Edit failed'; end if;
  result := public.hkpd_update_admin_settings(3,'school.delete',jsonb_build_object('id',saved_id));
  if result->'schools' <> '[]'::jsonb then raise exception 'Delete failed'; end if;
  result := public.hkpd_update_admin_settings(4,'catalog','{"codes":[]}');
  if result->'catalogCodes' <> '[]'::jsonb then raise exception 'Closing catalog failed'; end if;
  perform public.hkpd_update_admin_settings(5,'school.save','{"code":"PROTECTED","name":"Trường được bảo vệ","level":"TH"}');
  begin
    update public.hkpd_admin_configuration set revision=0;
    raise exception 'Direct write bypassed CAS';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$ begin
  if public.hkpd_admin_settings() is not null then raise exception 'Unassigned user read settings'; end if;
  if exists(select from public.hkpd_schools) then raise exception 'Unassigned user read schools'; end if;
  begin
    perform public.hkpd_update_admin_settings(6,'school.save','{"code":"HACK","name":"Unauthorized","level":"TH"}');
    raise exception 'Unassigned user wrote settings';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.hkpd_admin_access set approved=false;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ begin
  if public.hkpd_admin_settings() is not null then raise exception 'Revoked admin read settings'; end if;
  begin
    perform public.hkpd_update_admin_settings(6,'catalog','{"codes":[]}');
    raise exception 'Revoked admin wrote settings';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.hkpd_admin_settings();
    raise exception 'Anonymous read settings';
  exception when insufficient_privilege then null; end;
  begin
    perform public.hkpd_update_admin_settings(6,'catalog','{"codes":[]}');
    raise exception 'Anonymous wrote settings';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
