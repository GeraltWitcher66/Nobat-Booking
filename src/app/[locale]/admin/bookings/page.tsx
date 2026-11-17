import { notFound } from 'next/navigation';
import { BookingsTable } from '@/components/admin/BookingsTable';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminBookingsPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <BookingsTable locale={locale} dict={dict} />;
}
