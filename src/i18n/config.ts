export const locales = ['fa', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fa';

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const direction = (locale: Locale): 'rtl' | 'ltr' => (locale === 'fa' ? 'rtl' : 'ltr');

/** Path of a route inside the app, without the deployment basePath. */
export const localePath = (locale: Locale, path = '/'): string => {
  const clean = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  return `/${locale}${clean}`;
};
