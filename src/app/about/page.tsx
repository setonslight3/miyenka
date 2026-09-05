import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/ui/SectionHeading';

export const metadata: Metadata = {
  title: 'About Miyenka',
  description:
    'Miyenka is a luxury fashion house built on hand craftsmanship — mini, midi, maxi and statement gowns, ready-to-wear and bespoke.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <header className="relative isolate min-h-[60svh] overflow-hidden bg-ink">
        <Image
          src="/lookbook/atelier-boutique.jpg"
          alt="The Miyenka atelier, with gowns on a gold rail beneath a wall reading “She is becoming”"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-ink/20" aria-hidden="true" />
        <div className="shell relative flex min-h-[60svh] flex-col justify-end py-16">
          <p className="eyebrow text-gold-light">The House</p>
          <h1 className="display-lg mt-4 max-w-2xl text-cream text-balance">She is becoming</h1>
        </div>
      </header>

      <section className="shell py-20 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="eyebrow">Our Belief</p>
            <h2 className="display-md mt-4">Fashion is your first voice</h2>
            <span className="mt-6 block h-px w-20 bg-gradient-to-r from-gold to-gold/0" />
          </div>
          <div className="space-y-5 text-[0.95rem] leading-relaxed text-ink-muted">
            <p>
              Miyenka was built on a simple observation: what a woman wears speaks before she does.
              We make clothes for the sentence she wants to open with.
            </p>
            <p>
              Every piece begins as a drawing and ends as a garment finished by hand. Beading is
              placed individually. Feathers are set one at a time. Bows are tied and tacked rather
              than stamped. It is slower, and it is the reason a Miyenka piece holds its shape and
              its presence.
            </p>
            <p>
              We work in two registers. <strong className="font-normal text-ink">Modern Muse</strong>{' '}
              is structural and monochromatic — sharp shoulders, sculpted waists, pleating that
              holds. <strong className="font-normal text-ink">Classic Sophisticate</strong> is fluid
              and unhurried — long lines, hand-worked embellishment, restraint that reads as
              confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-cream-deep/50 py-20 lg:py-28">
        <div className="shell">
          <SectionHeading
            eyebrow="How we work"
            title="Ready-to-wear, or made entirely to you"
            description="Every eligible piece can be ordered in a standard size or cut to your exact measurements in the fabric and colour you choose."
          />

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              {
                title: 'Hand-finished',
                body: 'Embellishment, appliqué and trims are applied by hand. No two pieces fall identically.',
              },
              {
                title: 'Made to your measure',
                body: 'Share your bust, waist, hip and length. We cut the pattern to you, not to an average.',
              },
              {
                title: 'Cared for after',
                body: 'Client care stays available on WhatsApp — for fit, for occasion dressing, for anything after delivery.',
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-2xl font-light">{item.title}</h3>
                <span className="mt-4 block h-px w-12 bg-gold/60" />
                <p className="mt-4 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/custom"
              className="inline-block border border-ink px-10 py-4 text-[0.72rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
            >
              Commission a bespoke piece
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
