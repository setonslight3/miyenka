'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

export function SearchField({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = value.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  }

  return (
    <form onSubmit={onSubmit} role="search" className={cn('flex gap-3', className)}>
      <label htmlFor="site-search" className="sr-only">
        Search the collection
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search dresses, colours, collections…"
        className="flex-1 border-b border-ink/25 bg-transparent px-1 py-3 text-sm focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        className="border border-ink px-7 py-3 text-[0.68rem] uppercase tracking-luxe transition-colors duration-500 hover:bg-ink hover:text-cream"
      >
        Search
      </button>
    </form>
  );
}
