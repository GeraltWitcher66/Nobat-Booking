'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { brand } from '@/config/brand';
import {
  createBooking,
  getAvailabilityFor,
  getNextAvailableSlot,
  getServices,
  getSettings,
  getStaff,
  requestSmsCode,
  verifySmsCode,
} from '@/lib/api';
import { asset } from '@/lib/asset';
import { cn } from '@/lib/cn';
import { formatDate, formatDuration, formatMoney, formatTime, toLatinDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type {
  Booking,
  Currency,
  DayAvailability,
  PaymentMethod,
  Service,
  Settings,
  Slot,
  Staff,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { JalaliCalendar } from '@/components/ui/JalaliCalendar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

const CURRENCY_KEY = `${brand.slug}.currency`;

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const periodOf = (time: string): 'morning' | 'afternoon' | 'evening' => {
  const hour = Number(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export function BookingWizard({ locale, dict }: Props) {
  const params = useSearchParams();
  const { show } = useToast();

  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string>('any');
  const [date, setDate] = useState<string>(todayIso());
  const [start, setStart] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nextSlot, setNextSlot] = useState<{ date: string; start: string } | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>('AED');

  const service = useMemo(
    () => services?.find((item) => item.id === serviceId) ?? null,
    [services, serviceId],
  );
  const staffMember = useMemo(
    () => (staffId === 'any' ? null : staff.find((member) => member.id === staffId) ?? null),
    [staff, staffId],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(CURRENCY_KEY) as Currency | null;
    if (stored === 'AED' || stored === 'IRR') setCurrency(stored);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([getServices(), getStaff(), getSettings()]).then(([serviceList, staffList, settingsValue]) => {
      if (!alive) return;
      const active = serviceList.filter((item) => item.active);
      setServices(active);
      setStaff(staffList.filter((member) => member.active));
      setSettings(settingsValue);
      setCurrency((current) => settingsValue.defaultCurrency ?? current);

      const requested = params.get('service');
      const requestedStaff = params.get('staff');
      if (requested) {
        const match = active.find((item) => item.slug === requested);
        if (match) setServiceId(match.id);
      }
      if (requestedStaff) setStaffId(requestedStaff);
    });
    return () => {
      alive = false;
    };
  }, [params]);

  const refreshAvailability = useCallback(
    async (targetDate: string) => {
      if (!serviceId) return;
      setLoadingSlots(true);
      try {
        const day = await getAvailabilityFor(serviceId, targetDate, staffId === 'any' ? undefined : staffId);
        setAvailability(day);
      } catch {
        setAvailability(null);
      } finally {
        setLoadingSlots(false);
      }
    },
    [serviceId, staffId],
  );

  useEffect(() => {
    if (step !== 2 || !serviceId) return;
    void refreshAvailability(date);
  }, [step, date, serviceId, staffId, refreshAvailability]);

  useEffect(() => {
    if (step !== 2 || !serviceId) return;
    let alive = true;
    getNextAvailableSlot(serviceId, todayIso()).then((slot) => {
      if (alive) setNextSlot(slot);
    });
    return () => {
      alive = false;
    };
  }, [step, serviceId]);

  const eligibleStaff = useMemo(
    () => (service ? staff.filter((member) => member.services.includes(service.id)) : []),
    [service, staff],
  );

  const resetFromService = (nextServiceId: string) => {
    setServiceId(nextServiceId);
    setStart(null);
    setAvailability(null);
    setStaffId('any');
  };

  const price = service ? service.prices[currency] : 0;
  const deposit = settings ? Math.round((price * settings.depositPercent) / 100) : 0;
  const dueNow = paymentMethod === 'deposit' ? deposit : paymentMethod === 'full' ? price : 0;

  const phoneValid = /^0\d{9}$/.test(toLatinDigits(phone).replace(/\s+/g, ''));

  const canContinue = () => {
    if (step === 0) return Boolean(serviceId);
    if (step === 1) return Boolean(serviceId) && (staffId === 'any' || Boolean(staffMember));
    if (step === 2) return Boolean(start);
    if (step === 3) return name.trim().length > 1 && phoneValid;
    if (step === 4) return verified;
    return true;
  };

  const goNext = async () => {
    if (step === 2 && !start) return;
    if (step === 3) {
      setBusy(true);
      try {
        const { code: demoCode } = await requestSmsCode(toLatinDigits(phone));
        setCodeSent(true);
        show(demoCode, 'info');
        setStep(4);
      } catch (err) {
        setError(err instanceof Error && err.message === 'invalid_phone' ? dict.booking.errors.invalid_phone : dict.booking.errors.generic);
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep((current) => Math.min(current + 1, 6));
  };

  const verifyCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifySmsCode(toLatinDigits(phone), toLatinDigits(code));
      setVerified(true);
      setStep(5);
    } catch {
      setError(dict.booking.errors.invalid_code);
    } finally {
      setBusy(false);
    }
  };

  const submitBooking = async () => {
    if (!service || !start) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createBooking({
        serviceId: service.id,
        staffId,
        date,
        start,
        customer: { name: name.trim(), phone: toLatinDigits(phone).replace(/\s+/g, '') },
        paymentMethod,
        currency,
        notes: notes.trim() || undefined,
        source: 'online',
        verified: true,
      });
      setBooking(created);
      setStep(6);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setError(
        code === 'slot_unavailable'
          ? dict.booking.errors.slot_unavailable
          : code === 'invalid_phone'
            ? dict.booking.errors.invalid_phone
            : dict.booking.errors.generic,
      );
    } finally {
      setBusy(false);
    }
  };

  const slotsByPeriod = useMemo(() => {
    const groups: Record<'morning' | 'afternoon' | 'evening', Slot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    availability?.slots.forEach((slot) => groups[periodOf(slot.start)].push(slot));
    return groups;
  }, [availability]);

  const stepsLabels = dict.booking.steps;

  return (
    <div className="container max-w-3xl py-6 sm:py-10">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{dict.booking.title}</h1>
            <p className="text-xs text-muted sm:text-sm">{dict.booking.subtitle}</p>
          </div>
          <span className="pill shrink-0">
            {dict.booking.stepLabel} {formatTime(String(step + 1), locale)} {dict.common.of}{' '}
            {formatTime(String(stepsLabels.length), locale)}
          </span>
        </div>

        <div className="flex gap-1">
          {stepsLabels.map((label, index) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  'h-1 rounded-full transition-colors',
                  index <= step ? 'bg-primary' : 'bg-line',
                )}
              />
              <p
                className={cn(
                  'mt-1.5 hidden truncate text-[10px] sm:block',
                  index === step ? 'font-medium text-ink' : 'text-muted',
                )}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: locale === 'fa' ? 18 : -18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: locale === 'fa' ? -14 : 14 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="card overflow-hidden"
        >
          {step === 0 && (
            <div className="space-y-3 p-4 sm:p-6">
              <h2 className="text-sm font-semibold">{dict.booking.chooseService}</h2>
              {!services && <Skeleton className="h-20 w-full" />}
              <div className="space-y-2">
                {services?.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => resetFromService(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition',
                      serviceId === item.id
                        ? 'border-primary/60 bg-primary-soft/60'
                        : 'border-line bg-surface hover:bg-elevated/70',
                    )}
                  >
                    <img
                      src={asset(item.image)}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.name[locale]}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {formatDuration(item.durationMin, locale)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatMoney(item.prices[currency], currency, locale)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && service && (
            <div className="space-y-3 p-4 sm:p-6">
              <h2 className="text-sm font-semibold">{dict.booking.chooseStaff}</h2>
              <button
                type="button"
                onClick={() => {
                  setStaffId('any');
                  setStart(null);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition',
                  staffId === 'any'
                    ? 'border-primary/60 bg-primary-soft/60'
                    : 'border-line bg-surface hover:bg-elevated/70',
                )}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="17" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3.5 19c.6-3 3-4.6 5.5-4.6s4.9 1.6 5.5 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{dict.booking.anyStaff}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{dict.booking.anyStaffHint}</span>
                </span>
              </button>

              {eligibleStaff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setStaffId(member.id);
                    setStart(null);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition',
                    staffId === member.id
                      ? 'border-primary/60 bg-primary-soft/60'
                      : 'border-line bg-surface hover:bg-elevated/70',
                  )}
                >
                  <img
                    src={asset(member.avatar)}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{member.name[locale]}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{member.role[locale]}</span>
                  </span>
                  <span className="shrink-0 text-xs text-accent">★ {member.rating}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && service && (
            <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[300px_1fr]">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">{dict.booking.chooseDate}</h2>
                <JalaliCalendar
                  value={date}
                  onChange={(next) => {
                    setDate(next);
                    setStart(null);
                  }}
                  locale={locale}
                  minDate={todayIso()}
                />
                {nextSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      setDate(nextSlot.date);
                      setStart(nextSlot.start);
                    }}
                    className="w-full rounded-xl border border-line bg-elevated/60 px-3 py-2 text-[11px] text-muted transition hover:text-ink"
                  >
                    {dict.booking.nextAvailable}: {formatDate(nextSlot.date, locale, 'short')} ·{' '}
                    {formatTime(nextSlot.start, locale)}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold">{dict.booking.chooseTime}</h2>
                {loadingSlots && <Skeleton className="h-32 w-full" />}
                {!loadingSlots && availability?.closed && (
                  <p className="rounded-xl border border-line bg-elevated/60 px-3 py-6 text-center text-xs text-muted">
                    {availability.closedReason === 'holiday'
                      ? dict.booking.closedHoliday
                      : availability.closedReason === 'time_off'
                        ? dict.booking.closedTimeOff
                        : dict.booking.closedDayOff}
                  </p>
                )}
                {!loadingSlots && availability && !availability.closed && (
                  <div className="space-y-4">
                    {(['morning', 'afternoon', 'evening'] as const).map((period) =>
                      slotsByPeriod[period].length === 0 ? null : (
                        <div key={period} className="space-y-2">
                          <p className="text-[11px] font-medium text-muted">{dict.booking[period]}</p>
                          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                            {slotsByPeriod[period].map((slot) => (
                              <button
                                key={slot.start}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => setStart(slot.start)}
                                title={
                                  slot.available
                                    ? undefined
                                    : slot.reason === 'booked'
                                      ? dict.status.booking.confirmed
                                      : slot.reason === 'break'
                                        ? dict.admin.team.breaks
                                        : dict.booking.closedDayOff
                                }
                                className={cn(
                                  'rounded-lg border px-1 py-2 text-[11px] tabular-nums transition',
                                  start === slot.start
                                    ? 'border-primary bg-primary text-primary-ink'
                                    : slot.available
                                      ? 'border-line bg-surface hover:border-primary/50'
                                      : 'cursor-not-allowed border-transparent bg-elevated text-muted/40 line-through',
                                )}
                              >
                                {formatTime(slot.start, locale)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                    {availability.slots.every((slot) => !slot.available) && (
                      <p className="text-xs text-muted">{dict.booking.noSlots}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 p-4 sm:p-6">
              <h2 className="text-sm font-semibold">{dict.booking.detailsTitle}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={dict.common.name} className="sm:col-span-2">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={dict.booking.namePlaceholder}
                    autoComplete="name"
                  />
                </Field>
                <Field
                  label={dict.common.phone}
                  hint={dict.booking.phonePlaceholder}
                  error={phone.length > 0 && !phoneValid ? dict.booking.errors.invalid_phone : undefined}
                >
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={dict.booking.phonePlaceholder}
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                  />
                </Field>
                <Field label={`${dict.common.notes} (${dict.common.optional})`} className="sm:col-span-2">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={dict.booking.notesPlaceholder}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <h2 className="text-sm font-semibold">{dict.booking.smsTitle}</h2>
                <p className="mt-1 text-xs text-muted">
                  {dict.booking.smsSubtitle} <span dir="ltr">{toLatinDigits(phone)}</span>
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-accent/40 bg-accent-soft/50 px-3 py-2 text-xs text-accent">
                {dict.booking.demoCodeHint} — <span className="font-semibold" dir="ltr">{brand.demo.smsCode}</span>
              </div>

              <Field label={dict.booking.smsTitle}>
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="----"
                  className="text-center text-lg tracking-[0.5em]"
                />
              </Field>

              {error && <p className="text-xs text-danger">{error}</p>}

              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={goNext} loading={busy} disabled={!codeSent}>
                  {dict.booking.resend}
                </Button>
                <Button onClick={verifyCode} loading={busy} disabled={code.length !== 4}>
                  {dict.auth.verify}
                </Button>
              </div>
            </div>
          )}

          {step === 5 && service && (
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <h2 className="text-sm font-semibold">{dict.booking.paymentTitle}</h2>
                <p className="mt-1 text-xs text-muted">{dict.booking.paymentSubtitle}</p>
              </div>

              <div className="space-y-2">
                {(
                  [
                    { value: 'full', title: dict.booking.payFull, amount: price },
                    { value: 'deposit', title: dict.booking.payDeposit, amount: deposit },
                    { value: 'in_person', title: dict.booking.payInPerson, amount: 0 },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-start transition',
                      paymentMethod === option.value
                        ? 'border-primary/60 bg-primary-soft/50'
                        : 'border-line bg-surface hover:bg-elevated/60',
                    )}
                  >
                    <span className="text-sm">{option.title}</span>
                    <span className="text-xs font-semibold">
                      {option.value === 'in_person'
                        ? formatMoney(price, currency, locale)
                        : formatMoney(option.amount, currency, locale)}
                    </span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'deposit' && (
                <p className="rounded-xl bg-elevated/70 px-3 py-2 text-[11px] text-muted">
                  {settings?.depositPercent ?? 25}% — {formatMoney(deposit, currency, locale)} ·{' '}
                  {dict.booking.depositRest}
                </p>
              )}

              {paymentMethod !== 'in_person' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={dict.booking.cardNumber} className="sm:col-span-2">
                    <Input
                      value={card.number}
                      onChange={(event) =>
                        setCard({
                          ...card,
                          number: event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 16)
                            .replace(/(.{4})/g, '$1 ')
                            .trim(),
                        })
                      }
                      placeholder="4242 4242 4242 4242"
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={dict.booking.cardName} className="sm:col-span-2">
                    <Input
                      value={card.name}
                      onChange={(event) => setCard({ ...card, name: event.target.value })}
                      placeholder={dict.booking.namePlaceholder}
                    />
                  </Field>
                  <Field label={dict.booking.expiry}>
                    <Input
                      value={card.expiry}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                        setCard({
                          ...card,
                          expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits,
                        });
                      }}
                      placeholder="MM/YY"
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label={dict.booking.cvv}>
                    <Input
                      value={card.cvv}
                      onChange={(event) => setCard({ ...card, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="123"
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              )}

              <p className="text-[11px] text-muted">{dict.booking.simulateNote}</p>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
          )}

          {step === 6 && booking && service && (
            <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-10">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success"
              >
                <motion.svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                >
                  <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              </motion.span>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{dict.booking.confirmTitle}</h2>
                <p className="text-xs text-muted">{dict.booking.smsSent}</p>
              </div>

              <div className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 px-6 py-3">
                <p className="text-[11px] text-muted">{dict.booking.bookingCode}</p>
                <p className="mt-1 text-xl font-semibold tracking-[0.2em]" dir="ltr">
                  {booking.code}
                </p>
              </div>

              <div className="w-full max-w-sm space-y-2 rounded-2xl border border-line bg-surface p-4 text-start text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.booking.service}</span>
                  <span className="font-medium">{service.name[locale]}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.booking.staff}</span>
                  <span className="font-medium">
                    {staff.find((member) => member.id === booking.staffId)?.name[locale] ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.common.date}</span>
                  <span className="font-medium">{formatDate(booking.date, locale, 'weekday')}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.common.time}</span>
                  <span className="font-medium tabular-nums" dir="ltr">
                    {booking.start} – {booking.end}
                  </span>
                </div>
                <div className="hairline my-1" />
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.common.total}</span>
                  <span className="font-semibold">{formatMoney(booking.price, booking.currency, locale)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{dict.booking.paymentTitle}</span>
                  <span>{dict.status.method[booking.paymentMethod]}</span>
                </div>
                {booking.depositAmount ? (
                  <div className="flex justify-between gap-3 text-accent">
                    <span>{dict.booking.depositPaid}</span>
                    <span>{formatMoney(booking.depositAmount, booking.currency, locale)}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex w-full max-w-sm flex-col gap-2 pt-1">
                <Link
                  href={localePath(locale, 'account')}
                  className="flex h-11 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-ink"
                >
                  {dict.booking.viewBooking}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setBooking(null);
                    setStep(0);
                    setStart(null);
                    setCode('');
                    setVerified(false);
                    setCard({ number: '', name: '', expiry: '', cvv: '' });
                  }}
                  className="flex h-11 items-center justify-center rounded-full border border-line text-sm"
                >
                  {dict.booking.newBooking}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 6 && (
        <div className="sticky bottom-3 mt-4">
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-line bg-bg/90 p-2 shadow-lift backdrop-blur">
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                setStep((current) => Math.max(0, current - 1));
              }}
              disabled={step === 0 || busy}
              className="shrink-0"
            >
              {dict.common.back}
            </Button>

            <div className="min-w-0 flex-1 px-1 text-[11px] text-muted">
              {service && (
                <p className="truncate">
                  {service.name[locale]}
                  {staffMember ? ` · ${staffMember.name[locale]}` : ''}
                </p>
              )}
              {step >= 2 && start && (
                <p className="truncate">
                  {formatDate(date, locale, 'short')} · {formatTime(start, locale)}
                </p>
              )}
            </div>

            {step === 5 ? (
              <Button onClick={submitBooking} loading={busy} disabled={paymentMethod !== 'in_person' && card.number.length < 19}>
                {dict.booking.payNow}
              </Button>
            ) : step === 4 ? null : (
              <Button onClick={goNext} disabled={!canContinue()} loading={busy}>
                {dict.common.next}
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 5 && paymentMethod !== 'in_person' && (
        <p className="mt-2 text-center text-[11px] text-muted">
          {dict.booking.dueAtClinic}: {formatMoney(Math.max(0, price - dueNow), currency, locale)}
        </p>
      )}
    </div>
  );
}
