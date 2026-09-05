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
