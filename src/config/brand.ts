/**
 * Brand configuration — the single place to rebrand the product for a new client.
 *
 * Change the name, logo mark, copy, contact details and palette here; the Tailwind
 * theme, metadata and every screen read from this file.
 */

export type Localized<T = string> = { fa: T; en: T };

/** Colours are stored as `R G B` triplets so Tailwind can apply opacity modifiers. */
export type Palette = {
  bg: string;
  surface: string;
  elevated: string;
  ink: string;
  muted: string;
  line: string;
  primary: string;
  primarySoft: string;
  primaryInk: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
};

export const brand = {
  /** Used in package names, keys and analytics-free storage keys. */
  slug: 'nobat',
  name: { fa: 'نوبت', en: 'Nobat' } satisfies Localized,
  /** Name of the demo business shown across the product. */
  salonName: { fa: 'کلینیک آبنوس', en: 'Abnous Clinic' } satisfies Localized,
  tagline: {
    fa: 'کلینیک پوست، مو و زیبایی در دبی',
    en: 'Skin, hair and beauty clinic in Dubai',
  } satisfies Localized,
  /** Logo lockup: the mark is rendered in a rounded badge next to the wordmark. */
  logo: {
    mark: { fa: 'آ', en: 'A' } satisfies Localized,
  },
  contact: {
    phone: '+971 4 555 0192',
    phoneHref: 'tel:+97145550192',
    whatsapp: 'https://wa.me/97145550192',
    email: 'hello@abnous.studio',
    address: { fa: 'دبی، جمیرا، خیابان ۱۲، پلاک ۲۴', en: '24 Street 12, Jumeirah, Dubai' } satisfies Localized,
    /** Static map image lives in /public; swap for an iframe embed when needed. */
    mapImage: '/images/map.jpg',
    mapLink: 'https://maps.google.com/?q=Jumeirah+Dubai',
  },
  social: {
    instagram: 'https://instagram.com',
    whatsapp: 'https://wa.me/97145550192',
  },
  /** Currency selector default on the public site: AED (درهم) or IRR (تومان). */
  currency: {
    default: 'AED' as 'AED' | 'IRR',
    options: ['AED', 'IRR'] as const,
  },
  /** Demo-only accounts, surfaced on the sign-in screens. */
  demo: {
    smsCode: '1234',
    customerPhone: '0500000000',
    adminEmail: 'admin@demo.test',
    staffEmail: 'staff@demo.test',
    password: 'password',
  },
  colors: {
    light: {
      bg: '251 247 243',
      surface: '255 255 255',
      elevated: '255 253 251',
      ink: '42 35 32',
      muted: '124 110 102',
      line: '236 226 216',
      primary: '183 110 121',
      primarySoft: '247 233 235',
      primaryInk: '255 255 255',
      accent: '200 169 106',
      accentSoft: '248 240 224',
      success: '47 125 96',
      warning: '176 124 32',
      danger: '176 66 66',
    } satisfies Palette,
    dark: {
      bg: '20 16 14',
      surface: '29 23 20',
      elevated: '36 29 25',
      ink: '245 239 234',
      muted: '167 154 147',
      line: '48 39 34',
      primary: '212 143 154',
      primarySoft: '58 39 43',
      primaryInk: '26 18 20',
      accent: '216 187 128',
      accentSoft: '54 45 30',
      success: '92 184 145',
      warning: '226 176 89',
      danger: '226 122 122',
    } satisfies Palette,
  },
} as const;

export type Brand = typeof brand;
