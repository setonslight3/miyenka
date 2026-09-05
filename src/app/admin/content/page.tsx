import type { Metadata } from 'next';
import Image from 'next/image';
import { ActionForm, AdminField, adminInput } from '@/components/admin/ActionForm';
import { updateSetting } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Homepage', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Homepage = {
  hero_headline?: string;
  hero_subline?: string;
  hero_cta_label?: string;
  hero_cta_href?: string;
  hero_video?: string;
  hero_poster?: string;
};

type Announcement = { enabled?: boolean; message?: string; href?: string };

export default async function AdminContent() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: settings }, { data: featured }] = await Promise.all([
    supabase.from('site_settings').select('key, value').in('key', ['homepage', 'announcement']),
    supabase
      .from('products')
      .select('id, name, slug, is_featured, is_published')
      .eq('is_published', true)
      .order('position'),
  ]);

  const homepage = (settings?.find((s) => s.key === 'homepage')?.value ?? {}) as Homepage;
  const announcement = (settings?.find((s) => s.key === 'announcement')?.value ?? {}) as Announcement;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-light">Homepage</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-faint">
          Hero copy, media and the announcement bar. Changes appear on the storefront immediately.
        </p>
      </header>

      <section className="border border-ink/10 p-6">
        <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">Hero</h2>

        <div className="mb-6 grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
          <div className="relative aspect-[3/4] overflow-hidden bg-cream-deep">
            {homepage.hero_poster ? (
              <Image src={homepage.hero_poster} alt="Current hero poster" fill sizes="192px" className="object-cover" />
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-ink-faint">
            The hero plays the supplied brand film muted and looping. The poster frame is shown
            first, and stands in permanently if the browser refuses autoplay or the viewer prefers
            reduced motion — so it should read well as a still image on its own.
          </p>
        </div>

        {/*
          The hero settings are stored as one JSON object, so the form assembles
          that object rather than writing individual keys.
        */}
        <HeroForm homepage={homepage} />
      </section>

      <section className="border border-ink/10 p-6">
        <h2 className="mb-4 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
          Announcement bar
        </h2>
        <ActionForm action={updateSetting} submitLabel="Save announcement" className="space-y-3">
          <input type="hidden" name="key" value="announcement" />
          <AdminField label="Value (JSON)">
            <textarea
              name="value"
              rows={5}
              defaultValue={JSON.stringify(
                {
                  enabled: announcement.enabled ?? false,
                  message: announcement.message ?? '',
                  href: announcement.href ?? '/shop',
                },
                null,
                2,
              )}
              className={`${adminInput} font-mono text-xs`}
            />
          </AdminField>
          <p className="text-[0.65rem] text-ink-faint">
            Set <code>enabled</code> to false to hide the bar entirely.
          </p>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-3 text-[0.6rem] uppercase tracking-luxe text-ink-faint">
          Featured on the homepage
        </h2>
        <p className="mb-3 text-xs text-ink-faint">
          Featured pieces lead the Explore All Designs grid. Toggle this on a product&rsquo;s own page.
        </p>
        <ul className="flex flex-wrap gap-2">
          {(featured ?? []).map((product) => (
            <li
              key={product.id}
              className={`border px-3 py-1.5 text-xs ${
                product.is_featured ? 'border-gold text-gold-deep' : 'border-ink/15 text-ink-faint'
              }`}
            >
              {product.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HeroForm({ homepage }: { homepage: Homepage }) {
  return (
    <ActionForm action={updateSetting} submitLabel="Save hero" className="space-y-3">
      <input type="hidden" name="key" value="homepage" />
      <AdminField label="Value (JSON)">
        <textarea
          name="value"
          rows={9}
          defaultValue={JSON.stringify(
            {
              hero_headline: homepage.hero_headline ?? 'She is becoming',
              hero_subline: homepage.hero_subline ?? 'Fashion is your first voice',
              hero_cta_label: homepage.hero_cta_label ?? 'Discover the collections',
              hero_cta_href: homepage.hero_cta_href ?? '/collections',
              hero_video: homepage.hero_video ?? '/media/miyenka-hero.mp4',
              hero_poster: homepage.hero_poster ?? '/lookbook/gilded-tassel-gown-studio.jpg',
            },
            null,
            2,
          )}
          className={`${adminInput} font-mono text-xs`}
        />
      </AdminField>
    </ActionForm>
  );
}
