/**
 * All money moves through the system in minor units (kobo for NGN, cents for
 * USD/GBP) as integers. Nothing is ever stored or totalled as a float.
 */

export type CurrencyCode = 'NGN' | 'USD' | 'GBP';

const CURRENCY_META: Record<CurrencyCode, { symbol: string; locale: string; minorUnits: number }> = {
  NGN: { symbol: '₦', locale: 'en-NG', minorUnits: 100 },
  USD: { symbol: '$', locale: 'en-US', minorUnits: 100 },
  GBP: { symbol: '£', locale: 'en-GB', minorUnits: 100 },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META) as CurrencyCode[];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCY_META;
}

/** Formats minor units for display. Whole amounts drop the decimals. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode = 'NGN',
  options: { showDecimals?: boolean } = {},
) {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.NGN;
  const major = minor / meta.minorUnits;
  const showDecimals = options.showDecimals ?? major % 1 !== 0;

  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(major);
}

/**
 * Converts a base-currency amount for display only.
 *
 * The order total is always charged in the base currency at the stored rate;
 * this is presentation, which is why it rounds rather than accumulating.
 */
export function convertMinor(baseMinor: number, rate: number): number {
  return Math.round(baseMinor * rate);
}

export function toMinor(major: number, currency: CurrencyCode = 'NGN'): number {
  return Math.round(major * (CURRENCY_META[currency]?.minorUnits ?? 100));
}

export function toMajor(minor: number, currency: CurrencyCode = 'NGN'): number {
  return minor / (CURRENCY_META[currency]?.minorUnits ?? 100);
}

export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCY_META[currency]?.symbol ?? '₦';
}
