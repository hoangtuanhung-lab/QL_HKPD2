#!/usr/bin/env bash
# Isolated PostgreSQL; no production project or credentials are used.
set -euo pipefail
cd "$(dirname "$0")/../../.."
container="hkpd-access-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-bookworm >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
psql_test() { docker exec -i "$container" psql -X -q -v ON_ERROR_STOP=1 -U postgres; }
psql_test <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
create table auth.identities(user_id uuid, provider text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL
psql_test < infra/supabase/001_admin_access.sql
# Before login the bootstrap must fail, without granting anyone access.
if psql_test < infra/supabase/002_first_admin.sql >/dev/null 2>&1; then
  echo 'ERROR: bootstrap accepted a nonexistent account' >&2; exit 1
fi
psql_test <<'SQL'
insert into auth.users values
('00000000-0000-4000-8000-000000000001','hoangtuanhung@gmail.com',now()),
('00000000-0000-4000-8000-000000000002','other@example.invalid',now());
SQL
# Matching email alone is insufficient: require an actual Google identity.
if psql_test < infra/supabase/002_first_admin.sql >/dev/null 2>&1; then
  echo 'ERROR: bootstrap accepted an account without Google identity' >&2; exit 1
fi
psql_test <<'SQL'
insert into auth.identities values ('00000000-0000-4000-8000-000000000001','google');
SQL
psql_test < infra/supabase/002_first_admin.sql
psql_test < infra/supabase/001_admin_access.sql
psql_test < infra/supabase/002_first_admin.sql
psql_test < infra/supabase/tests/access.sql
psql_test < infra/supabase/002_first_admin.sql
psql_test < infra/supabase/003_admin_schools_catalog.sql
psql_test < infra/supabase/003_admin_schools_catalog.sql
psql_test < infra/supabase/tests/settings.sql
psql_test < infra/supabase/002_first_admin.sql
psql_test < infra/supabase/004_account_management.sql
psql_test < infra/supabase/004_account_management.sql
psql_test < infra/supabase/tests/accounts.sql
source infra/supabase/tests/accounts_concurrency.sh
psql_test < infra/supabase/005_live_operations.sql
psql_test < infra/supabase/005_live_operations.sql
psql_test < infra/supabase/006_drive_files.sql
psql_test < infra/supabase/006_drive_files.sql
psql_test < infra/supabase/tests/live.sql
psql_test < infra/supabase/007_student_imports.sql
psql_test < infra/supabase/007_student_imports.sql
psql_test < infra/supabase/008_match_results.sql
psql_test < infra/supabase/008_match_results.sql
psql_test < infra/supabase/tests/matches.sql
psql_test < infra/supabase/007_student_imports.sql
psql_test < infra/supabase/008_match_results.sql
echo 'PASS: bootstrap, repeat application, RLS isolation, self-promotion denial, revocation, anonymous denial, school/catalog CRUD, account roles/scopes, audit, revision conflicts, shared registrations, live schedules/lanes/results, Drive authorization, baseline import, atomic registration batches, match review/re-entry, downstream invalidation'
