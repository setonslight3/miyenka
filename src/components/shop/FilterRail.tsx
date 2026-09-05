'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SIZE_CODES } from '@/lib/commerce/sizing';
import { cn } from '@/lib/utils/cn';

export type FilterOption = { slug: string; name: string };

const PRICE_BANDS = [
  { label: 'Under ₦400,000', max: 40_000_000 },
  { label: '₦400,000 – ₦600,000', min: 40_000_000, max: 60_000_000 },
  { label: '₦600,000 – ₦900,000', min: 60_000_000, max: 90_000_000 },
  { label: 'Above ₦900,000', min: 90_000_000 },
];

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
];

export function FilterRail({
  collections,
  categories,
  colors,
  resultCount,
}: {
  collections: FilterOption[];
  categories: FilterOption[];
  colors: { name: string; hex: string | null }[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [openOnMobile, setOpenOnMobile] = useState(false);

  /** Writes a filter into the URL, so every filtered view is shareable. */
  const apply = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const active = (key: string, value: string) => params.get(key) === value;
  const hasFilters = ['collection', 'category', 'size', 'color', 'min', 'max', 'type'].some((key) =>
    params.has(key),
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4 border-b border-ink/10 pb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpenOnMobile((value) => !value)}
          aria-expanded={openOnMobile}
          className="text-[0.68rem] uppercase tracking-luxe"
        >
          {openOnMobile ? 'Hide filters' : 'Filters'}
        </button>
        <span className="text-xs text-ink-faint">{resultCount} pieces</span>
      </div>

      <aside
        aria-label="Product filters"
        className={cn('lg:block', openOnMobile ? 'block' : 'hidden')}
      >
        <div className="hidden items-baseline justify-between lg:flex">
          <h2 className="eyebrow">Refine</h2>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => router.push(pathname, { scroll: false })}
              className="text-[0.62rem] uppercase tracking-wide text-ink-faint underline-offset-4 hover:text-burgundy hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <FilterGroup label="Sort">
          <select
            aria-label="Sort products"
            value={params.get('sort') ?? 'featured'}
            onChange={(event) => apply({ sort: event.target.value })}
            className="w-full border border-ink/15 bg-transparent px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Collection">
          {collections.map((collection) => (
            <FilterPill
              key={collection.slug}
              active={active('collection', collection.slug)}
              onClick={() =>
                apply({ collection: active('collection', collection.slug) ? null : collection.slug })
              }
            >
              {collection.name}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Silhouette">
          {categories.map((category) => (
            <FilterPill
              key={category.slug}
              active={active('category', category.slug)}
              onClick={() =>
                apply({ category: active('category', category.slug) ? null : category.slug })
              }
            >
              {category.name}
            </FilterPill>
          ))}
        </FilterGroup>

        <FilterGroup label="Size">
          <div className="flex flex-wrap gap-2">
            {SIZE_CODES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => apply({ size: active('size', size) ? null : size })}
                aria-pressed={active('size', size)}
                className={cn(
                  'h-10 min-w-10 border px-3 text-xs transition-colors duration-300',
                  active('size', size)
                    ? 'border-ink bg-ink text-cream'
                    : 'border-ink/15 hover:border-ink',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </FilterGroup>

        {colors.length ? (
          <FilterGroup label="Colour">
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => apply({ color: active('color', color.name) ? null : color.name })}
                  aria-pressed={active('color', color.name)}
                  aria-label={color.name}
                  title={color.name}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-transform duration-300 hover:scale-110',
                    active('color', color.name) ? 'border-gold' : 'border-ink/15',
                  )}
                  style={{ backgroundColor: color.hex ?? '#DDD6CC' }}
                />
              ))}
            </div>
          </FilterGroup>
        ) : null}

        <FilterGroup label="Price">
          {PRICE_BANDS.map((band) => {
            const isActive =
              params.get('min') === String(band.min ?? '') && params.get('max') === String(band.max ?? '');
            return (
              <FilterPill
                key={band.label}
                active={isActive}
                onClick={() =>
                  apply({
                    min: isActive || band.min === undefined ? null : String(band.min),
                    max: isActive || band.max === undefined ? null : String(band.max),
                  })
                }
              >
                {band.label}
              </FilterPill>
            );
          })}
        </FilterGroup>

        <FilterGroup label="Made">
          <FilterPill
            active={active('type', 'ready_to_wear')}
            onClick={() => apply({ type: active('type', 'ready_to_wear') ? null : 'ready_to_wear' })}
          >
            Ready-to-Wear
          </FilterPill>
          <FilterPill
            active={active('type', 'custom')}
            onClick={() => apply({ type: active('type', 'custom') ? null : 'custom' })}
          >
            Made to Order
          </FilterPill>
        </FilterGroup>
      </aside>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-ink/10 py-6">
      <h3 className="mb-4 text-[0.62rem] uppercase tracking-luxe text-ink-faint">{label}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'self-start text-left text-sm transition-colors duration-300',
        active ? 'text-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      <span className={cn('border-b pb-0.5', active ? 'border-gold' : 'border-transparent')}>
        {children}
      </span>
    </button>
  );
}

