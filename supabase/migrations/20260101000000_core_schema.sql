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
