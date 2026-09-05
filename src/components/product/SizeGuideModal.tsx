'use client';

import { useEffect, useState } from 'react';
import { SIZE_CHART, inchesToCm } from '@/lib/commerce/sizing';
import { cn } from '@/lib/utils/cn';

/** Sizing chart in both inches and centimetres, per the specification. */
export function SizeGuideModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = (inches: number) => (unit === 'in' ? inches : inchesToCm(inches));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[0.65rem] uppercase tracking-wide text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        {trigger ?? 'Size guide'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close size guide"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="relative w-full max-w-2xl bg-cream p-7 sm:p-10"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="eyebrow">Miyenka</p>
                <h2 id="size-guide-title" className="display-md mt-2">
                  Sizing Chart
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close size guide"
                className="p-2 text-ink-muted hover:text-ink"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 inline-flex border border-ink/15" role="group" aria-label="Measurement unit">
              {(['in', 'cm'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnit(option)}
                  aria-pressed={unit === option}
                  className={cn(
                    'px-5 py-2 text-[0.65rem] uppercase tracking-wide transition-colors',
                    unit === option ? 'bg-ink text-cream' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {option === 'in' ? 'Inches' : 'Centimetres'}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <caption className="sr-only">
                  Miyenka size chart with UK equivalents and body measurements
                </caption>
                <thead>
                  <tr className="border-b border-ink/15 text-left">
                    <th scope="col" className="py-3 pr-4 font-normal text-[0.62rem] uppercase tracking-luxe text-ink-faint">Size</th>
                    <th scope="col" className="py-3 pr-4 font-normal text-[0.62rem] uppercase tracking-luxe text-ink-faint">UK</th>
                    <th scope="col" className="py-3 pr-4 font-normal text-[0.62rem] uppercase tracking-luxe text-ink-faint">Bust</th>
                    <th scope="col" className="py-3 pr-4 font-normal text-[0.62rem] uppercase tracking-luxe text-ink-faint">Waist</th>
                    <th scope="col" className="py-3 font-normal text-[0.62rem] uppercase tracking-luxe text-ink-faint">Hips</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_CHART.map((row) => (
                    <tr key={row.code} className="border-b border-ink/8">
                      <th scope="row" className="py-3 pr-4 text-left font-normal">{row.code}</th>
                      <td className="py-3 pr-4 text-ink-muted">{row.uk}</td>
                      <td className="py-3 pr-4 text-ink-muted">{value(row.bustIn)}</td>
                      <td className="py-3 pr-4 text-ink-muted">{value(row.waistIn)}</td>
                      <td className="py-3 text-ink-muted">{value(row.hipsIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-ink-faint">
              Measurements describe the body, not the garment. Between two sizes, take the larger —
              or request a bespoke fit and we will cut to your exact measurements.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
