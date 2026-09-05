import type { Metadata } from 'next';
import Image from 'next/image';
import { BespokeForm } from '@/components/product/BespokeForm';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { createClient } from '@/lib/supabase/server';
import { getPublicSettings } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Bespoke Atelier',
  description:
    'Commission a Miyenka piece cut to your exact measurements, in your choice of fabric and colour.',
  alternates: { canonical: '/custom' },
};

type Search = Promise<{ product?: string | string[] }>;

export default async function CustomPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const productSlug = Array.isArray(search.product) ? search.product[0] : search.product;

  const supabase = await createClient();
  const [{ data: user }, settings, product] = await Promise.all([
    supabase.auth.getUser(),
    getPublicSettings(),
    productSlug
      ? supabase
          .from('products')
          .select('slug, name, subtitle')
          .eq('slug', productSlug)
          .eq('is_published', true)
          .maybeSingle()
          .then((result) => result.data)
      : Promise.resolve(null),
  ]);

  return (
    <>
      <header className="relative isolate min-h-[55svh] overflow-hidden bg-ink">
        <Image
          src="/lookbook/pleated-corset-form-pearl.jpg"
          alt="A pleated corset bodice being shaped on an atelier dress form"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-ink/25" aria-hidden="true" />
        <div className="shell relative flex min-h-[55svh] flex-col justify-end py-16">
          <p className="eyebrow text-gold-light">The Atelier</p>
          <h1 className="display-lg mt-4 text-cream">Made entirely to you</h1>
          <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-cream/70">
            Share your measurements and what you have in mind. We will prepare a quotation, and once
            it is accepted your piece is cut to you alone.
          </p>
        </div>
      </header>

      <section className="shell py-20">
        <SectionHeading
          eyebrow="How it works"
          title="From request to fitting"
          description={`Bespoke pieces are produced in approximately ${settings.bespokeLeadTime.min}–${settings.bespokeLeadTime.max} days once the quotation is settled.`}
        />

        <ol className="mt-14 grid gap-8 md:grid-cols-4">
          {[
            ['01', 'Tell us', 'Share your measurements, fabric and colour preference, and any references.'],
            ['02', 'We quote', 'We review the request and send a quotation with a production window.'],
            ['03', 'You accept', 'Settle the quotation securely through the private link we send you.'],
            ['04', 'We cut', 'Your pattern is made to your measurements and finished by hand.'],
          ].map(([step, title, body]) => (
            <li key={step}>
              <span className="font-display text-3xl font-light text-gold">{step}</span>
              <h3 className="mt-3 font-display text-xl font-light">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-cream-deep/40 py-20">
        <div className="shell max-w-3xl">
          <BespokeForm
            product={product ?? null}
            signedIn={Boolean(user.user)}
            defaultEmail={user.user?.email ?? ''}
          />
        </div>
      </section>
    </>
  );
}
