import Link from 'next/link';
import { brand } from '@/config/brand';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { asset } from '@/lib/asset';
import { Stars } from '@/components/ui/Stars';

export const Hero = ({ locale, dict }: { locale: Locale; dict: Dictionary }) => (
  <section className="relative overflow-hidden">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-40 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--c-primary)/0.16),transparent_70%)]"
    />
    <div className="container relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-20">
      <div className="animate-fade-up space-y-6">
        <p className="pill">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          {dict.home.hero.eyebrow}
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-[1.3] tracking-tight sm:text-5xl lg:text-6xl">
          {dict.home.hero.title}
        </h1>
        <p className="max-w-xl text-pretty text-base leading-8 text-muted sm:text-lg">
          {dict.home.hero.subtitle}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={localePath(locale, 'book')}
            className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-ink shadow-soft transition hover:brightness-105"
          >
            {dict.home.hero.primaryCta}
          </Link>
          <Link
            href={`${localePath(locale)}/#services`}
            className="inline-flex h-12 items-center rounded-full border border-line px-6 text-sm transition hover:bg-elevated"
          >
            {dict.home.hero.secondaryCta}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Stars rating={4.9} className="text-accent" />
            <span className="font-medium text-ink">4.9</span>
            <span>
              {dict.home.hero.rating} · {brand.demo.smsCode === '1234' ? '312' : ''}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {brand.contact.address[locale]}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-primary-soft/60 blur-2xl" aria-hidden />
        <div className="overflow-hidden rounded-[1.75rem] border border-line/80 shadow-lift">
          <img
            src={asset('/images/hero-salon.jpg')}
            alt={brand.salonName[locale]}
            className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[480px]"
            loading="eager"
          />
        </div>

        <div className="card absolute -bottom-6 start-4 w-[min(19rem,calc(100%-2rem))] p-4 sm:start-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted">{dict.nav.book}</p>
              <p className="text-sm font-semibold">{dict.home.hero.openToday}</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-success/10 text-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['10:00', '10:45', '11:30'].map((time) => (
              <span
                key={time}
                className="rounded-lg border border-line/70 bg-elevated/70 px-2 py-1 text-[11px] tabular-nums text-muted"
                dir="ltr"
              >
                {time}
              </span>
            ))}
            <Link
              href={localePath(locale, 'book')}
              className="rounded-lg bg-primary-soft px-2 py-1 text-[11px] font-medium text-primary"
            >
              {dict.home.hero.primaryCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  </section>
);
