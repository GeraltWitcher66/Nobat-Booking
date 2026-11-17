import { notFound } from 'next/navigation';
import { CustomerPortal } from '@/components/account/CustomerPortal';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function AccountPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return <CustomerPortal locale={locale} dict={dict} />;
}
