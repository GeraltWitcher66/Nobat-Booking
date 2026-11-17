import { notFound } from 'next/navigation';
import { AdminCalendar } from '@/components/admin/AdminCalendar';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminCalendarPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <AdminCalendar locale={locale} dict={dict} />;
}
