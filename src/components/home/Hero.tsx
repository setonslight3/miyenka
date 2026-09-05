'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { HomepageSettings } from '@/lib/commerce/settings';

/**
 * Full-screen hero built on the supplied brand film.
 *
 * The video is muted, looping and playsInline so mobile browsers will autoplay
 * it; if autoplay is refused or the viewer prefers reduced motion, the poster
 * frame stands in and nothing is lost.
 */
export function Hero({ settings }: { settings: HomepageSettings }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    video.play().then(() => setReady(true)).catch(() => {
      // Autoplay refused; the poster image remains visible.
    });
  }, []);

  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-height))] items-center overflow-hidden bg-ink">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
        poster={settings.hero_poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={settings.hero_video} type="video/mp4" />
      </video>

      {/* Poster underlay keeps the section filled before the video paints. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${settings.hero_poster})`, opacity: ready ? 0 : 1 }}
        aria-hidden="true"
      />

      {/* Scrim: keeps the headline legible over any frame of the film. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/45" aria-hidden="true" />

      <div className="shell relative z-10 py-28">
        <div className="max-w-2xl animate-rise">
          <p className="eyebrow text-gold-light">Miyenka</p>
          <h1 className="display-xl mt-6 text-cream text-balance">{settings.hero_headline}</h1>
          <p className="mt-6 max-w-md font-display text-2xl font-light italic text-cream/80">
            {settings.hero_subline}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={settings.hero_cta_href}
              className="border border-gold bg-gold px-10 py-4 text-[0.72rem] uppercase tracking-luxe text-ink transition-colors duration-500 hover:bg-transparent hover:text-gold"
            >
              {settings.hero_cta_label}
            </Link>
            <Link
              href="/custom"
              className="border border-cream/40 px-10 py-4 text-[0.72rem] uppercase tracking-luxe text-cream transition-colors duration-500 hover:border-cream hover:bg-cream hover:text-ink"
            >
              Book a bespoke fitting
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2" aria-hidden="true">
        <span className="block h-12 w-px bg-gradient-to-b from-transparent via-cream/50 to-transparent" />
      </div>
    </section>
  );
}
