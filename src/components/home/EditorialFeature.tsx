import Image from 'next/image';
import Link from 'next/link';

/**
 * Full-bleed editorial break between the collection features and the grid.
 */
export function EditorialFeature() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative min-h-[70svh] w-full">
        <Image
          src="/lookbook/heart-butterfly-campaign-falls.jpg"
          alt="A Miyenka coat dress photographed beside a waterfall in tropical foliage"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/30 to-transparent" aria-hidden="true" />
      </div>

      <div className="absolute inset-0 flex items-center">
        <div className="shell">
          <div className="max-w-lg">
            <p className="eyebrow text-gold-light">The Dream Dress</p>
            <h2 className="display-lg mt-5 text-cream text-balance">
              Worn where it is meant to be worn
            </h2>
            <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-cream/70">
              A single scarlet heart, cut by hand and set high on the chest. Butterflies climbing the
              skirt and cuffs. The piece the house is known for.
            </p>
            <Link
              href="/product/dream-dress-heart-butterfly-coat"
              className="mt-9 inline-block border border-cream/50 px-9 py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:bg-cream hover:text-ink"
            >
              View the piece
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
