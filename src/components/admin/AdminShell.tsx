'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { brand } from '@/config/brand';
import { clearSession } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/use-session';
import { cn } from '@/lib/cn';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LoginForm } from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/Skeleton';

type Props = { locale: Locale; dict: Dictionary; children: React.ReactNode };

export function AdminShell({ locale, dict, children }: Props) {
  const { session, ready } = useSession();
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);

  if (!ready) {
    return (
      <div className="container py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (session?.role !== 'admin') {
    return (
      <div className="container flex max-w-md flex-col gap-4 py-10">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dict.admin.title}</h1>
          <p className="text-xs text-muted">{dict.auth.notAuthorized}</p>
        </div>
        <div className="card p-5">
          <LoginForm locale={locale} dict={dict} initialTab="staff" compact />
        </div>
      </div>
    );
  }

  const base = localePath(locale, 'admin');
  const items = [
    { href: base, label: dict.nav.dashboard, exact: true },
    { href: `${base}/calendar`, label: dict.nav.calendar },
    { href: `${base}/bookings`, label: dict.nav.bookings },
    { href: `${base}/customers`, label: dict.nav.customers },
    { href: `${base}/services`, label: dict.nav.catalog },
    { href: `${base}/team`, label: dict.nav.teamManagement },
    { href: `${base}/settings`, label: dict.nav.settings },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname.replace(/\/$/, '') === href.replace(/\/$/, '') : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            'rounded-xl px-3 py-2 text-sm transition',
            isActive(item.href, item.exact)
              ? 'bg-primary-soft font-medium text-primary'
              : 'text-muted hover:bg-elevated hover:text-ink',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="container py-6">
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {dict.nav.menu}
        </button>
        <span className="text-xs text-muted">{dict.admin.title}</span>
      </div>

      {open && <div className="mb-4 rounded-2xl border border-line bg-surface p-2 lg:hidden">{nav}</div>}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-ink">
                {brand.logo.mark[locale]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{brand.salonName[locale]}</p>
                <p className="truncate text-[10px] text-muted">{dict.admin.title}</p>
              </div>
            </div>
            {nav}
            <div className="rounded-2xl border border-line bg-elevated/40 p-3 text-[11px] text-muted">
              <p className="mb-2 font-medium text-ink">{session.name}</p>
              <div className="flex items-center justify-between gap-2">
                <LanguageSwitcher locale={locale} label={dict.nav.language} />
                <ThemeToggle label={dict.nav.theme} />
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <Link href={localePath(locale)} className="transition hover:text-primary">
                  {dict.nav.home}
                </Link>
                <button
                  type="button"
                  onClick={() => clearSession()}
                  className="text-start transition hover:text-danger"
                >
                  {dict.nav.logout}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
