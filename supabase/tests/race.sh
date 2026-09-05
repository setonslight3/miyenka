#!/usr/bin/env bash
# Two genuinely parallel transactions attempt to buy the same last unit.
# Exactly one must commit; stock must never go negative.
set -euo pipefail
PORT="${1:-5433}"
PSQL="psql -h /tmp -p $PORT -U postgres -d miyenka -tA"

race() {
  $PSQL <<SQL >/dev/null 2>&1
begin;
select decrement_inventory((select id from orders where order_number='$1'));
select pg_sleep(0.4);
commit;
SQL
}

race RACE-A & race RACE-B & wait

committed=$($PSQL -c "select count(*) from orders where order_number like 'RACE-%' and inventory_committed")
stock=$($PSQL -c "select ps.quantity from product_sizes ps
  join product_variants pv on pv.id = ps.variant_id
  join products p on p.id = pv.product_id
  where p.slug='butterfly-corset-mini' and ps.size='L'")

if [ "$committed" = "1" ] && [ "$stock" = "0" ]; then
  echo "   PASS  exactly one of two concurrent buyers got the last unit (stock=0)"
else
  echo "   FAIL  committed=$committed stock=$stock (expected committed=1 stock=0)"
  exit 1
fi
