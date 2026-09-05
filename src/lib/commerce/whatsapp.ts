/**
 * Builds a wa.me deep link. The number always comes from admin settings —
 * never hard-coded — so customer care can be re-pointed without a deploy.
 */
export function whatsappUrl(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/[^\d]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export function careMessage(context?: string): string {
  return context
    ? `Hello Miyenka, I would like some help with ${context}.`
    : 'Hello Miyenka, I would like some help.';
}
