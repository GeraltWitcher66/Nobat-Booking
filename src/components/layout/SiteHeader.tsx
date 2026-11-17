'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { brand } from '@/config/brand';
import { useSession } from '@/lib/auth/use-session';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export function SiteHeader({ locale, dict }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: dict.nav.services, href: '#services' },
    { label: dict.nav.team, href: '#team' },
    { label: dict.nav.gallery, href: '#gallery' },
    { label: dict.nav.reviews, href: '#reviews' },
    { label: dict.nav.contact, href: '#contact' },
  ];

  const accountHref = session
    ? session.role === 'admin'
      ? localePath(locale, 'admin')
      : session.role === 'staff'
        ? localePath(locale, 'staff')
        : localePath(locale, 'account')
    : localePath(locale, 'login');

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        scrolled ? 'border-line/70 bg-bg/90 backdrop-blur-md' : 'border-transparent bg-bg/60 backdrop-blur',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href={localePath(locale)} className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-base font-semibold text-primary-ink shadow-soft transition group-hover:brightness-105">
            {brand.logo.mark[locale]}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">{brand.salonName[locale]}</span>
            <span className="hidden text-[11px] text-muted sm:block">{brand.tagline[locale]}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={`${localePath(locale)}/${link.href}`}
              className="rounded-full px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle label={dict.nav.theme} />
          <div className="hidden sm:block">
            <LanguageSwitcher locale={locale} label={dict.nav.language} />
          </div>
          <Link
            href={accountHref}
            className="hidden h-9 items-center rounded-full border border-line px-3 text-xs font-medium text-ink transition hover:bg-elevated sm:inline-flex"
          >
            {session ? dict.nav.account : dict.nav.login}
          </Link>
          <Link
            href={localePath(locale, 'book')}
            className="hidden h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-ink shadow-soft transition hover:brightness-105 sm:inline-flex"
          >
            {dict.nav.book}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={dict.nav.menu}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full border border-line/80 text-muted transition hover:text-ink lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line/70 bg-bg lg:hidden">
          <div className="container flex flex-col gap-1 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={`${localePath(locale)}/${link.href}`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-elevated hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-line/70" />
            <div className="flex items-center justify-between px-1 pb-2">
              <LanguageSwitcher locale={locale} label={dict.nav.language} />
              <Link
                href={accountHref}
                onClick={() => setOpen(false)}
                className="rounded-full border border-line px-3 py-1.5 text-xs"
              >
                {session ? dict.nav.account : dict.nav.login}
              </Link>
            </div>
            <Link
              href={localePath(locale, 'book')}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-ink"
            >
              {dict.nav.book}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
