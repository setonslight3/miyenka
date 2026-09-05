#!/usr/bin/env bash
# Regenerates src/lib/supabase/database.types.ts from supabase/migrations/.
#
# Stands up a throwaway PostgreSQL instance, applies every migration, then
# introspects the result — so the generated types always describe what the
# migrations actually produce, with no live project required.
#
# Against a linked Supabase project the official generator also works:
#   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
export PATH="$PG_BIN:$PATH"
PGROOT="${PGROOT:-/tmp/miyenka-types-pg}"
PORT="${PORT:-5434}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() { pkill -f "postgres -D $PGROOT/data" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup
for _ in $(seq 1 30); do
  if ! (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then break; fi
  exec 3<&- 2>/dev/null || true
  sleep 0.5
done

rm -rf "$PGROOT"; mkdir -p "$PGROOT"; chmod 777 "$PGROOT"
if id postgres >/dev/null 2>&1 && [ "$(id -u)" = "0" ]; then
  chown postgres:postgres "$PGROOT"; RUN="su postgres -c"
else
  RUN="bash -c"
fi

$RUN "PATH=$PG_BIN:\$PATH initdb -D $PGROOT/data -A trust -U postgres" >/dev/null
$RUN "PATH=$PG_BIN:\$PATH pg_ctl -D $PGROOT/data -o '-p $PORT -k /tmp' -l $PGROOT/pg.log start" >/dev/null
for _ in $(seq 1 40); do
  if pg_isready -h /tmp -p "$PORT" -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done

PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database miyenka;" >/dev/null
$PSQL -d miyenka -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -d miyenka -f "$f"; done

cd "$ROOT"
PGPORT="$PORT" python3 scripts/introspect-types.py
echo "→ wrote src/lib/supabase/database.types.ts"
