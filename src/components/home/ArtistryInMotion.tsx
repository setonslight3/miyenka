import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Behind the Craft — the sketch-to-finish story.
 *
 * Uses the atelier sketch and the finished garment photographed in three
 * different registers, so the sequence reads as one piece of work moving from
 * drawing to studio to daylight.
 */
const STAGES = [
  {
    step: '01',
    title: 'The Sketch',
    body: 'Every silhouette begins on paper. Proportion, drape and the fall of a pleat are settled long before a pattern is cut.',
    image: '/lookbook/bow-pleated-sketch.jpg',
    alt: 'The original atelier sketch of the Bow Pleated silhouette in red',
  },
  {
    step: '02',
    title: 'The Form',
    body: 'The pattern is draped on the stand and corrected by hand, panel by panel, until the shape holds itself without help.',
    image: '/lookbook/pleated-corset-form-pearl.jpg',
    alt: 'A pleated corset bodice being shaped on an atelier dress form',
  },
  {
    step: '03',
    title: 'The Detail',
    body: 'Beading, feather placement and every hand-tied bow are finished individually. No two pieces fall identically.',
    image: '/lookbook/gilded-plume-gown-detail.jpg',
    alt: 'Close detail of beaded trim and gold feather appliqué',
  },
  {
    step: '04',
    title: 'The Piece',
    body: 'Photographed as it will be worn — in real light, on a real body, moving.',
    image: '/lookbook/gilded-plume-gown-daylight.jpg',
    alt: 'The finished gown photographed outdoors in afternoon light',
  },
];

export function ArtistryInMotion() {
  return (
    <section className="bg-ink py-24 text-cream lg:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow="Behind the Craft"
          title="Artistry in Motion"
          description="From a first pencil line to the finished garment. This is how a Miyenka piece is made."
          className="[&_h2]:text-cream [&_p:last-child]:text-cream/55"
        />

        <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => (
            <li key={stage.step} className="group">
              <div className="relative aspect-[3/4] overflow-hidden bg-ink-soft">
                <Image
                  src={stage.image}
                  alt={stage.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover opacity-90 transition-all duration-[1400ms] ease-silk group-hover:scale-105 group-hover:opacity-100"
                />
                <span className="absolute left-4 top-4 font-display text-3xl font-light text-gold">
                  {stage.step}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl font-light">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/55">{stage.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 text-center">
          <Link
            href="/custom"
            className="inline-block border border-gold px-10 py-4 text-[0.72rem] uppercase tracking-luxe text-gold transition-colors duration-500 hover:bg-gold hover:text-ink"
          >
            Commission a bespoke piece
          </Link>
        </div>
      </div>
    </section>
  );
}
