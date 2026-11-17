import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Hero } from '@/components/home/Hero';
import { HomeSections } from '@/components/home/HomeSections';
import { isLocale, localePath, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = {
  params: { locale: string };
};

export default function HomePage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <HomeSections locale={locale} dict={dict} />

      <section className="container pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-line/70 bg-gradient-to-br from-primary-soft via-surface to-accent-soft/60 px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="mx-auto max-w-xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dict.home.cta.title}</h2>
            <p className="text-sm text-muted">{dict.home.cta.subtitle}</p>
            <div className="pt-2">
              <Link
                href={localePath(locale, 'book')}
                className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-medium text-primary-ink shadow-soft transition hover:brightness-105"
              >
                {dict.home.cta.button}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
