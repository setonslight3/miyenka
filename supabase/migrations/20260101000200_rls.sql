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
