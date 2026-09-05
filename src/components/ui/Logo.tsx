import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export function Logo({
  className,
  showWordmark = true,
  size = 44,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <Link
      href="/"
      aria-label="Miyenka — home"
      className={cn('group inline-flex items-center gap-3', className)}
    >
      <Image
        src="/brand/miyenka-logo-gold.png"
        alt=""
        width={size}
        height={size}
        priority
        className="h-auto w-auto object-contain transition-transform duration-700 ease-silk group-hover:scale-105"
        style={{ height: size, width: 'auto' }}
      />
      {showWordmark ? (
        <span className="font-display text-xl tracking-[0.3em] uppercase leading-none">
          Miyenka
        </span>
      ) : null}
    </Link>
  );
}
