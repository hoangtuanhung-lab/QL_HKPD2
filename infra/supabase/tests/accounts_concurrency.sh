# Sourced from run.sh; operates only on the disposable PostgreSQL container.
# Two admins try to revoke each other. Caller B must be checked again after
# waiting for A's transaction, rather than using its earlier approval snapshot.
account_logs=$(mktemp -d)
trap 'docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$account_logs"' EXIT
psql_test >/dev/null <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.hkpd_update_account('00000000-0000-4000-8000-000000000006',2,'admin',true,null,'{}');
SQL
psql_test >"$account_logs/a" 2>&1 <<'SQL' &
begin;
set application_name = 'hkpd_revoke_a';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.hkpd_update_account('00000000-0000-4000-8000-000000000006',3,'admin',false,null,'{}');
select pg_sleep(3);
commit;
SQL
account_a_pid=$!
account_a_ready=0
for attempt in {1..30}; do
  if [[ "$(docker exec "$container" psql -X -At -U postgres -c "select count(*) from pg_stat_activity where application_name='hkpd_revoke_a' and wait_event='PgSleep'")" == 1 ]]; then
    account_a_ready=1; break
  fi
  sleep 0.1
done
if [[ "$account_a_ready" != 1 ]]; then cat "$account_logs/a"; echo 'Concurrent test did not reach transaction barrier' >&2; exit 1; fi
if psql_test >"$account_logs/b" 2>&1 <<'SQL'
\set VERBOSITY verbose
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
select public.hkpd_update_account('00000000-0000-4000-8000-000000000001',0,'admin',false,null,'{}');
SQL
then
  echo 'ERROR: revoked admin completed concurrent cross-revocation' >&2; exit 1
fi
wait "$account_a_pid"
if [[ "$(cat "$account_logs/b")" != *42501* ]]; then cat "$account_logs/b"; exit 1; fi
psql_test <<'SQL'
do $$ begin
  if (select count(*) from public.hkpd_admin_access where approved) <> 1 then raise exception 'Concurrent revocations lost the last admin'; end if;
  if not exists(select from public.hkpd_admin_access where user_id='00000000-0000-4000-8000-000000000001' and approved) then raise exception 'Wrong admin survived'; end if;
end $$;
SQL
echo 'PASS: concurrent cross-revocation preserves an active administrator'
