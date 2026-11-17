'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns-jalali';
import { faIR } from 'date-fns-jalali/locale';
import { useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import { formatDate, toPersianDigits } from '@/lib/format';
import { cn } from '@/lib/cn';

type JalaliCalendarProps = {
  value: string;
  onChange: (iso: string) => void;
  locale: Locale;
  /** Dates that should render as disabled (closed days, holidays, etc.). */
  isDisabled?: (iso: string) => boolean;
  /** Optional marker for dates that have availability. */
  hasAvailability?: (iso: string) => boolean;
  minDate?: string;
  maxDate?: string;
};

const isoOf = (date: Date): string => format(date, 'yyyy-MM-dd');

export const JalaliCalendar = ({
  value,
  onChange,
  locale,
  isDisabled,
  hasAvailability,
  minDate,
  maxDate,
}: JalaliCalendarProps) => {
  const selected = useMemo(() => new Date(`${value}T00:00:00`), [value]);
  const [cursor, setCursor] = useState(() => startOfMonth(selected));

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 6 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 6 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const monthLabel =
    locale === 'fa'
      ? toPersianDigits(format(cursor, 'MMMM yyyy', { locale: faIR }))
      : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(cursor);

  const weekdays =
    locale === 'fa'
      ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-elevated hover:text-ink"
          aria-label="previous month"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-elevated hover:text-ink"
          aria-label="next month"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const iso = isoOf(day);
          const outside = day.getMonth() !== cursor.getMonth();
          const disabled =
            (isDisabled?.(iso) ?? false) ||
            (minDate ? iso < minDate : false) ||
            (maxDate ? iso > maxDate : false);
          const active = iso === value;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={cn(
                'relative flex h-10 items-center justify-center rounded-xl text-xs transition',
                active && 'bg-primary font-semibold text-primary-ink',
                !active && !disabled && 'hover:bg-elevated',
                disabled && 'cursor-not-allowed text-muted/40',
                outside && !active && 'text-muted/50',
              )}
            >
              {formatDate(iso, locale, 'short').split(' ')[0]}
              {!active && !disabled && hasAvailability?.(iso) && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
