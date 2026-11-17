import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function BookPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <Suspense
      fallback={<div className="container max-w-3xl py-10 text-sm text-muted">{dict.common.loading}</div>}
    >
      <BookingWizard locale={locale} dict={dict} />
    </Suspense>
  );
}
