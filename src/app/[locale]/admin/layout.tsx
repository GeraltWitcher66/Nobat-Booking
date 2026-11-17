import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type LayoutProps = { params: { locale: string }; children: React.ReactNode };

export default function AdminLayout({ params, children }: LayoutProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <AdminShell locale={locale} dict={dict}>
      {children}
    </AdminShell>
  );
}
