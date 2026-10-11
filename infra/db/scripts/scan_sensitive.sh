#!/usr/bin/env bash
# Additional B02 data scan; file names only, never matching values in logs.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
ROOT="${1:-$(cd "$DB_DIR/../.." && pwd)}"
[ -d "$ROOT" ] || die "không có thư mục: $ROOT"
node "$DB_DIR/../../scripts/db-sensitive-scan.mjs" "$ROOT"
