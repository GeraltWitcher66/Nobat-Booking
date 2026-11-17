import { notFound } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

type PageProps = { params: { locale: string } };

export default function LoginPage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <div className="container flex max-w-md flex-col gap-5 py-10 sm:py-14">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.auth.title}</h1>
        <p className="text-xs text-muted">{dict.auth.subtitle}</p>
      </div>
      <div className="card p-5">
        <LoginForm locale={locale} dict={dict} />
      </div>
      <p className="text-center text-[11px] text-muted">{dict.auth.demoNote}</p>
    </div>
  );
}
