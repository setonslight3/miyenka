-- ============================================================================
-- Miyenka — server-side business logic
-- These functions hold the rules that must never be enforceable from the
-- client alone: authorization, stock, review eligibility, pricing.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Admin authorization
-- ---------------------------------------------------------------------------

-- security definer so it can read admin_users regardless of the caller's RLS.
create or replace function is_active_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users a
    where a.is_active
      and (
        a.user_id = check_user_id
        or a.email = (select u.email from auth.users u where u.id = check_user_id)
      )
  );
$$;

create or replace function is_owner(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users a
    where a.is_active
      and a.role = 'owner'
      and (
        a.user_id = check_user_id
        or a.email = (select u.email from auth.users u where u.id = check_user_id)
      )
  );
$$;

-- Mirrors a new auth user into profiles, and claims any admin invitation that
-- was created for their email before they first signed in.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  update admin_users
     set user_id = new.id
   where email = new.email
     and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Order numbering
-- ---------------------------------------------------------------------------
create or replace function next_order_number()
returns text
language sql
volatile
as $$
  select 'MY-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('order_number_seq')::text, 5, '0');
$$;

create or replace function next_quote_number()
returns text
language sql
volatile
as $$
  select 'MQ-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('order_number_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------------
-- Settings helper
-- ---------------------------------------------------------------------------
create or replace function get_setting(setting_key text, fallback jsonb default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from site_settings where key = setting_key), fallback);
$$;

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------

-- Informational availability read for the storefront. The database remains
-- authoritative; this number may be stale by the time checkout completes.
create or replace function available_quantity(p_product_size_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case when ps.is_active then ps.quantity else 0 end
    from product_sizes ps
    where ps.id = p_product_size_id
  ), 0);
$$;

/*
  Atomically commits stock for an order.

  Called only from a verified payment webhook, inside the payment transaction.
  Rows are locked in a deterministic order (by id) so two concurrent last-item
  purchases cannot deadlock, and the whole call fails as a unit if any line is
  short — the caller then records an operational exception for customer care
  rather than completing a purchase that cannot be fulfilled.

  Returns jsonb: { committed: bool, reason: text, shortfalls: [...] }
*/
create or replace function decrement_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_committed boolean;
  v_shortfalls jsonb := '[]'::jsonb;
  v_item record;
  v_updated integer;
begin
  -- Lock the order row first; a replayed webhook waits here and then sees
  -- inventory_committed = true.
  select inventory_committed into v_already_committed
    from orders
   where id = p_order_id
     for update;

  if not found then
    return jsonb_build_object('committed', false, 'reason', 'order_not_found');
  end if;

  if v_already_committed then
    return jsonb_build_object('committed', true, 'reason', 'already_committed');
  end if;

  -- Pass 1: lock every affected size row in a stable order and collect shortfalls.
  for v_item in
    select oi.product_size_id,
           oi.product_name,
           oi.variant_color,
           oi.size,
           sum(oi.quantity)::integer as needed
      from order_items oi
     where oi.order_id = p_order_id
       and oi.product_size_id is not null
       and oi.is_bespoke = false
     group by oi.product_size_id, oi.product_name, oi.variant_color, oi.size
     order by oi.product_size_id
  loop
    perform 1 from product_sizes where id = v_item.product_size_id for update;

    if (select quantity from product_sizes where id = v_item.product_size_id) < v_item.needed then
      v_shortfalls := v_shortfalls || jsonb_build_object(
        'product_size_id', v_item.product_size_id,
        'product_name', v_item.product_name,
        'variant_color', v_item.variant_color,
        'size', v_item.size,
        'requested', v_item.needed,
        'available', (select quantity from product_sizes where id = v_item.product_size_id)
      );
    end if;
  end loop;

  if jsonb_array_length(v_shortfalls) > 0 then
    return jsonb_build_object(
      'committed', false,
      'reason', 'insufficient_stock',
      'shortfalls', v_shortfalls
    );
  end if;

  -- Pass 2: all lines are satisfiable and locked, so decrement.
  for v_item in
    select oi.product_size_id, sum(oi.quantity)::integer as needed
      from order_items oi
     where oi.order_id = p_order_id
       and oi.product_size_id is not null
       and oi.is_bespoke = false
     group by oi.product_size_id
     order by oi.product_size_id
  loop
    update product_sizes
       set quantity = quantity - v_item.needed
     where id = v_item.product_size_id
       and quantity >= v_item.needed;

    get diagnostics v_updated = row_count;

    -- Defensive: the locks above make this unreachable, but a failed guard
    -- must abort rather than silently under-decrement.
    if v_updated = 0 then
      raise exception 'inventory_race_detected for product_size %', v_item.product_size_id;
    end if;
  end loop;

  update orders
     set inventory_committed = true
   where id = p_order_id;

  return jsonb_build_object('committed', true, 'reason', 'committed');
end;
$$;

-- Restores stock when a committed order is cancelled.
create or replace function restore_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_committed boolean;
  v_item record;
begin
  select inventory_committed into v_committed
    from orders where id = p_order_id for update;

  if not found then
    return jsonb_build_object('restored', false, 'reason', 'order_not_found');
  end if;

  if not v_committed then
    return jsonb_build_object('restored', false, 'reason', 'nothing_committed');
  end if;

  for v_item in
    select product_size_id, sum(quantity)::integer as qty
      from order_items
     where order_id = p_order_id
       and product_size_id is not null
       and is_bespoke = false
     group by product_size_id
     order by product_size_id
  loop
    update product_sizes
       set quantity = quantity + v_item.qty
     where id = v_item.product_size_id;
  end loop;

  update orders set inventory_committed = false where id = p_order_id;

  return jsonb_build_object('restored', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Review eligibility
-- ---------------------------------------------------------------------------

/*
  A customer may review a product only when all of the following hold:
    - they are signed in and own the order,
    - the order's payment succeeded,
    - the order has been delivered,
    - the reviewed product is actually on that order line,
    - that line has not already been reviewed.

  Enforced here and again by the reviews INSERT policy, so the rule cannot be
  bypassed by calling the API directly.
*/
create or replace function can_review_order_item(p_order_item_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from order_items oi
      join orders o on o.id = oi.order_id
     where oi.id = p_order_item_id
       and o.user_id = p_user_id
       and o.status = 'delivered'
       and exists (
         select 1 from payments p
          where p.order_id = o.id and p.status = 'successful'
       )
       and not exists (
         select 1 from reviews r where r.order_item_id = oi.id
       )
  );
$$;

-- Everything the account page needs to render "leave a review" prompts.
create or replace function reviewable_items(p_user_id uuid default auth.uid())
returns table (
  order_item_id uuid,
  order_id uuid,
  order_number text,
  product_id uuid,
  product_name text,
  product_slug text,
  image_url text,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select oi.id, o.id, o.order_number, oi.product_id, oi.product_name,
         oi.product_slug, oi.image_url, o.delivered_at
    from order_items oi
    join orders o on o.id = oi.order_id
   where o.user_id = p_user_id
     and o.status = 'delivered'
     and oi.product_id is not null
     and exists (select 1 from payments p where p.order_id = o.id and p.status = 'successful')
     and not exists (select 1 from reviews r where r.order_item_id = oi.id)
   order by o.delivered_at desc nulls last;
$$;

-- Published-only rating rollup for product cards and PDP.
create or replace function product_rating(p_product_id uuid)
returns table (average numeric, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select round(avg(rating)::numeric, 2), count(*)
    from reviews
   where product_id = p_product_id and status = 'published';
$$;

-- ---------------------------------------------------------------------------
-- Cancellation window
-- ---------------------------------------------------------------------------

/*
  Cancellation is allowed only inside the admin-configured window and only
  before fulfilment starts. The window is read from site_settings at call time,
  so changing it in the dashboard takes effect immediately.
*/
create or replace function can_cancel_order(p_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order orders;
  v_hours numeric;
begin
  select * into v_order from orders where id = p_order_id;
  if not found then
    return false;
  end if;

  if v_order.status not in ('pending_payment', 'confirmed') then
    return false;
  end if;

  if v_order.cancelled_at is not null then
    return false;
  end if;

  v_hours := coalesce((get_setting('cancellation_window_hours', '12'::jsonb))::numeric, 12);

  return now() <= coalesce(v_order.confirmed_at, v_order.created_at) + (v_hours || ' hours')::interval;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shipping & FX
-- ---------------------------------------------------------------------------
create or replace function resolve_shipping_zone(p_country text, p_state text default null)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from shipping_zones
   where is_active
     and (
       -- Most specific first: a state match inside a matching country.
       (p_state is not null and upper(p_country) = any (select upper(unnest(country_codes)))
        and upper(p_state) = any (select upper(unnest(states))))
       or (states = '{}' and upper(p_country) = any (select upper(unnest(country_codes))))
       or (is_international and country_codes = '{}')
     )
   order by
     case when p_state is not null and upper(p_state) = any (select upper(unnest(states))) then 0
          when upper(p_country) = any (select upper(unnest(country_codes))) then 1
          else 2 end,
     position
   limit 1;
$$;

create or replace function active_fx_rate(p_quote_currency char(3), p_base char(3) default 'NGN')
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when upper(p_quote_currency) = upper(p_base) then 1::numeric
    else (
      select rate * (1 + markup_percent / 100)
        from exchange_rates
       where is_active
         and upper(base_currency) = upper(p_base)
         and upper(quote_currency) = upper(p_quote_currency)
       order by fetched_at desc
       limit 1
    )
  end;
$$;
