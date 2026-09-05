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
