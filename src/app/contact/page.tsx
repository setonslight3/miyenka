import type { Metadata } from 'next';
import Link from 'next/link';
import { getWhatsappContacts } from '@/lib/commerce/settings';
import { careMessage, whatsappUrl } from '@/lib/commerce/whatsapp';

export const metadata: Metadata = {
  title: 'Contact & Customer Care',
  description: 'Reach the Miyenka client care team on WhatsApp, or by email.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const contacts = await getWhatsappContacts();

  return (
    <div className="shell max-w-4xl py-14 lg:py-20">
      <header className="text-center">
        <p className="eyebrow">We are here</p>
        <h1 className="display-lg mt-4">Client Care</h1>
        <span className="rule-gold mx-auto mt-6 block" />
        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-ink-muted">
          For sizing, fabric, occasion dressing, an existing order or a bespoke commission — talk
          to us directly.
        </p>
      </header>

      {contacts.length ? (
        <section className="mt-14">
          <h2 className="text-center text-[0.62rem] uppercase tracking-luxe text-ink-faint">
            WhatsApp
          </h2>
          <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            {contacts.map((contact) => (
              <a
                key={contact.id}
                href={whatsappUrl(contact.phone_e164, contact.greeting ?? careMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-ink/15 p-7 text-center transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-cream"
              >
                <p className="font-display text-2xl font-light">{contact.label}</p>
                <p className="mt-2 text-xs text-ink-faint group-hover:text-cream/60">
                  Message us on WhatsApp
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-16 grid gap-10 border-t border-ink/10 pt-14 sm:grid-cols-3">
        {[
          { term: 'Orders', body: 'Track an existing order or check its status.', href: '/track-order', cta: 'Track order' },
          { term: 'Bespoke', body: 'Commission a piece cut to your measurements.', href: '/custom', cta: 'Start a request' },
          { term: 'Sizing', body: 'Body measurements in inches and centimetres.', href: '/sizing', cta: 'View chart' },
        ].map((item) => (
          <div key={item.term}>
            <h2 className="text-[0.62rem] uppercase tracking-luxe text-gold-deep">{item.term}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.body}</p>
            <Link
              href={item.href}
              className="mt-4 inline-block border-b border-ink pb-0.5 text-[0.65rem] uppercase tracking-wide transition-colors hover:border-gold hover:text-gold-deep"
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
