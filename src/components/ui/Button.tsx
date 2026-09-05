import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-cream hover:bg-ink-soft border border-ink',
  secondary: 'bg-transparent text-ink border border-ink/25 hover:border-ink hover:bg-ink hover:text-cream',
  ghost: 'bg-transparent text-ink border border-transparent hover:border-ink/20',
  gold: 'bg-gold text-ink border border-gold hover:bg-gold-deep hover:text-cream',
  danger: 'bg-burgundy text-cream border border-burgundy hover:bg-burgundy-bright',
};

const SIZES: Record<Size, string> = {
  sm: 'px-4 py-2 text-[0.68rem]',
  md: 'px-7 py-3 text-[0.72rem]',
  lg: 'px-10 py-4 text-[0.78rem]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 font-sans uppercase tracking-luxe ' +
  'transition-all duration-500 ease-silk disabled:opacity-40 disabled:pointer-events-none';

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: React.ReactNode };

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}
