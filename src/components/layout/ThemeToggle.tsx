'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={cn('p-2 text-ink-muted transition-colors hover:text-ink', className)}
      >
        <span className="block h-[19px] w-[19px]" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'group flex items-center gap-2 p-2 text-ink-muted transition-colors hover:text-ink focus-visible:ring-1 focus-visible:ring-gold',
        className,
      )}
    >
      {isDark ? (
        <svg
          width={19}
          height={19}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-500 ease-silk group-hover:rotate-45 text-gold"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width={19}
          height={19}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-500 ease-silk group-hover:-rotate-12"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
      {showLabel ? (
        <span className="text-xs uppercase tracking-wide">
          {isDark ? 'Light' : 'Dark'}
        </span>
      ) : null}
    </button>
  );
}
