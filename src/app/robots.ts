import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Customer-specific and credential-bearing paths must never be indexed.
        disallow: [
          '/admin',
          '/account',
          '/api',
          '/checkout',
          '/cart',
          '/order/',
          '/quote/',
          '/wishlist',
          '/search',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
