'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { brand } from '@/config/brand';
import { getGallery, getReviews, getServices, getSettings, getStaff } from '@/lib/api';
import type { Currency, GalleryItem, Review, Service, Settings, Staff } from '@/types';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { asset } from '@/lib/asset';
import { formatDate, formatDuration, formatMoney, formatRating, formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Reveal } from '@/components/ui/Reveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stars } from '@/components/ui/Stars';

type Props = { locale: Locale; dict: Dictionary };

const CURRENCY_KEY = `${brand.slug}.currency`;

export function HomeSections({ locale, dict }: Props) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currency, setCurrency] = useState<Currency>('AED');
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getServices(), getStaff(), getReviews(), getGallery(), getSettings()]).then(
      ([serviceList, staffList, reviewList, galleryList, settingsValue]) => {
        if (!alive) return;
        setServices(serviceList.filter((service) => service.active));
        setStaff(staffList.filter((member) => member.active));
        setReviews(reviewList);
        setGallery(galleryList);
        setSettings(settingsValue);
      },
    );
    const stored = window.localStorage.getItem(CURRENCY_KEY) as Currency | null;
    if (stored === 'AED' || stored === 'IRR') setCurrency(stored);
    return () => {
      alive = false;
    };
  }, []);

  const changeCurrency = (next: Currency) => {
    setCurrency(next);
    window.localStorage.setItem(CURRENCY_KEY, next);
  };

  const averageRating = useMemo(
    () =>
      reviews.length === 0
        ? 0
        : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10,
    [reviews],
  );

  const staffMap = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  return (
    <>
      <section className="container pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: '8', label: dict.home.stats.services },
            { value: '3', label: dict.home.stats.specialists },
            { value: '300+', label: dict.home.stats.reviews },
            { value: '12', label: dict.home.stats.years },
          ].map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05}>
              <div className="card flex flex-col items-center gap-1 px-4 py-5 text-center">
                <span className="text-2xl font-semibold tracking-tight text-primary">{stat.value}</span>
                <span className="text-xs text-muted">{stat.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="services" className="container scroll-mt-24 py-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.services.title}</h2>
              <p className="max-w-xl text-sm text-muted">{dict.home.services.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-line bg-elevated/60 p-1 text-xs">
              {brand.currency.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeCurrency(option)}
                  className={cn(
                    'rounded-full px-3 py-1.5 transition',
                    currency === option ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {option === 'AED'
                    ? locale === 'fa'
                      ? 'درهم'
                      : 'AED'
                    : locale === 'fa'
                      ? 'تومان'
                      : 'IRR'}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!services &&
            Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="card overflow-hidden">
                <Skeleton className="h-36 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}

          {services?.map((service, index) => (
            <Reveal key={service.id} delay={Math.min(index * 0.04, 0.2)}>
              <article className="card group flex h-full flex-col overflow-hidden">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={asset(service.image)}
                    alt={service.name[locale]}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  {service.featured && (
                    <span className="absolute top-2 start-2 rounded-full bg-bg/85 px-2 py-0.5 text-[10px] font-medium text-ink backdrop-blur">
                      {locale === 'fa' ? 'محبوب' : 'Popular'}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-sm font-semibold">{service.name[locale]}</h3>
                  <p className="line-clamp-2 text-xs leading-6 text-muted">{service.description[locale]}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="text-xs text-muted">
                      <span className="block tabular-nums">{formatDuration(service.durationMin, locale)}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-ink">
                        {formatMoney(service.prices[currency], currency, locale)}
                      </span>
                    </div>
                    <Link
                      href={`${localePath(locale, 'book')}?service=${service.slug}`}
                      className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:brightness-95"
                    >
                      {dict.home.services.book}
                    </Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="team" className="scroll-mt-24 border-y border-line/60 bg-surface/50 py-14">
        <div className="container">
          <Reveal>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.team.title}</h2>
              <p className="text-sm text-muted">{dict.home.team.subtitle}</p>
            </div>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member, index) => (
              <Reveal key={member.id} delay={index * 0.06}>
                <article className="card flex h-full gap-4 p-5">
                  <img
                    src={asset(member.avatar)}
                    alt={member.name[locale]}
                    loading="lazy"
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{member.name[locale]}</h3>
                      <span className="pill shrink-0 gap-1 px-2 py-0.5 text-[10px]">
                        <Stars rating={member.rating} className="text-accent" />
                        {formatRating(member.rating, locale)}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{member.role[locale]}</p>
                    <p className="line-clamp-2 text-[11px] leading-5 text-muted">{member.bio[locale]}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {member.services.slice(0, 3).map((serviceId) => {
                        const service = services?.find((item) => item.id === serviceId);
                        if (!service) return null;
                        return (
                          <span
                            key={serviceId}
                            className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted"
                          >
                            {service.name[locale]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="container scroll-mt-24 py-14">
        <Reveal>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.gallery.title}</h2>
            <p className="text-sm text-muted">{dict.home.gallery.subtitle}</p>
          </div>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((item, index) => (
            <Reveal key={item.id} delay={index * 0.04}>
              <figure className="group relative overflow-hidden rounded-2xl border border-line/70">
                <img
                  src={asset(item.image)}
                  alt={item.caption[locale]}
                  loading="lazy"
                  className={cn(
                    'w-full object-cover transition duration-500 group-hover:scale-[1.03]',
                    index % 3 === 0 ? 'h-56 sm:h-64' : 'h-56',
                  )}
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-xs text-white opacity-0 transition group-hover:opacity-100">
                  {item.caption[locale]}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="reviews" className="scroll-mt-24 border-y border-line/60 bg-surface/50 py-14">
        <div className="container">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.reviews.title}</h2>
                <p className="text-sm text-muted">{dict.home.reviews.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5">
                <Stars rating={averageRating} className="text-accent" />
                <span className="text-xs font-medium">{formatRating(averageRating, locale)}</span>
                <span className="text-[11px] text-muted">
                  {dict.home.reviews.based} {reviews.length}
                </span>
              </div>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleReviews.map((review, index) => {
              const service = review.serviceId ? services?.find((item) => item.id === review.serviceId) : null;
              return (
                <Reveal key={review.id} delay={Math.min(index * 0.05, 0.25)}>
                  <article className="card flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={asset(review.avatar)}
                        alt={review.author[locale]}
                        loading="lazy"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{review.author[locale]}</p>
                        <p className="text-[10px] text-muted">{formatDate(review.date, locale)}</p>
                      </div>
                      <Stars rating={review.rating} className="text-accent" />
                    </div>
                    <p className="text-xs leading-6 text-muted">{review.text[locale]}</p>
                    {service && (
                      <span className="mt-auto w-fit rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted">
                        {service.name[locale]}
                      </span>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>

          {reviews.length > 6 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllReviews((value) => !value)}
                className="rounded-full border border-line bg-bg px-4 py-2 text-xs text-muted transition hover:text-ink"
              >
                {showAllReviews ? dict.common.showLess : dict.common.showMore}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="container py-14">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.map.title}</h2>
              <p className="text-sm text-muted">{dict.home.map.subtitle}</p>
              <div className="overflow-hidden rounded-2xl border border-line/80">
                <img
                  src={asset(brand.contact.mapImage)}
                  alt={dict.home.map.title}
                  loading="lazy"
                  className="h-64 w-full object-cover sm:h-80"
                />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card flex h-full flex-col gap-4 p-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">{dict.footer.contact}</p>
                <p className="mt-1 text-sm font-medium">{brand.contact.address[locale]}</p>
                <p className="mt-1 text-xs text-muted" dir="ltr">
                  {brand.contact.phone}
                </p>
              </div>

              <div className="hairline" />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">{dict.home.map.hours}</p>
                <ul className="space-y-1.5 text-xs">
                  {staffMap.size === 0 && <li className="text-muted">{dict.common.loading}</li>}
                  {staffMap.size > 0 &&
                    (
                      [
                        ['sat', 'شنبه', 'Saturday'],
                        ['sun', 'یکشنبه', 'Sunday'],
                        ['mon', 'دوشنبه', 'Monday'],
                        ['tue', 'سه‌شنبه', 'Tuesday'],
                        ['wed', 'چهارشنبه', 'Wednesday'],
                        ['thu', 'پنجشنبه', 'Thursday'],
                        ['fri', 'جمعه', 'Friday'],
                      ] as const
                    ).map(([key, fa, en]) => {
                      const starts = staff
                        .map((member) => member.schedule[key])
                        .filter((day): day is { start: string; end: string } => Boolean(day));
                      const first = starts.map((day) => day.start).sort()[0];
                      const last = starts.map((day) => day.end).sort().at(-1);
                      return (
                        <li key={key} className="flex items-center justify-between gap-2">
                          <span className="text-muted">{locale === 'fa' ? fa : en}</span>
                          {first && last ? (
                            <span className="tabular-nums" dir="ltr">
                              {formatTime(first, locale)} – {formatTime(last, locale)}
                            </span>
                          ) : (
                            <span className="text-muted/70">{dict.home.map.closed}</span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <a
                  href={brand.contact.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-full border border-line px-4 text-xs transition hover:bg-elevated"
                >
                  {dict.home.map.directions}
                </a>
                <Link
                  href={localePath(locale, 'book')}
                  className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-xs font-medium text-primary-ink"
                >
                  {dict.nav.book}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {settings && (
          <p className="mt-6 text-center text-[11px] text-muted">{settings.cancellation.policy[locale]}</p>
        )}
      </section>
    </>
  );
}
