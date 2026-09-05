import type { Metadata } from 'next';

import { OrderDetail } from '@/components/cart/OrderDetail';
import { GuestOrderGate } from '@/components/cart/GuestOrderGate';
import { canCancel, loadOrderForViewer } from '@/lib/commerce/order-lookup';
import { getWhatsappContacts } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Your Order',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type Params = Promise<{ orderNumber: string }>;
type Search = Promise<{ email?: string | string[] }>;

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { orderNumber } = await params;
  const search = await searchParams;
  const email = Array.isArray(search.email) ? search.email[0] : search.email;

  const order = await loadOrderForViewer(orderNumber, email);

  if (!order) {
    // Distinguish "needs to prove ownership" from "does not exist" only as far
    // as offering the email gate; we never confirm whether the number is real.
    return <GuestOrderGate orderNumber={orderNumber} />;
  }

  const [cancellable, contacts] = await Promise.all([canCancel(order.id), getWhatsappContacts()]);

  return <OrderDetail order={order} cancellable={cancellable} careContacts={contacts} />;
}
