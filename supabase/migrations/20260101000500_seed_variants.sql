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
