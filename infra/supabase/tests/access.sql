set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
do $$ begin
  if public.hkpd_workspace_access() is not null then raise exception 'Unassigned user received access'; end if;
  if exists(select from public.hkpd_admin_access) then raise exception 'Cross-user grant leaked'; end if;
  begin
    insert into public.hkpd_admin_access(user_id, approved) values (auth.uid(),true);
    raise exception 'Self-promotion succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.hkpd_admin_access set approved = true;
    raise exception 'Grant mutation succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ declare payload jsonb; begin
  payload := public.hkpd_workspace_access();
  if payload is null or payload->>'role' <> 'admin' or payload->>'userId' <> auth.uid()::text then raise exception 'Admin grant missing or mismatched'; end if;
end $$;
reset role;
update public.hkpd_admin_access set approved = false;
set role authenticated;
do $$ begin
  if public.hkpd_workspace_access() is not null then raise exception 'Revoked grant retained access'; end if;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.hkpd_workspace_access();
    raise exception 'Anonymous RPC succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.hkpd_admin_access;
    raise exception 'Anonymous table access succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
