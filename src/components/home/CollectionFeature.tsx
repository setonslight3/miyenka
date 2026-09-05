import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function CollectionFeature({
  eyebrow,
  title,
  description,
  imageUrl,
  imageAlt,
  href,
  ctaLabel = 'Explore the collection',
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
  ctaLabel?: string;
  reverse?: boolean;
}) {
  return (
    <section className="shell py-20 lg:py-28">
      <div className={cn('grid items-center gap-12 lg:grid-cols-2 lg:gap-20', reverse && 'lg:[direction:rtl]')}>
        <Link
          href={href}
          className="group relative block aspect-[4/5] overflow-hidden bg-cream-deep lg:[direction:ltr]"
        >
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-[1400ms] ease-silk group-hover:scale-105"
          />
        </Link>

        <div className="lg:[direction:ltr]">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="display-lg mt-5 text-balance">{title}</h2>
          <span className="mt-6 block h-px w-20 bg-gradient-to-r from-gold to-gold/0" />
          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">{description}</p>
          <Link
            href={href}
            className="mt-9 inline-block border-b border-ink pb-1 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:border-gold hover:text-gold-deep"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
