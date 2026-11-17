'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';

type LanguageSwitcherProps = {
  locale: Locale;
  label: string;
};

export function LanguageSwitcher({ locale, label }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? '';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const path = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const rest = path.replace(/^\/(fa|en)(?=\/|$)/, '');

  return (
    <div
      className="flex items-center rounded-full border border-line/80 bg-elevated/60 p-0.5 text-xs"
      aria-label={label}
      role="group"
    >
      {locales.map((item) => {
        const active = item === locale;
        return (
          <Link
            key={item}
            href={`/${item}${rest}`}
            aria-current={active ? 'true' : undefined}
            className={`rounded-full px-2.5 py-1 font-medium uppercase tracking-wide transition ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {item}
          </Link>
        );
      })}
    </div>
  );
}
