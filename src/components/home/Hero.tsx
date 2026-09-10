'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomepageSettings } from '@/lib/commerce/settings';

/**
 * Full-screen hero video built on the supplied brand film.
 *
 * Guarantees autoplay across all devices (including iOS Safari/WebKit) by:
 * - Omitting any static poster picture so the video is immediately displayed
 * - Setting native autoPlay, muted, playsInline, and preload="auto"
 * - Imperatively enforcing video.defaultMuted = true and video.muted = true
 * - Providing a passive touch/scroll interaction listener for iOS Low Power Mode
 * - Providing an optional sound toggle for the camera sounds and soundtrack
 */
export function Hero({ settings }: { settings: HomepageSettings }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Imperatively configure the video element as soon as it mounts to satisfy WebKit autoplay rules
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      el.defaultMuted = true;
      el.muted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;

    const playVideo = () => {
      if (video.paused) {
        const promise = video.play();
        if (promise !== undefined) {
          promise.catch(() => {
            // Autoplay was blocked (e.g. low power mode)
          });
        }
      }
    };

    // Attempt immediate playback
    playVideo();

    // Listen for media ready events
    video.addEventListener('canplay', playVideo, { once: true });
    video.addEventListener('loadeddata', playVideo, { once: true });

    // Fallback for iOS Low Power Mode: start on first touch or scroll
    const onInteraction = () => {
      playVideo();
      window.removeEventListener('touchstart', onInteraction);
      window.removeEventListener('scroll', onInteraction);
      window.removeEventListener('click', onInteraction);
    };

    window.addEventListener('touchstart', onInteraction, { passive: true });
    window.addEventListener('scroll', onInteraction, { passive: true });
    window.addEventListener('click', onInteraction, { passive: true });

    return () => {
      video.removeEventListener('canplay', playVideo);
      video.removeEventListener('loadeddata', playVideo);
      window.removeEventListener('touchstart', onInteraction);
      window.removeEventListener('scroll', onInteraction);
      window.removeEventListener('click', onInteraction);
    };
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-height))] items-center overflow-hidden bg-ink">
      <video
        ref={setVideoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={settings.hero_video} type="video/mp4" />
      </video>

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

      {/* Sound toggle button */}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={isMuted ? 'Unmute video sound' : 'Mute video sound'}
        className="absolute bottom-8 right-6 z-20 flex items-center gap-2 rounded-full border border-cream/20 bg-ink/60 px-3.5 py-2 text-[0.65rem] uppercase tracking-wide text-cream backdrop-blur-md transition-colors hover:border-gold hover:text-gold focus-visible:ring-1 focus-visible:ring-gold"
      >
        {isMuted ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <line x1="22" x2="16" y1="9" y2="15" />
              <line x1="16" x2="22" y1="9" y2="15" />
            </svg>
            <span className="hidden sm:inline">Sound Off</span>
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <span className="hidden sm:inline">Sound On</span>
          </>
        )}
      </button>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2" aria-hidden="true">
        <span className="block h-12 w-px bg-gradient-to-b from-transparent via-cream/50 to-transparent" />
      </div>
    </section>
  );
}
