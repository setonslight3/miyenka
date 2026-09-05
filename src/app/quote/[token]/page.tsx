import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuotePanel } from '@/components/product/QuotePanel';
import { isQuoteExpired, isQuotePayable, loadQuoteByToken } from '@/lib/commerce/bespoke';
import { availableProviders } from '@/lib/payments';
import { getWhatsappContacts } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Your Bespoke Quotation',
  // The token in the URL is the credential, so this page must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await loadQuoteByToken(token);

  if (!quote) notFound();

  const [providers, contacts] = await Promise.all([
    Promise.resolve(availableProviders()),
    getWhatsappContacts(),
  ]);

  return (
    <QuotePanel
      quote={quote}
      payable={isQuotePayable(quote)}
      expired={isQuoteExpired(quote)}
      providers={providers}
      careContacts={contacts}
    />
  );
}
