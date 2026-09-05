import type { Metadata } from 'next';
import Link from 'next/link';
import { SIZE_CHART, inchesToCm } from '@/lib/commerce/sizing';

export const metadata: Metadata = {
  title: 'Sizing Chart',
  description: 'Miyenka size chart with UK equivalents and body measurements in inches and centimetres.',
  alternates: { canonical: '/sizing' },
};

export default function SizingPage() {
  return (
    <div className="shell max-w-4xl py-14 lg:py-20">
      <header className="text-center">
        <p className="eyebrow">Client Care</p>
        <h1 className="display-lg mt-4">Sizing Chart</h1>
        <span className="rule-gold mx-auto mt-6 block" />
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ink-muted">
          These measurements describe the body, not the garment. If you fall between two sizes,
          take the larger — or request a bespoke fit and we will cut to your exact measurements.
        </p>
      </header>

      <div className="mt-14 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse">
          <caption className="sr-only">
            Miyenka size chart: size code, UK equivalent, and bust, waist and hip measurements in
            inches and centimetres
          </caption>
          <thead>
            <tr className="border-b border-ink/20 text-left">
              {['Size', 'UK', 'Bust (in)', 'Bust (cm)', 'Waist (in)', 'Waist (cm)', 'Hips (in)', 'Hips (cm)'].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="py-4 pr-4 text-[0.6rem] font-normal uppercase tracking-luxe text-ink-faint"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row.code} className="border-b border-ink/10">
                <th scope="row" className="py-4 pr-4 text-left font-display text-lg font-light">
                  {row.code}
                </th>
                <td className="py-4 pr-4 text-sm text-ink-muted">{row.uk}</td>
                <td className="py-4 pr-4 text-sm text-ink-muted">{row.bustIn}</td>
                <td className="py-4 pr-4 text-sm text-ink-muted">{inchesToCm(row.bustIn)}</td>
                <td className="py-4 pr-4 text-sm text-ink-muted">{row.waistIn}</td>
                <td className="py-4 pr-4 text-sm text-ink-muted">{inchesToCm(row.waistIn)}</td>
                <td className="py-4 pr-4 text-sm text-ink-muted">{row.hipsIn}</td>
                <td className="py-4 text-sm text-ink-muted">{inchesToCm(row.hipsIn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-16 border-t border-ink/10 pt-12">
        <h2 className="display-md">How to measure</h2>
        <dl className="mt-8 grid gap-8 sm:grid-cols-2">
          {[
            ['Bust', 'Around the fullest part of the bust, keeping the tape level and unstretched.'],
            ['Waist', 'Around the narrowest part of the natural waist, usually just above the navel.'],
            ['Hips', 'Around the fullest part of the hips, roughly 20 cm below the waist.'],
            ['Shoulder to hem', 'From the top of the shoulder, straight down to where you want the hem to fall.'],
          ].map(([term, description]) => (
            <div key={term}>
              <dt className="text-[0.62rem] uppercase tracking-luxe text-gold-deep">{term}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</dd>
            </div>
          ))}
        </dl>

        <Link
          href="/custom"
          className="mt-10 inline-block border border-ink px-9 py-4 text-[0.7rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
        >
          Request a bespoke fit
        </Link>
      </section>
    </div>
  );
}
