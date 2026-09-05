import { cn } from '@/lib/utils/cn';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="display-lg text-balance max-w-2xl">{title}</h2>
      <span className={cn('rule-gold', align === 'left' && 'bg-gradient-to-r from-gold to-gold/0')} />
      {description ? (
        <p className="max-w-xl text-[0.95rem] leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
