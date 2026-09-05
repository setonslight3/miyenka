'use client';

import { useState } from 'react';
import { careMessage, whatsappUrl } from '@/lib/commerce/whatsapp';

export type CareContact = { id: string; label: string; phone_e164: string; greeting: string | null };

/**
 * One active number opens WhatsApp directly. Two or more present a chooser,
 * per the customer-care specification. Numbers come from admin settings.
 */
export function WhatsappLauncher({ contacts, context }: { contacts: CareContact[]; context?: string }) {
  const [open, setOpen] = useState(false);

  if (!contacts.length) return null;

  const linkFor = (contact: CareContact) =>
    whatsappUrl(contact.phone_e164, contact.greeting ?? careMessage(context));

  if (contacts.length === 1) {
    return (
      <a
        href={linkFor(contacts[0])}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Miyenka customer care on WhatsApp"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-500 ease-silk hover:scale-105"
      >
        <WhatsappIcon />
      </a>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div
          role="dialog"
          aria-label="Choose a customer care line"
          className="mb-3 w-64 border border-ink/10 bg-cream p-4 shadow-xl"
        >
          <p className="eyebrow mb-3">Customer Care</p>
          <ul className="space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <a
                  href={linkFor(contact)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-ink/10 px-4 py-3 text-sm transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-cream"
                >
                  {contact.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Chat with Miyenka customer care on WhatsApp"
        className="ml-auto grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-500 ease-silk hover:scale-105"
      >
        <WhatsappIcon />
      </button>
    </div>
  );
}

const WhatsappIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.06c-.25.69-1.43 1.32-1.98 1.4-.53.08-1.19.11-1.92-.12-.44-.14-1.01-.33-1.74-.64-3.06-1.32-5.06-4.4-5.21-4.6-.15-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.61-.38.81-.38.2 0 .41 0 .58.01.19.01.44-.07.69.53.25.6.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.31.39-.45.53-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.36 1.46.3.15.47.13.64-.08.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.71.81 2 .96.3.15.5.22.57.35.08.13.08.74-.17 1.43Z" />
  </svg>
);
