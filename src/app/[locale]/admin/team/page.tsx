import { notFound } from 'next/navigation';
import { TeamManager } from '@/components/admin/TeamManager';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminTeamPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <TeamManager locale={locale} dict={dict} />;
}
