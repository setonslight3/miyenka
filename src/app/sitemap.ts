import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/collections`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/new-arrivals`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/custom`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/sizing`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/track-order`, changeFrequency: 'yearly', priority: 0.3 },
    ...['returns', 'shipping', 'privacy', 'terms'].map((slug) => ({
      url: `${siteUrl}/policies/${slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];

  try {
    const supabase = await createClient();
    const [{ data: products }, { data: collections }] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('is_published', true),
      supabase.from('collections').select('slug').eq('is_published', true),
    ]);

    return [
      ...staticRoutes,
      ...(collections ?? []).map((collection) => ({
        url: `${siteUrl}/collections/${collection.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...(products ?? []).map((product) => ({
        url: `${siteUrl}/product/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      })),
    ];
  } catch {
    // A sitemap missing its dynamic entries is far better than a build failure.
    return staticRoutes;
  }
}
