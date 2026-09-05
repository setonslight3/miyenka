#!/usr/bin/env bash
# Runs the Miyenka migrations and test suites against a throwaway PostgreSQL
# instance. Requires PostgreSQL 16 binaries on PATH (or at PG_BIN).
#
#   ./supabase/tests/run.sh
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
export PATH="$PG_BIN:$PATH"
PGROOT="${PGROOT:-/tmp/miyenka-pg}"
PORT="${PORT:-5433}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

cleanup() { pg_ctl -D "$PGROOT/data" stop -s -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT

rm -rf "$PGROOT"; mkdir -p "$PGROOT"; chmod 777 "$PGROOT"
if id postgres >/dev/null 2>&1 && [ "$(id -u)" = "0" ]; then
  chown postgres:postgres "$PGROOT"
  RUN="su postgres -c"
else
  RUN="bash -c"
fi

$RUN "PATH=$PG_BIN:\$PATH initdb -D $PGROOT/data -A trust -U postgres" >/dev/null
$RUN "PATH=$PG_BIN:\$PATH pg_ctl -D $PGROOT/data -o '-p $PORT -k /tmp' -l $PGROOT/pg.log start" >/dev/null
sleep 2

PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database miyenka;" >/dev/null
PSQL="$PSQL -d miyenka"

echo "→ loading Supabase shim"
$PSQL -f "$ROOT/supabase/tests/00_supabase_shim.sql"

echo "→ applying migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  $PSQL -f "$f"
done

echo "→ business rules"
$PSQL -f "$ROOT/supabase/tests/01_business_rules.sql" 2>&1 | grep -E 'PASS|FAIL|passed' | sed 's/^.*NOTICE:  /   /'

echo "→ row-level security"
$PSQL -f "$ROOT/supabase/tests/02_rls.sql" 2>&1 | grep -E 'PASS|FAIL|passed' | sed 's/^.*NOTICE:  /   /'

echo "→ concurrent last-item purchase"
$PSQL -f "$ROOT/supabase/tests/03_concurrency.sql" >/dev/null
bash "$ROOT/supabase/tests/race.sh" "$PORT"

echo
echo "All database checks passed."
