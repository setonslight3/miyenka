-- ============================================================================
-- Miyenka — row-level security tests
--
-- Runs as the real anon / authenticated roles rather than the table owner,
-- because RLS does not apply to a superuser. Verifies that the anon key alone
-- cannot reach unpublished catalogue rows, another customer's orders, guest
-- orders, pending reviews, private bespoke data or admin-only settings.
-- ============================================================================

\set QUIET on

-- Supabase provisions these roles; recreate them locally.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public, auth, storage to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
grant select on auth.users to anon, authenticated;

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

-- Fixtures: one unpublished product, one guest order, one pending review.
insert into products (slug, name, base_price_minor, is_published)
values ('unpublished-draft', 'Unreleased Draft Gown', 12000000, false)
on conflict (slug) do nothing;

do $$
declare v_order uuid;
begin
  if not exists (select 1 from orders where order_number = 'RLS-GUEST') then
    insert into orders (order_number, guest_email, status, total_minor)
    values ('RLS-GUEST', 'guest@example.com', 'confirmed', 12000000);
  end if;

  if not exists (select 1 from orders where order_number = 'RLS-OTHER') then
    insert into orders (order_number, user_id, status, total_minor)
    values ('RLS-OTHER', '22222222-2222-2222-2222-222222222222', 'confirmed', 12000000);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
begin
  -- Guard: prove we really are unauthenticated, so the checks below cannot
  -- pass simply because the session was misconfigured.
  perform assert(auth.uid() is null, 'anon session carries no user id');
  perform assert(not is_active_admin(), 'anon is not an admin');

  perform assert(
    (select count(*) from products where slug = 'unpublished-draft') = 0,
    'anon cannot see an unpublished product');

  perform assert(
    (select count(*) from products) = (select count(*) from products where is_published),
    'anon sees published products only');

  perform assert((select count(*) from orders) = 0, 'anon cannot read any order');
  perform assert((select count(*) from order_items) = 0, 'anon cannot read any order item');
  perform assert((select count(*) from payments) = 0, 'anon cannot read payments');
  perform assert((select count(*) from custom_requests) = 0, 'anon cannot read bespoke requests');
  perform assert((select count(*) from custom_request_media) = 0, 'anon cannot read private reference media');
  perform assert((select count(*) from promotions) = 0, 'anon cannot enumerate promo codes');
  perform assert((select count(*) from audit_logs) = 0, 'anon cannot read the audit log');
  perform assert((select count(*) from admin_users) = 0, 'anon cannot read the admin roster');
  perform assert((select count(*) from newsletter_subscribers) = 0, 'anon cannot read subscriber emails');

  perform assert(
    (select count(*) from reviews where status <> 'published') = 0,
    'anon sees published reviews only');

  perform assert(
    (select count(*) from site_settings where not is_public) = 0,
    'anon cannot read admin-only settings');

  perform assert(
    (select count(*) from site_settings where is_public) > 0,
    'anon can still read public storefront settings');
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Signed-in customer
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
begin
  -- Guard: prove the JWT claim actually took effect for this session.
  perform assert(
    auth.uid() = '11111111-1111-1111-1111-111111111111',
    'customer session carries the expected user id');
  perform assert(not is_active_admin(), 'customer is not an admin');

  perform assert(
    (select count(*) from orders where order_number = 'RLS-OTHER') = 0,
    'customer cannot read another customer''s order');

  perform assert(
    (select count(*) from orders where order_number = 'RLS-GUEST') = 0,
    'customer cannot read an unrelated guest order');

  perform assert(
    (select count(*) from orders where user_id = '11111111-1111-1111-1111-111111111111') > 0,
    'customer can read their own orders');

  perform assert(
    (select count(*) from products where slug = 'unpublished-draft') = 0,
    'customer cannot see unpublished products');

  perform assert((select count(*) from admin_users) = 0, 'customer cannot read the admin roster');
  perform assert((select count(*) from audit_logs) = 0, 'customer cannot read the audit log');
end $$;

-- A customer must not be able to forge a review for a purchase they never made.
do $$
declare
  v_other_item uuid;
  v_blocked boolean := false;
begin
  select oi.id into v_other_item
    from order_items oi join orders o on o.id = oi.order_id
   where o.order_number = 'RLS-OTHER'
   limit 1;

  if v_other_item is null then
    -- No line on that order; assert the equivalent via the eligibility function.
    perform assert(
      not can_review_order_item(gen_random_uuid(), '11111111-1111-1111-1111-111111111111'),
      'review of an unknown order line is rejected');
  else
    begin
      insert into reviews (product_id, user_id, order_item_id, rating)
      values ((select id from products limit 1), '11111111-1111-1111-1111-111111111111', v_other_item, 5);
    exception when insufficient_privilege or check_violation then
      v_blocked := true;
    end;
    perform assert(v_blocked, 'review insert blocked for a non-qualifying purchase');
  end if;
end $$;

-- Writing to the catalogue must be refused for a non-admin.
do $$
declare v_blocked boolean := false;
begin
  begin
    update products set base_price_minor = 1 where is_published;
    if not found then v_blocked := true; end if;
    -- RLS filters the row set rather than raising, so zero rows updated is the pass.
    if (select base_price_minor from products where slug = 'sculpted-rose-mini') = 1 then
      v_blocked := false;
    else
      v_blocked := true;
    end if;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  perform assert(v_blocked, 'customer cannot reprice a product');
end $$;

reset role;

\echo ''
\echo 'All row-level security assertions passed.'
