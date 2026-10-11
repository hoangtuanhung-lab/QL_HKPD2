#!/usr/bin/env bash
# Xóa và dựng lại DB rỗng (HKPD_DB_NAME), rồi áp dụng toàn bộ migration trong HKPD_MIGRATIONS_DIR.
# Từ chối nếu tên DB không khớp ^hkpd_(dev|test|ci)... hoặc APP_ENV=production.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
require_db_execution
[ "${APP_ENV:-dev}" = "production" ] && die "db_reset.sh bị cấm khi APP_ENV=production"
require_safe_db "$HKPD_DB_NAME"
psql_admin -d postgres -c "DROP DATABASE IF EXISTS \"$HKPD_DB_NAME\" WITH (FORCE)"
psql_admin -d postgres -c "CREATE DATABASE \"$HKPD_DB_NAME\" OWNER $HKPD_DB_MIGRATOR"
"$(dirname "${BASH_SOURCE[0]}")/migrate.sh" up all
