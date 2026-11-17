import { format as formatJalali } from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';
import type { Locale } from '@/i18n/config';
import type { Currency } from '@/types';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const toPersianDigits = (value: string | number): string =>
  String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);

export const toLatinDigits = (value: string): string =>
  value.replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)));

const asDate = (iso: string): Date => new Date(`${iso}T00:00:00`);

/** Formats an ISO calendar date in the Jalali calendar for Persian, Gregorian for English. */
export const formatDate = (
  iso: string,
  locale: Locale,
  style: 'short' | 'long' | 'weekday' | 'month' = 'short',
): string => {
  const date = asDate(iso);

  if (locale === 'fa') {
    const patterns = {
      short: 'd MMMM',
      long: 'd MMMM yyyy',
      weekday: 'EEEE d MMMM',
      month: 'MMMM yyyy',
    } as const;
    return toPersianDigits(formatJalali(date, patterns[style], { locale: faIR }));
  }

  const optionsByStyle: Record<typeof style, Intl.DateTimeFormatOptions> = {
    short: { day: 'numeric', month: 'short' },
    long: { day: 'numeric', month: 'short', year: 'numeric' },
    weekday: { weekday: 'long', day: 'numeric', month: 'short' },
    month: { month: 'long', year: 'numeric' },
  };
  return new Intl.DateTimeFormat('en-GB', optionsByStyle[style]).format(date);
};

export const formatWeekday = (iso: string, locale: Locale): string => {
  const date = asDate(iso);
  if (locale === 'fa') return toPersianDigits(formatJalali(date, 'EEE', { locale: faIR }));
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
};

export const formatDayNumber = (iso: string, locale: Locale): string => {
  const date = asDate(iso);
  if (locale === 'fa') return toPersianDigits(formatJalali(date, 'd', { locale: faIR }));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(date);
};

export const formatTime = (time: string, locale: Locale): string =>
  locale === 'fa' ? toPersianDigits(time) : time;

export const formatDuration = (minutes: number, locale: Locale): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (locale === 'fa') {
    const parts: string[] = [];
    if (hours) parts.push(`${toPersianDigits(hours)} ساعت`);
    if (rest) parts.push(`${toPersianDigits(rest)} دقیقه`);
    return parts.length ? parts.join(' و ') : '۰ دقیقه';
  }
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (rest) parts.push(`${rest}m`);
  return parts.join(' ') || '0m';
};

const AED_LABEL: Record<Locale, string> = { fa: 'درهم', en: 'AED' };
const IRR_LABEL: Record<Locale, string> = { fa: 'تومان', en: 'IRR' };

export const formatMoney = (amount: number, currency: Currency, locale: Locale): string => {
  const grouped = amount.toLocaleString('en-US');
  if (currency === 'IRR') {
    return locale === 'fa'
      ? `${toPersianDigits(grouped)} ${IRR_LABEL.fa}`
      : `${IRR_LABEL.en} ${grouped}`;
  }
  return locale === 'fa'
    ? `${toPersianDigits(grouped)} ${AED_LABEL.fa}`
    : `${AED_LABEL.en} ${grouped}`;
};

export const formatRating = (rating: number, locale: Locale): string =>
  (locale === 'fa' ? toPersianDigits(rating.toFixed(1)) : rating.toFixed(1));
