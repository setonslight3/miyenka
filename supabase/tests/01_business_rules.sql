-- ============================================================================
-- Miyenka — business rule tests
--
-- Covers the rules that must hold even when the UI is bypassed:
-- inventory atomicity, webhook idempotency, review eligibility, cancellation.
-- Run with: psql -v ON_ERROR_STOP=1 -f 01_business_rules.sql
-- ============================================================================

\set QUIET on
\timing off

create or replace function assert(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  %', label;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'buyer@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'owner@miyenka.com')
on conflict do nothing;

insert into admin_users (user_id, email, role)
values ('33333333-3333-3333-3333-333333333333', 'owner@miyenka.com', 'owner')
on conflict do nothing;

-- A size row with exactly one unit left, to test the last-item race.
do $$
declare v_size_id uuid;
begin
  select ps.id into v_size_id
    from product_sizes ps
    join product_variants pv on pv.id = ps.variant_id
    join products p on p.id = pv.product_id
   where p.slug = 'sculpted-rose-mini' and ps.size = 'M';

  update product_sizes set quantity = 1 where id = v_size_id;
  perform set_config('test.size_id', v_size_id::text, false);
end $$;

-- ---------------------------------------------------------------------------
-- 1. Inventory is not touched before payment
-- ---------------------------------------------------------------------------
do $$
declare
  v_size_id uuid := current_setting('test.size_id')::uuid;
  v_order_a uuid;
  v_order_b uuid;
  v_result jsonb;
  v_qty integer;
begin
  -- Two customers both reach checkout for the same last unit.
  insert into orders (order_number, user_id, status, total_minor, cancellation_deadline)
  values (next_order_number(), '11111111-1111-1111-1111-111111111111', 'pending_payment', 36500000, now() + interval '12 hours')
  returning id into v_order_a;

  insert into orders (order_number, user_id, status, total_minor, cancellation_deadline)
  values (next_order_number(), '22222222-2222-2222-2222-222222222222', 'pending_payment', 36500000, now() + interval '12 hours')
  returning id into v_order_b;

  insert into order_items (order_id, product_size_id, product_name, unit_price_minor, quantity, line_total_minor)
  values
    (v_order_a, v_size_id, 'Sculpted Rose Mini', 36500000, 1, 36500000),
    (v_order_b, v_size_id, 'Sculpted Rose Mini', 36500000, 1, 36500000);

  select quantity into v_qty from product_sizes where id = v_size_id;
  perform assert(v_qty = 1, 'stock untouched while both orders sit in checkout');

  -- Customer A's payment is verified first.
  v_result := decrement_inventory(v_order_a);
  perform assert((v_result ->> 'committed')::boolean, 'first verified payment commits stock');

  select quantity into v_qty from product_sizes where id = v_size_id;
  perform assert(v_qty = 0, 'stock decremented to zero after first commit');

  -- Customer B's payment then arrives for a unit that no longer exists.
  v_result := decrement_inventory(v_order_b);
  perform assert(not (v_result ->> 'committed')::boolean, 'second order cannot commit oversold stock');
  perform assert(v_result ->> 'reason' = 'insufficient_stock', 'shortfall reported as insufficient_stock');
  perform assert(jsonb_array_length(v_result -> 'shortfalls') = 1, 'shortfall detail returned for customer care');

  select quantity into v_qty from product_sizes where id = v_size_id;
  perform assert(v_qty = 0, 'failed commit left stock non-negative');

  -- 2. Webhook replay must be idempotent.
  v_result := decrement_inventory(v_order_a);
  perform assert((v_result ->> 'committed')::boolean, 'replayed webhook still reports committed');
  perform assert(v_result ->> 'reason' = 'already_committed', 'replay short-circuits as already_committed');

  select quantity into v_qty from product_sizes where id = v_size_id;
  perform assert(v_qty = 0, 'replayed webhook did not double-decrement');

  -- 3. Cancelling a committed order restores stock.
  perform restore_inventory(v_order_a);
  select quantity into v_qty from product_sizes where id = v_size_id;
  perform assert(v_qty = 1, 'cancellation restored the unit to stock');

  perform set_config('test.order_a', v_order_a::text, false);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Review eligibility
-- ---------------------------------------------------------------------------
do $$
declare
  v_order uuid;
  v_item uuid;
  v_product uuid;
begin
  select id into v_product from products where slug = 'bow-pleated-gown';

  insert into orders (order_number, user_id, status, total_minor)
  values (next_order_number(), '11111111-1111-1111-1111-111111111111', 'confirmed', 54000000)
  returning id into v_order;

  insert into order_items (order_id, product_id, product_name, unit_price_minor, quantity, line_total_minor)
  values (v_order, v_product, 'Bow Pleated Gown', 54000000, 1, 54000000)
  returning id into v_item;

  perform assert(
    not can_review_order_item(v_item, '11111111-1111-1111-1111-111111111111'),
    'no review before payment is recorded');

  insert into payments (order_id, provider, provider_reference, status, amount_minor)
  values (v_order, 'paystack', 'ref_test_review', 'successful', 54000000);

  perform assert(
    not can_review_order_item(v_item, '11111111-1111-1111-1111-111111111111'),
    'paid but undelivered order is still not reviewable');

  update orders set status = 'delivered', delivered_at = now() where id = v_order;

  perform assert(
    can_review_order_item(v_item, '11111111-1111-1111-1111-111111111111'),
    'paid and delivered order is reviewable by the buyer');

  perform assert(
    not can_review_order_item(v_item, '22222222-2222-2222-2222-222222222222'),
    'a different customer cannot review someone else''s purchase');

  insert into reviews (product_id, user_id, order_item_id, rating, body)
  values (v_product, '11111111-1111-1111-1111-111111111111', v_item, 5, 'Exceptional.');

  perform assert(
    not can_review_order_item(v_item, '11111111-1111-1111-1111-111111111111'),
    'one review per qualifying purchase line');

  -- A pending review must not surface in public rating figures.
  perform assert(
    (select total from product_rating(v_product)) = 0,
    'pending review excluded from the public rating');

  update reviews set status = 'published', published_at = now() where order_item_id = v_item;

  perform assert(
    (select total from product_rating(v_product)) = 1,
    'published review counts toward the public rating');
end $$;

-- ---------------------------------------------------------------------------
-- 5. Cancellation window
-- ---------------------------------------------------------------------------
do $$
declare
  v_order uuid := current_setting('test.order_a')::uuid;
begin
  update orders set status = 'confirmed', confirmed_at = now() where id = v_order;
  perform assert(can_cancel_order(v_order), 'order cancellable inside the 12-hour window');

  update orders set confirmed_at = now() - interval '13 hours' where id = v_order;
  perform assert(not can_cancel_order(v_order), 'order not cancellable after the window expires');

  -- The window is admin-configurable and must take effect immediately.
  update site_settings set value = '48'::jsonb where key = 'cancellation_window_hours';
  perform assert(can_cancel_order(v_order), 'widening the window in settings takes effect at once');
  update site_settings set value = '12'::jsonb where key = 'cancellation_window_hours';

  update orders set status = 'shipped' where id = v_order;
  perform assert(not can_cancel_order(v_order), 'shipped order can no longer be cancelled');
end $$;

-- ---------------------------------------------------------------------------
-- 6. Admin authorization
-- ---------------------------------------------------------------------------
do $$
begin
  perform assert(is_active_admin('33333333-3333-3333-3333-333333333333'), 'seeded owner is an admin');
  perform assert(is_owner('33333333-3333-3333-3333-333333333333'), 'seeded owner holds the owner role');
  perform assert(not is_active_admin('11111111-1111-1111-1111-111111111111'), 'a customer is not an admin');
  perform assert(not is_owner('11111111-1111-1111-1111-111111111111'), 'a customer is not the owner');

  update admin_users set is_active = false where email = 'owner@miyenka.com';
  perform assert(not is_active_admin('33333333-3333-3333-3333-333333333333'), 'deactivated admin loses access');
  update admin_users set is_active = true where email = 'owner@miyenka.com';
end $$;

\echo ''
\echo 'All business rule assertions passed.'
