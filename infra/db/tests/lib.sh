#!/usr/bin/env bash
# Thư viện test tối giản, xuất dạng TAP.
T_N=0; T_FAIL=0
T_OUTPUT="$(mktemp)"
ok()     { T_N=$((T_N+1)); echo "ok $T_N - $*"; }
not_ok() { T_N=$((T_N+1)); T_FAIL=$((T_FAIL+1)); echo "not ok $T_N - $*"; }
# expect_pass "mô tả" lệnh...   | expect_fail "mô tả" lệnh...
expect_pass() { local d="$1"; shift; if "$@" >"$T_OUTPUT" 2>&1; then ok "$d"; else not_ok "$d"; sed 's/^/#   /' "$T_OUTPUT" | tail -n 15; fi; }
expect_fail() { local d="$1"; shift; if "$@" >"$T_OUTPUT" 2>&1; then not_ok "$d (đáng lẽ phải thất bại)"; else ok "$d"; fi; }
# expect_fail_msg "mô tả" "mẫu cần thấy" lệnh...
expect_fail_msg() { local d="$1" m="$2"; shift 2; if "$@" >"$T_OUTPUT" 2>&1; then not_ok "$d (đáng lẽ phải thất bại)"; elif grep -q -- "$m" "$T_OUTPUT"; then ok "$d"; else not_ok "$d (thiếu thông báo '$m')"; sed 's/^/#   /' "$T_OUTPUT" | tail -n 8; fi; }
t_summary() { rm -f "$T_OUTPUT"; echo "1..$T_N"; echo "# tổng: $T_N, lỗi: $T_FAIL"; [ "$T_FAIL" -eq 0 ]; }
