import { notFound } from 'next/navigation';
import { DashboardView } from '@/components/admin/DashboardView';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminDashboardPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <DashboardView locale={locale} dict={dict} />;
}
