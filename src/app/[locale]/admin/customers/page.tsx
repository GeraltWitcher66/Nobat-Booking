import { notFound } from 'next/navigation';
import { CustomerList } from '@/components/admin/CustomerList';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AdminCustomersPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <CustomerList locale={locale} dict={dict} />;
}
