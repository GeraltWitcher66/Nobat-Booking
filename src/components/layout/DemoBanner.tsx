'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/config/brand';

const STORAGE_KEY = `${brand.slug}.demo-banner.dismissed`;

type DemoBannerProps = {
  text: string;
  closeLabel: string;
};

export function DemoBanner({ text, closeLabel }: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-ink text-bg">
      <div className="container flex items-center justify-center gap-3 py-2 text-center text-[11px] leading-5 sm:text-xs">
        <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
        <p>{text}</p>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, '1');
            setDismissed(true);
          }}
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-bg/70 transition hover:bg-bg/10 hover:text-bg"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
