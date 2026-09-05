'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/components/cart/CartProvider';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections/modern-muse', label: 'Modern Muse' },
  { href: '/collections/classic-sophisticate', label: 'Classic Sophisticate' },
  { href: '/new-arrivals', label: 'New Arrivals' },
  { href: '/custom', label: 'Bespoke' },
  { href: '/about', label: 'About' },
];

export function Header({ announcement }: { announcement?: { message: string; href?: string } | null }) {
  const pathname = usePathname();
  const { count, hydrated, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      {announcement?.message ? (
        <div className="bg-ink text-cream">
          <div className="shell flex items-center justify-center py-2.5">
            <p className="text-center text-[0.65rem] uppercase tracking-luxe">
              {announcement.href ? (
                <Link href={announcement.href} className="hover:text-gold transition-colors">
                  {announcement.message}
                </Link>
              ) : (
                announcement.message
              )}
            </p>
          </div>
        </div>
      ) : null}

      <header
        className={cn(
          'sticky top-0 z-50 border-b transition-all duration-500 ease-silk',
          scrolled
            ? 'border-ink/10 bg-cream/95 backdrop-blur-md'
            : 'border-transparent bg-cream/70 backdrop-blur-sm',
        )}
      >
        <div className="shell flex items-center justify-between gap-6 py-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="lg:hidden -ml-1 p-2"
          >
            <MenuIcon />
          </button>

          <Logo className="lg:flex-none" size={38} />

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-8">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative text-[0.68rem] uppercase tracking-wide transition-colors duration-300',
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      'absolute -bottom-1.5 left-0 h-px bg-gold transition-all duration-500 ease-silk',
                      active ? 'w-full' : 'w-0',
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/search" aria-label="Search" className="p-2 text-ink-muted hover:text-ink transition-colors">
              <SearchIcon />
            </Link>
            <Link href="/wishlist" aria-label="Wishlist" className="p-2 text-ink-muted hover:text-ink transition-colors">
              <HeartIcon />
            </Link>
            <Link href="/account" aria-label="Account" className="hidden sm:block p-2 text-ink-muted hover:text-ink transition-colors">
              <UserIcon />
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label={`Cart, ${hydrated ? count : 0} item${count === 1 ? '' : 's'}`}
              className="relative p-2 text-ink-muted hover:text-ink transition-colors"
            >
              <BagIcon />
              {hydrated && count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.6rem] font-medium text-ink">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] lg:hidden transition-opacity duration-500',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-cream px-7 py-7 transition-transform duration-500 ease-silk',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between">
            <Logo size={34} />
            <button type="button" onClick={closeMenu} aria-label="Close menu" className="p-2">
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-1">
            {[...NAV, { href: '/account', label: 'Account' }, { href: '/track-order', label: 'Track Order' }].map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="border-b border-ink/8 py-4 font-display text-2xl font-light transition-colors hover:text-gold-deep"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

const iconProps = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const MenuIcon = () => (
  <svg {...iconProps}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
const CloseIcon = () => (
  <svg {...iconProps}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const SearchIcon = () => (
  <svg {...iconProps}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const HeartIcon = () => (
  <svg {...iconProps}><path d="M20.8 8.6a4.6 4.6 0 0 0-7.8-2.5L12 7.1l-1-1A4.6 4.6 0 0 0 3.2 8.6c0 4.1 5.6 7.9 8.8 10.6 3.2-2.7 8.8-6.5 8.8-10.6Z" /></svg>
);
const UserIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
);
const BagIcon = () => (
  <svg {...iconProps}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8" /></svg>
);
