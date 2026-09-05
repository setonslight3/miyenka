import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicSettings } from '@/lib/commerce/settings';
import { formatMoney } from '@/lib/commerce/money';

type Params = Promise<{ slug: string }>;

type Policy = {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
};

/**
 * Policy copy is generated from the live admin settings where a figure is
 * configurable, so the published policy can never drift from what the system
 * actually enforces.
 */
function buildPolicies(settings: Awaited<ReturnType<typeof getPublicSettings>>): Record<string, Policy> {
  const hours = settings.cancellationWindowHours;
  const threshold = formatMoney(settings.freeShippingThresholdMinor);

  return {
    returns: {
      title: 'Returns & Cancellation',
      intro:
        'Every Miyenka piece is cut and finished by hand, and bespoke pieces are made to a single client’s measurements.',
      sections: [
        {
          heading: 'Refunds',
          body: [
            'Miyenka does not offer refunds as a matter of course.',
            'Where something has genuinely gone wrong — a fault in the garment, or an error on our side — contact client care on WhatsApp and we will review it individually.',
          ],
        },
        {
          heading: 'Cancellation',
          body: [
            `An order may be cancelled within ${hours} hours of being placed, provided production or fulfilment has not already begun.`,
            'Once a piece has entered production or has been dispatched, it can no longer be cancelled.',
            'Bespoke commissions cannot be cancelled once cutting has started, as the pattern is made to your measurements alone.',
          ],
        },
        {
          heading: 'Faulty or incorrect items',
          body: [
            'If a piece arrives damaged or is not what you ordered, contact client care within 48 hours of delivery with photographs, and we will resolve it directly.',
          ],
        },
      ],
    },
    shipping: {
      title: 'Shipping & Delivery',
      intro: 'We deliver across Lagos, nationwide within Nigeria, and internationally.',
      sections: [
        {
          heading: 'Delivery zones',
          body: [
            'Lagos Island and Lagos Mainland are served by our own courier partners, typically within 1–3 working days.',
            'Nationwide delivery within Nigeria typically takes 2–5 working days.',
            'International delivery is handled by third-party logistics and typically takes 5–12 working days, excluding customs clearance.',
          ],
        },
        {
          heading: 'Complimentary delivery',
          body: [`Nationwide delivery within Nigeria is complimentary on orders above ${threshold}.`],
        },
        {
          heading: 'Duties and customs',
          body: [
            'International orders may attract import duties or customs charges on arrival. These are set by the destination country and are the recipient’s responsibility.',
          ],
        },
        {
          heading: 'Made-to-order timelines',
          body: [
            `Bespoke pieces are produced in ${settings.bespokeLeadTime.min}–${settings.bespokeLeadTime.max} days before dispatch. Your confirmed production window is quoted before payment.`,
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy',
      intro: 'What we collect, why we collect it, and what we never do with it.',
      sections: [
        {
          heading: 'What we collect',
          body: [
            'Order details: the pieces you buy, your delivery address and your contact details.',
            'Bespoke commissions: the measurements and reference images you choose to share.',
            'Account details, if you create an account, and your newsletter preference if you subscribe.',
          ],
        },
        {
          heading: 'How it is protected',
          body: [
            'Your orders, measurements and reference images are readable only by you and by authorised Miyenka staff. Reference images you upload for a bespoke commission are stored privately and are never published.',
            'We never see or store your full card details. Payments are handled entirely by our payment providers.',
          ],
        },
        {
          heading: 'Your choices',
          body: [
            'You may unsubscribe from the newsletter at any time.',
            'To request a copy of your data, or its deletion, contact client care.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms of Sale',
      intro: 'The terms on which Miyenka sells ready-to-wear and bespoke pieces.',
      sections: [
        {
          heading: 'Pricing and currency',
          body: [
            'Prices are set in Nigerian Naira. Prices displayed in other currencies are converted for reference using a stored exchange rate, and the rate applied to your order is fixed at the moment you pay.',
          ],
        },
        {
          heading: 'Availability',
          body: [
            'Stock is confirmed at the point your payment is verified, not when a piece is added to your bag. In the rare event that a piece sells out between those moments, client care will contact you directly to arrange an alternative or a resolution.',
          ],
        },
        {
          heading: 'Bespoke commissions',
          body: [
            'A bespoke commission is confirmed when the quotation is paid. The quoted amount covers the piece as specified; changes requested after cutting begins may require a revised quotation.',
          ],
        },
        {
          heading: 'Cancellation',
          body: [`See our Returns & Cancellation policy. The standard cancellation window is ${hours} hours.`],
        },
      ],
    },
  };
}

const SLUGS = ['returns', 'shipping', 'privacy', 'terms'] as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getPublicSettings();
  const policy = buildPolicies(settings)[slug];
  if (!policy) return { title: 'Not found' };

  return {
    title: policy.title,
    description: policy.intro,
    alternates: { canonical: `/policies/${slug}` },
  };
}

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const settings = await getPublicSettings();
  const policy = buildPolicies(settings)[slug];
  if (!policy) notFound();

  return (
    <article className="shell max-w-3xl py-14 lg:py-20">
      <header>
        <p className="eyebrow">Miyenka</p>
        <h1 className="display-lg mt-4">{policy.title}</h1>
        <span className="rule-gold mt-6 block bg-gradient-to-r from-gold to-gold/0" />
        <p className="mt-6 text-[0.95rem] leading-relaxed text-ink-muted">{policy.intro}</p>
      </header>

      <div className="mt-14 space-y-12">
        {policy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl font-light">{section.heading}</h2>
            <div className="mt-4 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-16 border-t border-ink/10 pt-8 text-xs text-ink-faint">
        Questions about any of this? Client care is on WhatsApp and answers directly.
      </p>
    </article>
  );
}
