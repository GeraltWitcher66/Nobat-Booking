import { notFound } from 'next/navigation';
import { StaffPanel } from '@/components/staff/StaffPanel';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function StaffPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <StaffPanel locale={locale} dict={dict} />;
}
