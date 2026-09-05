/**
 * Size chart. UK dress sizes mapped to Miyenka's XS–XXL run, with body
 * measurements in both inches and centimetres.
 */

export const SIZE_CODES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type SizeCode = (typeof SIZE_CODES)[number];

export type SizeRow = {
  code: SizeCode;
  uk: number;
  bustIn: number;
  waistIn: number;
  hipsIn: number;
};

export const SIZE_CHART: SizeRow[] = [
  { code: 'XS', uk: 6, bustIn: 31.5, waistIn: 24, hipsIn: 34 },
  { code: 'S', uk: 8, bustIn: 33.5, waistIn: 26, hipsIn: 36 },
  { code: 'M', uk: 10, bustIn: 35.5, waistIn: 28, hipsIn: 38 },
  { code: 'L', uk: 12, bustIn: 37.5, waistIn: 30, hipsIn: 40 },
  { code: 'XL', uk: 14, bustIn: 39.5, waistIn: 32, hipsIn: 42 },
  { code: 'XXL', uk: 16, bustIn: 41.5, waistIn: 34, hipsIn: 44 },
];

export const inchesToCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;
export const cmToInches = (cm: number) => Math.round((cm / 2.54) * 10) / 10;

export function sizeLabel(code: SizeCode): string {
  const row = SIZE_CHART.find((r) => r.code === code);
  return row ? `${code} · UK ${row.uk}` : code;
}
