import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import '../globals.css';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { brand } from '@/config/brand';
import { direction, isLocale, locales, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

const vazirmatn = localFont({
  src: [
    { path: '../../assets/fonts/vazirmatn-arabic.woff2', weight: '100 900', style: 'normal' },
    { path: '../../assets/fonts/vazirmatn-latin.woff2', weight: '100 900', style: 'normal' },
  ],
  variable: '--font-vazirmatn',
  display: 'swap',
  fallback: ['Tahoma', 'system-ui', 'sans-serif'],
});

const inter = localFont({
  src: [{ path: '../../assets/fonts/inter-latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LayoutProps = {
  children: React.ReactNode;
  params: { locale: string };
};

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale = isLocale(params.locale) ? params.locale : 'fa';
  return {
    title: {
      default: `${brand.salonName[locale]} — ${brand.name[locale]}`,
      template: `%s — ${brand.salonName[locale]}`,
    },
    description: brand.tagline[locale],
    applicationName: brand.name[locale],
    icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.svg` },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f3' },
    { media: '(prefers-color-scheme: dark)', color: '#14100e' },
  ],
};

// Applies the stored theme before paint so there is no flash of the wrong palette.
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('nobat.theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function LocaleLayout({ children, params }: LayoutProps) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <html lang={locale} dir={direction(locale)} className={`${vazirmatn.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <ToastProvider>
            <DemoBanner text={dict.banner.text} closeLabel={dict.banner.close} />
            <SiteHeader locale={locale} dict={dict} />
            <main className="flex-1">{children}</main>
            <SiteFooter locale={locale} dict={dict} />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
