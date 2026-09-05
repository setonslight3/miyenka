import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/database.types';

export type HomepageSettings = {
  hero_headline: string;
  hero_subline: string;
  hero_cta_label: string;
  hero_cta_href: string;
  hero_video: string;
  hero_poster: string;
};

export type AnnouncementSettings = { enabled: boolean; message: string; href?: string };

const DEFAULTS = {
  cancellation_window_hours: 12,
  free_shipping_threshold_minor: 50_000_000,
  supported_display_currencies: ['NGN', 'USD', 'GBP'],
  base_currency: 'NGN',
  homepage: {
    hero_headline: 'She is becoming',
    hero_subline: 'Fashion is your first voice',
    hero_cta_label: 'Discover the collections',
    hero_cta_href: '/collections',
    hero_video: '/media/miyenka-hero.mp4',
    hero_poster: '/lookbook/gilded-tassel-gown-studio.jpg',
  } satisfies HomepageSettings,
  announcement: { enabled: false, message: '' } satisfies AnnouncementSettings,
} as const;

/**
 * Reads every public setting in one round trip, memoised per request.
 *
 * Falls back to sane defaults so the storefront still renders if the settings
 * table has not been seeded yet.
 */
export const getPublicSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('key, value').eq('is_public', true);

  const map = new Map<string, Json>();
  for (const row of data ?? []) map.set(row.key, row.value);

  const read = <T>(key: string, fallback: T): T => (map.has(key) ? (map.get(key) as T) : fallback);

  return {
    cancellationWindowHours: Number(read('cancellation_window_hours', DEFAULTS.cancellation_window_hours)),
    freeShippingThresholdMinor: Number(
      read('free_shipping_threshold_minor', DEFAULTS.free_shipping_threshold_minor),
    ),
    supportedCurrencies: read<string[]>('supported_display_currencies', [
      ...DEFAULTS.supported_display_currencies,
    ]),
    baseCurrency: read<string>('base_currency', DEFAULTS.base_currency),
    taxEnabled: read<boolean>('tax_enabled', false),
    bespokeLeadTime: read<{ min: number; max: number }>('bespoke_lead_time_days', { min: 14, max: 28 }),
    homepage: { ...DEFAULTS.homepage, ...read<Partial<HomepageSettings>>('homepage', {}) },
    announcement: {
      ...DEFAULTS.announcement,
      ...read<Partial<AnnouncementSettings>>('announcement', {}),
    },
  };
});

/** Active customer-care numbers, ordered. One means direct launch, two means a chooser. */
export const getWhatsappContacts = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('whatsapp_contacts')
    .select('id, label, phone_e164, greeting')
    .eq('is_active', true)
    .order('position');
  return data ?? [];
});
