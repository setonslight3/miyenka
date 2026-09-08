-- ============================================================================
-- Miyenka — core schema
-- Money is stored in minor units (kobo/cents) as bigint to avoid float drift.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------------
-- Enumerated domains
-- ---------------------------------------------------------------------------
create type order_status as enum (
  'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
);

create type payment_status as enum (
  'pending', 'successful', 'failed', 'abandoned', 'refunded'
);

create type payment_provider as enum ('paystack', 'flutterwave');

create type order_type as enum ('ready_to_wear', 'bespoke');

create type custom_request_status as enum (
  'awaiting_quote', 'quote_sent', 'awaiting_payment', 'paid_in_production',
  'shipped', 'delivered', 'declined', 'cancelled'
);

create type review_status as enum ('pending', 'published', 'rejected');

create type admin_role as enum ('owner', 'admin');

create type size_code as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL');

create type dress_category as enum ('mini', 'midi', 'maxi', 'statement_gown');

create type promotion_type as enum ('percentage', 'fixed_amount', 'free_shipping');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null,
  full_name text,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  email citext not null unique,
  role admin_role not null default 'admin',
  is_active boolean not null default true,
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table admin_users is
  'Admin membership is granted by email so an owner can invite someone before they first sign in; user_id is linked on their first authenticated visit.';

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  hero_image_url text,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  code dress_category not null,
  description text,
  position integer not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text,
  story text,
  care_instructions text,
  fabric text,
  category_id uuid references categories (id) on delete restrict,
  collection_id uuid references collections (id) on delete set null,
  base_price_minor bigint not null check (base_price_minor >= 0),
  compare_at_price_minor bigint check (compare_at_price_minor >= 0),
  currency char(3) not null default 'NGN',
  supports_bespoke boolean not null default true,
  supports_ready_to_wear boolean not null default true,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  position integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_published_idx on products (is_published, published_at desc);
create index products_category_idx on products (category_id);
create index products_collection_idx on products (collection_id);

-- A variant is a colourway. Each may carry its own photography.
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  color_name text not null,
  color_hex text,
  sku_prefix text,
  price_override_minor bigint check (price_override_minor >= 0),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, color_name)
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on product_images (product_id, position);

-- Stock lives on the size row: one row per variant + size.
create table product_sizes (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants (id) on delete cascade,
  size size_code not null,
  sku text unique,
  quantity integer not null default 0 check (quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, size)
);

comment on column product_sizes.quantity is
  'Authoritative stock. Only ever decremented inside decrement_inventory() after a verified payment.';

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------------
create table shipping_zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  country_codes text[] not null default '{}',
  states text[] not null default '{}',
  is_international boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0
);

create table shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references shipping_zones (id) on delete cascade,
  name text not null,
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null default 'NGN',
  min_delivery_days integer,
  max_delivery_days integer,
  free_over_minor bigint check (free_over_minor >= 0),
  is_active boolean not null default true,
  position integer not null default 0
);

comment on table shipping_rates is
  'Placeholder rates, fully editable from the admin dashboard. A logistics API can later replace resolve_shipping_rate() without touching checkout.';

-- ---------------------------------------------------------------------------
-- Currency
-- ---------------------------------------------------------------------------
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency char(3) not null default 'NGN',
  quote_currency char(3) not null,
  rate numeric(18, 8) not null check (rate > 0),
  markup_percent numeric(6, 3) not null default 0,
  source text not null default 'manual',
  fetched_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index exchange_rates_lookup_idx
  on exchange_rates (base_currency, quote_currency, is_active, fetched_at desc);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence order_number_seq start 1000;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  guest_email citext,
  contact_phone text,
  status order_status not null default 'pending_payment',
  order_type order_type not null default 'ready_to_wear',

  -- Every monetary figure is computed server-side and frozen here.
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  currency char(3) not null default 'NGN',

  -- Presentation currency snapshot, so a historical order never re-converts.
  display_currency char(3) not null default 'NGN',
  fx_rate numeric(18, 8) not null default 1,
  fx_captured_at timestamptz,

  shipping_zone_id uuid references shipping_zones (id) on delete set null,
  shipping_rate_id uuid references shipping_rates (id) on delete set null,
  shipping_address jsonb,
  billing_address jsonb,

  promotion_id uuid,
  promo_code text,

  customer_note text,
  admin_note text,
  tracking_number text,
  tracking_url text,
  carrier text,

  inventory_committed boolean not null default false,
  cancellation_deadline timestamptz,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_contactable check (user_id is not null or guest_email is not null)
);

create index orders_user_idx on orders (user_id, created_at desc);
create index orders_email_idx on orders (guest_email);
create index orders_status_idx on orders (status, created_at desc);

comment on column orders.inventory_committed is
  'Set true inside the same transaction that decrements stock, so a replayed webhook cannot double-decrement.';

-- Order items snapshot the catalogue so historical orders never change when
-- a product is renamed, repriced or deleted.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  product_size_id uuid references product_sizes (id) on delete set null,

  product_name text not null,
  product_slug text,
  variant_color text,
  size size_code,
  image_url text,
  sku text,

  unit_price_minor bigint not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  currency char(3) not null default 'NGN',
  is_bespoke boolean not null default false,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders (id) on delete set null,
  custom_quote_id uuid,
  provider payment_provider not null,
  provider_reference text not null,
  provider_transaction_id text,
  status payment_status not null default 'pending',
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'NGN',
  authorization_url text,
  channel text,
  paid_at timestamptz,
  verified_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index payments_order_idx on payments (order_id);

-- Append-only webhook log. The unique constraint is what makes replayed
-- provider deliveries idempotent.
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments (id) on delete set null,
  provider payment_provider not null,
  event_type text not null,
  event_signature text,
  provider_reference text,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique (provider, event_signature)
);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_item_id uuid not null references order_items (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status review_status not null default 'pending',
  admin_response text,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- One review per qualifying purchase line.
  unique (order_item_id)
);

create index reviews_product_public_idx on reviews (product_id, status, created_at desc);

create table review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews (id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bespoke
-- ---------------------------------------------------------------------------
create table custom_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid references products (id) on delete set null,
  contact_email citext not null,
  contact_name text,
  contact_phone text,

  -- Measurements in centimetres; the UI accepts inches and converts.
  bust_cm numeric(6, 2),
  waist_cm numeric(6, 2),
  hips_cm numeric(6, 2),
  shoulder_to_hem_cm numeric(6, 2),
  height_cm numeric(6, 2),

  preferred_fabric text,
  preferred_color text,
  modification_notes text,
  event_date date,
  status custom_request_status not null default 'awaiting_quote',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_requests_status_idx on custom_requests (status, created_at desc);

-- Private customer reference photos. Never publicly readable.
create table custom_request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references custom_requests (id) on delete cascade,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table custom_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references custom_requests (id) on delete cascade,
  quote_number text not null unique,
  access_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'NGN',
  shipping_minor bigint not null default 0 check (shipping_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  summary text,
  production_days integer,
  status text not null default 'sent'
    check (status in ('draft', 'sent', 'paid', 'expired', 'cancelled')),
  expires_at timestamptz,
  paid_at timestamptz,
  order_id uuid references orders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column custom_quotes.access_token is
  'Unguessable token for the secure quote page, so a customer can pay without an account while the quote stays private.';

alter table payments
  add constraint payments_custom_quote_fk
  foreign key (custom_quote_id) references custom_quotes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Promotions
-- ---------------------------------------------------------------------------
create table promotions (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  description text,
  type promotion_type not null,
  value numeric(12, 2) not null default 0,
  min_order_minor bigint not null default 0 check (min_order_minor >= 0),
  max_discount_minor bigint check (max_discount_minor >= 0),
  usage_limit integer,
  usage_count integer not null default 0,
  per_customer_limit integer default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table orders
  add constraint orders_promotion_fk
  foreign key (promotion_id) references promotions (id) on delete set null;

create table promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email citext,
  discount_minor bigint not null check (discount_minor >= 0),
  created_at timestamptz not null default now(),
  unique (promotion_id, order_id)
);

-- ---------------------------------------------------------------------------
-- Settings & content
-- ---------------------------------------------------------------------------
create table site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  -- Only rows explicitly marked public are readable with the anon key.
  -- Operational values (FX markup, provider tuning) stay admin-only.
  is_public boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table site_settings is
  'Every mutable business value lives here — cancellation window, FX markup, free-shipping threshold, homepage merchandising — so nothing is hard-coded in the app.';

create table whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone_e164 text not null,
  greeting text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  source text,
  is_subscribed boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table email_events (
  id uuid primary key default gen_random_uuid(),
  recipient citext not null,
  template text not null,
  subject text,
  order_id uuid references orders (id) on delete set null,
  provider_message_id text,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email citext,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger products_touch before update on products
  for each row execute function touch_updated_at();
create trigger product_sizes_touch before update on product_sizes
  for each row execute function touch_updated_at();
create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();
create trigger payments_touch before update on payments
  for each row execute function touch_updated_at();
create trigger custom_requests_touch before update on custom_requests
  for each row execute function touch_updated_at();
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
-- ============================================================================
-- Miyenka — row-level security
-- Default posture: deny. Public read is granted only to published catalogue
-- content; everything customer-owned is scoped to the owning user; everything
-- operational is admin-only and checked server-side via is_active_admin().
-- ============================================================================

alter table profiles                enable row level security;
alter table admin_users             enable row level security;
alter table collections             enable row level security;
alter table categories              enable row level security;
alter table products                enable row level security;
alter table product_variants        enable row level security;
alter table product_images          enable row level security;
alter table product_sizes           enable row level security;
alter table wishlists               enable row level security;
alter table shipping_zones          enable row level security;
alter table shipping_rates          enable row level security;
alter table exchange_rates          enable row level security;
alter table orders                  enable row level security;
alter table order_items             enable row level security;
alter table order_status_history    enable row level security;
alter table payments                enable row level security;
alter table payment_events          enable row level security;
alter table reviews                 enable row level security;
alter table review_media            enable row level security;
alter table custom_requests         enable row level security;
alter table custom_request_media    enable row level security;
alter table custom_quotes           enable row level security;
alter table promotions              enable row level security;
alter table promotion_redemptions   enable row level security;
alter table site_settings           enable row level security;
alter table whatsapp_contacts       enable row level security;
alter table newsletter_subscribers  enable row level security;
alter table email_events            enable row level security;
alter table audit_logs              enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy "own profile readable" on profiles
  for select using (auth.uid() = id or is_active_admin());

create policy "own profile updatable" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Admin roster: readable by admins, mutable only by the owner.
-- ---------------------------------------------------------------------------
create policy "admins read roster" on admin_users
  for select using (is_active_admin());

create policy "owner manages roster" on admin_users
  for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- Catalogue: anonymous read of published rows only.
-- ---------------------------------------------------------------------------
create policy "published collections public" on collections
  for select using (is_published or is_active_admin());
create policy "admins manage collections" on collections
  for all using (is_active_admin()) with check (is_active_admin());

create policy "categories public" on categories
  for select using (true);
create policy "admins manage categories" on categories
  for all using (is_active_admin()) with check (is_active_admin());

create policy "published products public" on products
  for select using (is_published or is_active_admin());
create policy "admins manage products" on products
  for all using (is_active_admin()) with check (is_active_admin());

create policy "variants of published products public" on product_variants
  for select using (
    is_active_admin()
    or (is_active and exists (
      select 1 from products p where p.id = product_id and p.is_published
    ))
  );
create policy "admins manage variants" on product_variants
  for all using (is_active_admin()) with check (is_active_admin());

create policy "images of published products public" on product_images
  for select using (
    is_active_admin()
    or exists (select 1 from products p where p.id = product_id and p.is_published)
  );
create policy "admins manage images" on product_images
  for all using (is_active_admin()) with check (is_active_admin());

-- Sizes are readable so the storefront can show availability. The number is
-- informational; decrement_inventory() is what actually governs stock.
create policy "sizes of published products public" on product_sizes
  for select using (
    is_active_admin()
    or exists (
      select 1 from product_variants v
      join products p on p.id = v.product_id
      where v.id = variant_id and p.is_published and v.is_active
    )
  );
create policy "admins manage sizes" on product_sizes
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- Wishlist
-- ---------------------------------------------------------------------------
create policy "own wishlist" on wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Shipping & FX: public read of active rows, admin write.
-- ---------------------------------------------------------------------------
create policy "active zones public" on shipping_zones
  for select using (is_active or is_active_admin());
create policy "admins manage zones" on shipping_zones
  for all using (is_active_admin()) with check (is_active_admin());

create policy "active rates public" on shipping_rates
  for select using (is_active or is_active_admin());
create policy "admins manage rates" on shipping_rates
  for all using (is_active_admin()) with check (is_active_admin());

create policy "active fx public" on exchange_rates
  for select using (is_active or is_active_admin());
create policy "admins manage fx" on exchange_rates
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- Orders
--
-- Guest orders carry no user_id, so they are deliberately NOT readable through
-- the anon key. Guest order lookup goes through a server route that checks the
-- order number together with the email used at checkout.
-- ---------------------------------------------------------------------------
create policy "own orders readable" on orders
  for select using (
    (user_id is not null and auth.uid() = user_id) or is_active_admin()
  );

create policy "admins manage orders" on orders
  for all using (is_active_admin()) with check (is_active_admin());

create policy "own order items readable" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and ((o.user_id is not null and o.user_id = auth.uid()) or is_active_admin())
    )
  );

create policy "admins manage order items" on order_items
  for all using (is_active_admin()) with check (is_active_admin());

create policy "own order history readable" on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and ((o.user_id is not null and o.user_id = auth.uid()) or is_active_admin())
    )
  );

create policy "admins write order history" on order_status_history
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- Payments: customers see status on their own orders, never the raw payload.
-- Webhook processing uses the service-role client, which bypasses RLS.
-- ---------------------------------------------------------------------------
create policy "own payments readable" on payments
  for select using (
    is_active_admin()
    or exists (
      select 1 from orders o
      where o.id = order_id and o.user_id is not null and o.user_id = auth.uid()
    )
  );

create policy "admins manage payments" on payments
  for all using (is_active_admin()) with check (is_active_admin());

create policy "admins read payment events" on payment_events
  for select using (is_active_admin());

-- ---------------------------------------------------------------------------
-- Reviews
--
-- Public sees published reviews only. Insert is gated by
-- can_review_order_item(), so eligibility holds even if the UI is bypassed.
-- ---------------------------------------------------------------------------
create policy "published reviews public" on reviews
  for select using (
    status = 'published' or auth.uid() = user_id or is_active_admin()
  );

create policy "eligible customers submit reviews" on reviews
  for insert with check (
    auth.uid() = user_id
    and status = 'pending'
    and can_review_order_item(order_item_id, auth.uid())
  );

create policy "admins moderate reviews" on reviews
  for all using (is_active_admin()) with check (is_active_admin());

create policy "media of visible reviews" on review_media
  for select using (
    exists (
      select 1 from reviews r
      where r.id = review_id
        and (r.status = 'published' or r.user_id = auth.uid() or is_active_admin())
    )
  );

create policy "authors attach review media" on review_media
  for insert with check (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create policy "admins manage review media" on review_media
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- Bespoke
--
-- Requests may be submitted by guests through a server route. Signed-in
-- customers can read their own; the secure quote page is served by a server
-- route that matches the access token.
-- ---------------------------------------------------------------------------
create policy "own custom requests readable" on custom_requests
  for select using (
    (user_id is not null and auth.uid() = user_id) or is_active_admin()
  );

create policy "signed-in customers create requests" on custom_requests
  for insert with check (auth.uid() = user_id);

create policy "admins manage custom requests" on custom_requests
  for all using (is_active_admin()) with check (is_active_admin());

-- Private reference photos: only the requesting customer and admins.
create policy "own request media readable" on custom_request_media
  for select using (
    exists (
      select 1 from custom_requests cr
      where cr.id = request_id
        and ((cr.user_id is not null and cr.user_id = auth.uid()) or is_active_admin())
    )
  );

create policy "admins manage request media" on custom_request_media
  for all using (is_active_admin()) with check (is_active_admin());

create policy "own quotes readable" on custom_quotes
  for select using (
    is_active_admin()
    or exists (
      select 1 from custom_requests cr
      where cr.id = request_id and cr.user_id is not null and cr.user_id = auth.uid()
    )
  );

create policy "admins manage quotes" on custom_quotes
  for all using (is_active_admin()) with check (is_active_admin());

-- ---------------------------------------------------------------------------
-- Promotions: codes are validated server-side, never enumerated by the client.
-- ---------------------------------------------------------------------------
create policy "admins manage promotions" on promotions
  for all using (is_active_admin()) with check (is_active_admin());

create policy "admins read redemptions" on promotion_redemptions
  for select using (is_active_admin());

-- ---------------------------------------------------------------------------
-- Settings & content
-- ---------------------------------------------------------------------------
create policy "public settings readable" on site_settings
  for select using (is_public or is_active_admin());
create policy "admins manage settings" on site_settings
  for all using (is_active_admin()) with check (is_active_admin());

create policy "active whatsapp public" on whatsapp_contacts
  for select using (is_active or is_active_admin());
create policy "admins manage whatsapp" on whatsapp_contacts
  for all using (is_active_admin()) with check (is_active_admin());

create policy "anyone may subscribe" on newsletter_subscribers
  for insert with check (true);
create policy "admins read subscribers" on newsletter_subscribers
  for select using (is_active_admin());
create policy "admins manage subscribers" on newsletter_subscribers
  for all using (is_active_admin()) with check (is_active_admin());

create policy "admins read email events" on email_events
  for select using (is_active_admin());

create policy "admins read audit log" on audit_logs
  for select using (is_active_admin());
-- ============================================================================
-- Miyenka — storage buckets and policies
--
-- Two postures:
--   public buckets  — product and editorial media, world-readable, admin-write
--   private bucket  — customer bespoke reference photos, never publicly served
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('brand-media', 'brand-media', true, 209715200,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']),
  ('review-media', 'review-media', true, 8388608,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('custom-references', 'custom-references', false, 15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Public product & brand media
-- ---------------------------------------------------------------------------
create policy "product media publicly readable" on storage.objects
  for select using (bucket_id in ('product-media', 'brand-media'));

create policy "admins write product media" on storage.objects
  for insert with check (
    bucket_id in ('product-media', 'brand-media') and is_active_admin()
  );

create policy "admins update product media" on storage.objects
  for update using (
    bucket_id in ('product-media', 'brand-media') and is_active_admin()
  );

create policy "admins delete product media" on storage.objects
  for delete using (
    bucket_id in ('product-media', 'brand-media') and is_active_admin()
  );

-- ---------------------------------------------------------------------------
-- Review photos: published reviews are public, so their media is too.
-- Customers may only upload beneath their own user-id prefix.
-- ---------------------------------------------------------------------------
create policy "review media publicly readable" on storage.objects
  for select using (bucket_id = 'review-media');

create policy "customers upload own review media" on storage.objects
  for insert with check (
    bucket_id = 'review-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins manage review media objects" on storage.objects
  for delete using (bucket_id = 'review-media' and is_active_admin());

-- ---------------------------------------------------------------------------
-- Bespoke reference photos — private.
--
-- No public select policy exists for this bucket, so the anon key cannot read
-- it at all. Admins read through the service-role client or a signed URL; the
-- customer reads only objects under their own prefix.
-- ---------------------------------------------------------------------------
create policy "customers read own references" on storage.objects
  for select using (
    bucket_id = 'custom-references'
    and (
      is_active_admin()
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "customers upload own references" on storage.objects
  for insert with check (
    bucket_id = 'custom-references'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins delete references" on storage.objects
  for delete using (bucket_id = 'custom-references' and is_active_admin());
-- ============================================================================
-- Miyenka — baseline configuration and launch catalogue
--
-- Shipping rates and the cancellation window are deliberate placeholders:
-- every value here is editable from the admin dashboard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
insert into site_settings (key, value, description, is_public) values
  ('cancellation_window_hours', '12'::jsonb,
   'Hours after order placement during which a customer may self-cancel.', true),
  ('refund_policy', '"no_refunds"'::jsonb,
   'Default policy. Exceptional cases are handled manually via customer care.', true),
  ('supported_display_currencies', '["NGN","USD","GBP"]'::jsonb,
   'Currencies offered in the storefront currency switcher.', true),
  ('base_currency', '"NGN"'::jsonb, 'Currency all prices are stored in.', true),
  ('fx_markup_percent', '0'::jsonb,
   'Optional markup applied on top of the fetched reference rate.', false),
  ('fx_refresh_hours', '6'::jsonb, 'How often the scheduled FX job runs.', false),
  ('free_shipping_threshold_minor', '50000000'::jsonb,
   'Order subtotal (kobo) above which nationwide shipping is free. NGN 500,000.', true),
  ('bespoke_lead_time_days', '{"min": 14, "max": 28}'::jsonb,
   'Quoted production window shown on bespoke pages.', true),
  ('tax_enabled', 'false'::jsonb,
   'No tax at launch. The order schema already carries tax_minor for later.', true),
  ('homepage', jsonb_build_object(
      'hero_headline', 'She is becoming',
      'hero_subline', 'Fashion is your first voice',
      'hero_cta_label', 'Discover the collections',
      'hero_cta_href', '/collections',
      'hero_video', '/media/miyenka-hero.mp4',
      'hero_poster', '/lookbook/gilded-tassel-gown-studio.jpg'
    ),
   'Homepage merchandising copy and hero media.', true),
  ('announcement', jsonb_build_object(
      'enabled', true,
      'message', 'Complimentary nationwide delivery on orders above ₦500,000',
      'href', '/shop'
    ),
   'Slim announcement bar above the header.', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Customer care
-- ---------------------------------------------------------------------------
insert into whatsapp_contacts (label, phone_e164, greeting, is_active, position) values
  ('Customer Care 1', '+2348000000001',
   'Hello Miyenka, I would like some help with', true, 1)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Shipping — placeholder rates, editable in Admin → Shipping
-- ---------------------------------------------------------------------------
insert into shipping_zones (code, name, description, country_codes, states, is_international, position) values
  ('lagos-island', 'Lagos Island', 'Ikoyi, Victoria Island, Lekki and environs',
   array['NG'], array['Lagos Island', 'Ikoyi', 'Victoria Island', 'Lekki', 'Eti-Osa'], false, 1),
  ('lagos-mainland', 'Lagos Mainland', 'Yaba, Ikeja, Surulere and environs',
   array['NG'], array['Lagos Mainland', 'Ikeja', 'Yaba', 'Surulere', 'Alimosho'], false, 2),
  ('nigeria', 'Nationwide Nigeria', 'All other states within Nigeria',
   array['NG'], '{}', false, 3),
  ('international', 'International', 'Worldwide delivery via third-party logistics',
   '{}', '{}', true, 4)
on conflict (code) do nothing;

insert into shipping_rates (zone_id, name, price_minor, min_delivery_days, max_delivery_days, free_over_minor, position)
select z.id, r.name, r.price_minor, r.min_days, r.max_days, r.free_over, r.position
from shipping_zones z
join (values
  ('lagos-island',   'Island Courier',        500000::bigint,  1, 2, 50000000::bigint, 1),
  ('lagos-mainland', 'Mainland Courier',      600000::bigint,  1, 3, 50000000::bigint, 1),
  ('nigeria',        'Nationwide Courier',   1200000::bigint,  2, 5, 50000000::bigint, 1),
  ('international',  'International Express', 9500000::bigint,  5, 12, null::bigint,    1)
) as r(zone_code, name, price_minor, min_days, max_days, free_over, position)
  on r.zone_code = z.code
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- FX seed. Replaced on the first scheduled run of the FX Edge Function.
-- ---------------------------------------------------------------------------
insert into exchange_rates (base_currency, quote_currency, rate, source, is_active) values
  ('NGN', 'USD', 0.00065, 'seed', true),
  ('NGN', 'GBP', 0.00051, 'seed', true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into categories (slug, name, code, description, position) values
  ('mini', 'Mini', 'mini', 'Sculpted, spirited and made to be seen.', 1),
  ('midi', 'Midi', 'midi', 'The considered middle ground — poised and versatile.', 2),
  ('maxi', 'Maxi', 'maxi', 'Length that moves. Fluid lines from shoulder to floor.', 3),
  ('statement-gowns', 'Statement Gowns', 'statement_gown',
   'Our most demanding craftsmanship. Made for the moment everyone remembers.', 4)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
insert into collections (slug, name, tagline, description, hero_image_url, position) values
  ('modern-muse', 'Modern Muse',
   'Structured. Monochromatic. Quietly playful.',
   'Architecture worn on the body. Sharp shoulders, sculpted waists and pleating that holds its shape — pieces for the woman who treats getting dressed as an act of design.',
   '/lookbook/heart-butterfly-coat-salon.png', 1),
  ('classic-sophisticate', 'Classic Sophisticate',
   'Fluid. Timeless. Unmistakably present.',
   'Gowns that move the way silk was always meant to. Hand-finished embellishment, long uninterrupted lines and a restraint that reads as confidence.',
   '/lookbook/gilded-tassel-gown-studio.jpg', 2),
  ('new-arrivals', 'New Arrivals',
   'The most recent additions to the atelier.',
   'Fresh from the workroom.',
   '/lookbook/butterfly-corset-mini-conservatory.jpg', 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Launch catalogue
--
-- Prices are in kobo. Every product below maps to supplied Miyenka
-- photography in /public/lookbook.
-- ---------------------------------------------------------------------------
with cat as (select slug, id from categories),
     col as (select slug, id from collections)
insert into products (
  slug, name, subtitle, description, story, fabric, care_instructions,
  category_id, collection_id, base_price_minor, supports_bespoke,
  is_published, is_featured, position, published_at
) values
  (
    'dream-dress-heart-butterfly-coat',
    'The Dream Dress',
    'Heart-front butterfly coat dress',
    'A tailored coat dress in ivory wool crepe, fastened by a single long zip and centred on a hand-cut scarlet heart. Three-dimensional butterflies climb the skirt and cuffs.',
    'The piece the atelier is known for. The heart sits deliberately high on the chest — worn where it is meant to be worn.',
    'Ivory wool crepe with appliquéd organza butterflies',
    'Dry clean only. Store on a padded hanger away from direct light.',
    (select id from cat where slug = 'mini'),
    (select id from col where slug = 'modern-muse'),
    48500000, true, true, true, 1, now()
  ),
  (
    'gilded-plume-gown',
    'Gilded Plume Gown',
    'Strapless corseted gown with gold plumage',
    'A strapless corseted bodice in ivory silk-blend, hand-beaded along the neckline, opening into a full sweeping skirt scattered with gold feather appliqué.',
    'Photographed in Lagos daylight. The plumes are placed by hand, so no two gowns fall identically.',
    'Ivory silk blend, beaded trim, feather appliqué',
    'Professional dry clean only. Do not brush the feather detail.',
    (select id from cat where slug = 'statement-gowns'),
    (select id from col where slug = 'classic-sophisticate'),
    92000000, true, true, true, 2, now()
  ),
  (
    'gilded-tassel-gown',
    'Gilded Tassel Gown',
    'Strapless gown with gold tassel embroidery',
    'A ruched strapless bodice flowing into a floor-sweeping skirt, embroidered with cascading gold tassels that gather weight toward the hem.',
    'The studio counterpart to the Gilded Plume — same architecture, different hand.',
    'Ivory crepe with metallic thread embroidery',
    'Professional dry clean only.',
    (select id from cat where slug = 'statement-gowns'),
    (select id from col where slug = 'classic-sophisticate'),
    98500000, true, true, true, 3, now()
  ),
  (
    'sculpted-rose-mini',
    'Sculpted Rose Mini',
    'Asymmetric collar mini with rose closures',
    'A sleeveless mini in structured black crepe with an asymmetric folded collar, closed by two sculpted silver roses, flaring into a sharp circular skirt.',
    'Cut to hold its own shape without a single stitch of boning.',
    'Structured black crepe, cast metal closures',
    'Dry clean only.',
    (select id from cat where slug = 'mini'),
    (select id from col where slug = 'modern-muse'),
    36500000, true, true, true, 4, now()
  ),
  (
    'bow-pleated-gown',
    'Bow Pleated Gown',
    'Strapless pleated gown with sash bow',
    'A clean strapless bodice meeting a knife-pleated skirt at an asymmetric sash, finished with a single architectural bow at the hip.',
    'Drawn first as a sketch in red, then cut in champagne, crimson and sand.',
    'Pleated crepe',
    'Dry clean only. Hang to preserve the pleat.',
    (select id from cat where slug = 'maxi'),
    (select id from col where slug = 'modern-muse'),
    54000000, true, true, true, 5, now()
  ),
  (
    'butterfly-corset-mini',
    'Butterfly Corset Mini',
    'Laced corset mini with butterfly appliqué',
    'A laced ivory corset bodice with off-shoulder ribbon straps, tiered into a double pleated skirt strewn with organza butterflies.',
    'Photographed under glass in the conservatory. Fashion is your first voice.',
    'Ivory cotton-blend corsetry, organza butterflies, satin ribbon',
    'Spot clean or dry clean. Iron ribbons on low heat.',
    (select id from cat where slug = 'mini'),
    (select id from col where slug = 'modern-muse'),
    41500000, true, true, false, 6, now()
  ),
  (
    'pleated-corset-mini',
    'Pleated Corset Mini',
    'Studded corset mini with tiered pleating',
    'A boned corset bodice in matte black, edged with polished studs, dropping into two sharp tiers of knife pleating.',
    'Shown with a cropped ivory blazer — the contrast is the point.',
    'Matte black corsetry with pleated skirt',
    'Dry clean only.',
    (select id from cat where slug = 'mini'),
    (select id from col where slug = 'modern-muse'),
    44000000, true, true, false, 7, now()
  ),
  (
    'bow-sleeve-midi',
    'Bow Sleeve Midi',
    'Bow-trimmed bell sleeve midi',
    'A cream midi with an open collar and deep V, its wide bell sleeves trimmed with a descending row of hand-tied bows.',
    'Every bow is tied and tacked by hand in the workroom.',
    'Cream crepe with jacquard sleeve panels',
    'Dry clean only.',
    (select id from cat where slug = 'midi'),
    (select id from col where slug = 'classic-sophisticate'),
    47500000, true, true, false, 8, now()
  )
on conflict (slug) do nothing;
-- ============================================================================
-- Miyenka — colourways, stock and photography for the launch catalogue
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Colourways. Each may carry its own photography.
-- ---------------------------------------------------------------------------
insert into product_variants (product_id, color_name, color_hex, sku_prefix, position)
select p.id, v.color_name, v.color_hex, v.sku_prefix, v.position
from products p
join (values
  ('dream-dress-heart-butterfly-coat', 'Ivory',      '#F4F1EC', 'MY-DRM-IVY', 1),
  ('gilded-plume-gown',                'Ivory Gold', '#F0E7D6', 'MY-PLM-IVG', 1),
  ('gilded-tassel-gown',               'Ivory Gold', '#F0E7D6', 'MY-TSL-IVG', 1),
  ('sculpted-rose-mini',               'Noir',       '#100D0B', 'MY-ROS-NOI', 1),
  ('bow-pleated-gown',                 'Champagne',  '#C9A87C', 'MY-BOW-CHM', 1),
  ('bow-pleated-gown',                 'Crimson',    '#A81B28', 'MY-BOW-CRM', 2),
  ('bow-pleated-gown',                 'Sand',       '#D6BE9C', 'MY-BOW-SND', 3),
  ('butterfly-corset-mini',            'Ivory',      '#F4F1EC', 'MY-BFY-IVY', 1),
  ('pleated-corset-mini',              'Noir',       '#100D0B', 'MY-PCM-NOI', 1),
  ('pleated-corset-mini',              'Pearl',      '#F6F1E7', 'MY-PCM-PRL', 2),
  ('bow-sleeve-midi',                  'Cream',      '#F3EADC', 'MY-BSM-CRM', 1)
) as v(product_slug, color_name, color_hex, sku_prefix, position)
  on v.product_slug = p.slug
on conflict (product_id, color_name) do nothing;

-- ---------------------------------------------------------------------------
-- Sizes and opening stock.
--
-- Statement gowns run deliberately shallow; they are made to order more often
-- than they are held. Every figure is editable in Admin → Inventory.
-- ---------------------------------------------------------------------------
insert into product_sizes (variant_id, size, sku, quantity)
select
  pv.id,
  s.size::size_code,
  pv.sku_prefix || '-' || s.size,
  case
    when p.slug in ('gilded-plume-gown', 'gilded-tassel-gown')
      then (array[1, 2, 2, 2, 1, 1])[s.idx]
    else (array[2, 4, 5, 5, 3, 2])[s.idx]
  end
from product_variants pv
join products p on p.id = pv.product_id
cross join (values
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6)
) as s(size, idx)
on conflict (variant_id, size) do nothing;

-- ---------------------------------------------------------------------------
-- Photography
-- ---------------------------------------------------------------------------

-- Product-level imagery (shown for every colourway).
insert into product_images (product_id, url, alt_text, position, is_primary)
select p.id, i.url, i.alt_text, i.position, i.is_primary
from products p
join (values
  ('dream-dress-heart-butterfly-coat', '/lookbook/heart-butterfly-coat-salon.png',
   'The Dream Dress photographed in a gilded salon', 1, true),
  ('dream-dress-heart-butterfly-coat', '/lookbook/heart-butterfly-campaign-falls.jpg',
   'The Dream Dress carried through tropical foliage beside a waterfall', 2, false),
  ('dream-dress-heart-butterfly-coat', '/lookbook/heart-butterfly-coat-atelier.jpg',
   'The Dream Dress styled with a hijab in a glass-walled office', 3, false),
  ('dream-dress-heart-butterfly-coat', '/lookbook/heart-butterfly-suit-tower.jpg',
   'The Dream Dress worn long over matching ivory trousers', 4, false),
  ('dream-dress-heart-butterfly-coat', '/lookbook/dream-dress-feature.jpg',
   'Close study of the scarlet heart and butterfly appliqué', 5, false),

  ('gilded-plume-gown', '/lookbook/gilded-plume-gown-daylight.jpg',
   'The Gilded Plume Gown seated in afternoon light', 1, true),
  ('gilded-plume-gown', '/lookbook/gilded-plume-gown-detail.jpg',
   'Detail of the beaded neckline and gold feather appliqué', 2, false),
  ('gilded-plume-gown', '/lookbook/gilded-plume-gown-mono.jpg',
   'The Gilded Plume Gown photographed in black and white', 3, false),
  ('gilded-plume-gown', '/lookbook/gilded-plume-gown-story.png',
   'The Gilded Plume Gown in a monochrome editorial frame', 4, false),

  ('gilded-tassel-gown', '/lookbook/gilded-tassel-gown-studio.jpg',
   'The Gilded Tassel Gown photographed against a pale studio wall', 1, true),

  ('sculpted-rose-mini', '/lookbook/sculpted-rose-mini-full.jpg',
   'The Sculpted Rose Mini photographed against a stone balustrade', 1, true),
  ('sculpted-rose-mini', '/lookbook/sculpted-rose-mini-portrait.jpg',
   'Detail of the asymmetric collar and sculpted rose closures', 2, false),

  ('butterfly-corset-mini', '/lookbook/butterfly-corset-mini-conservatory.jpg',
   'The Butterfly Corset Mini photographed in a flowering conservatory', 1, true),

  ('bow-sleeve-midi', '/lookbook/bow-sleeve-midi-atelier.jpg',
   'The Bow Sleeve Midi hanging in the atelier', 1, true)
) as i(product_slug, url, alt_text, position, is_primary)
  on i.product_slug = p.slug
on conflict do nothing;

-- Colourway-specific imagery.
insert into product_images (product_id, variant_id, url, alt_text, position, is_primary)
select pv.product_id, pv.id, i.url, i.alt_text, i.position, i.is_primary
from product_variants pv
join products p on p.id = pv.product_id
join (values
  ('bow-pleated-gown', 'Champagne', '/lookbook/bow-pleated-gown-champagne.jpg',
   'The Bow Pleated Gown in champagne, photographed at a banquet', 1, true),
  ('bow-pleated-gown', 'Crimson', '/lookbook/bow-pleated-midi-crimson.jpg',
   'The Bow Pleated Gown in crimson beneath a ballroom chandelier', 1, true),
  ('bow-pleated-gown', 'Crimson', '/lookbook/bow-pleated-sketch.jpg',
   'The original atelier sketch of the Bow Pleated silhouette in red', 2, false),
  ('bow-pleated-gown', 'Sand', '/lookbook/bow-pleated-mini-sand.jpg',
   'The Bow Pleated silhouette in sand, photographed poolside at dusk', 1, true),

  ('pleated-corset-mini', 'Noir', '/lookbook/pleated-corset-mini-noir.jpg',
   'The Pleated Corset Mini in noir, styled with a cropped ivory blazer', 1, true),
  ('pleated-corset-mini', 'Pearl', '/lookbook/pleated-corset-form-pearl.jpg',
   'The Pleated Corset Mini in pearl, shown on an atelier dress form', 1, true)
) as i(product_slug, color_name, url, alt_text, position, is_primary)
  on i.product_slug = p.slug and i.color_name = pv.color_name
on conflict do nothing;
-- ============================================================================
-- Miyenka — promotion redemption counter
--
-- Incremented only once a payment is verified, from the webhook processor.
-- Kept as a function so the read-modify-write happens atomically in the
-- database rather than as a racy select-then-update from the application.
-- ============================================================================

create or replace function increment_promotion_usage(p_promotion_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update promotions
     set usage_count = usage_count + 1
   where id = p_promotion_id
  returning usage_count into v_count;

  return coalesce(v_count, 0);
end;
$$;
