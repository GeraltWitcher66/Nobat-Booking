import { notFound } from 'next/navigation';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminSettingsPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <SettingsForm locale={locale} dict={dict} />;
}
