'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelBooking,
  getAvailabilityFor,
  getCustomerBookings,
  getCustomerById,
  getServices,
  getSettings,
  getStaff,
  rescheduleBooking,
} from '@/lib/api';
import { asset } from '@/lib/asset';
import { clearSession } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/use-session';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, formatTime, toLatinDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type {
  Booking,
  Customer,
  DayAvailability,
  Service,
  Settings,
  Staff,
} from '@/types';
import { LoginForm } from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/Button';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { JalaliCalendar } from '@/components/ui/JalaliCalendar';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { InvoiceDialog } from './InvoiceDialog';

type Props = { locale: Locale; dict: Dictionary };

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function CustomerPortal({ locale, dict }: Props) {
  const { session, ready } = useSession();
  const { show } = useToast();

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<Booking | null>(null);
  const [waiting, setWaiting] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(todayIso());
  const [rescheduleStart, setRescheduleStart] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isCustomer = session?.role === 'customer';
  const customerId = isCustomer ? session?.subjectId : undefined;

  const load = useCallback(async () => {
    if (!customerId) return;
    const [bookingList, serviceList, staffList, customerValue, settingsValue] = await Promise.all([
      getCustomerBookings(customerId),
      getServices(),
      getStaff(),
      getCustomerById(customerId),
      getSettings(),
    ]);
    setBookings(bookingList);
    setServices(serviceList);
    setStaff(staffList);
    setCustomer(customerValue);
    setSettings(settingsValue);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const staffMap = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const today = todayIso();
  const upcoming = (bookings ?? []).filter(
    (booking) => booking.date >= today && booking.status !== 'cancelled' && booking.status !== 'completed',
  );
  const past = (bookings ?? [])
    .filter((booking) => booking.date < today || booking.status === 'completed' || booking.status === 'cancelled')
    .slice()
    .reverse();

  const visible = tab === 'upcoming' ? upcoming : past;

  const doCancel = async () => {
    if (!cancelTarget) return;
    setWaiting(true);
    try {
      await cancelBooking(cancelTarget.id);
      show(dict.account.cancelled, 'success');
      setCancelTarget(null);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setWaiting(false);
    }
  };

  useEffect(() => {
    if (!rescheduleTarget) return;
    let alive = true;
    setLoadingSlots(true);
    getAvailabilityFor(rescheduleTarget.serviceId, rescheduleDate, rescheduleTarget.staffId)
      .then((day) => {
        if (alive) setAvailability(day);
      })
      .finally(() => {
        if (alive) setLoadingSlots(false);
      });
    return () => {
      alive = false;
    };
  }, [rescheduleTarget, rescheduleDate]);

  const doReschedule = async () => {
    if (!rescheduleTarget || !rescheduleStart) return;
    setWaiting(true);
    try {
      await rescheduleBooking(rescheduleTarget.id, {
        date: rescheduleDate,
        start: rescheduleStart,
        staffId: rescheduleTarget.staffId,
      });
      show(dict.account.rescheduled, 'success');
      setRescheduleTarget(null);
      setRescheduleStart(null);
      await load();
    } catch (error) {
      show(error instanceof Error && error.message === 'slot_unavailable' ? dict.errors.slot_unavailable : dict.errors.generic, 'error');
    } finally {
      setWaiting(false);
    }
  };

  if (!ready) {
    return (
      <div className="container max-w-3xl py-10">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="container flex max-w-md flex-col gap-4 py-10">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dict.account.title}</h1>
          <p className="text-xs text-muted">{dict.account.loginPrompt}</p>
        </div>
        <div className="card p-5">
          <LoginForm locale={locale} dict={dict} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl space-y-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            {dict.account.greeting} <span className="text-ink">{customer?.name ?? session?.name}</span>
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{dict.account.title}</h1>
          <p className="text-[11px] text-muted" dir="ltr">
            {customer?.phone ?? session?.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={localePath(locale, 'book')}
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-xs font-medium text-primary-ink"
          >
            {dict.account.bookNow}
          </Link>
          <button
            type="button"
            onClick={() => clearSession()}
            className="h-10 rounded-full border border-line px-4 text-xs text-muted transition hover:text-ink"
          >
            {dict.account.logout}
          </button>
        </div>
      </header>

      <div className="flex rounded-full border border-line bg-elevated/60 p-1 text-xs">
        {(
          [
            { value: 'upcoming', label: dict.account.upcoming, count: upcoming.length },
            { value: 'past', label: dict.account.past, count: past.length },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 transition',
              tab === option.value ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted',
            )}
          >
            {option.label} <span className="text-[10px] text-muted">({option.count})</span>
          </button>
        ))}
      </div>

      {bookings === null && <Skeleton className="h-32 w-full" />}

      {bookings !== null && visible.length === 0 && (
        <EmptyState
          title={tab === 'upcoming' ? dict.account.emptyUpcoming : dict.account.emptyPast}
          action={
            tab === 'upcoming' ? (
              <Link
                href={localePath(locale, 'book')}
                className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-ink"
              >
                {dict.account.bookNow}
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="space-y-3">
        {visible.map((booking) => {
          const service = serviceMap.get(booking.serviceId);
          const staffMember = staffMap.get(booking.staffId);
          return (
            <article key={booking.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <img
                  src={service?.image ? asset(service.image) : ''}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium">{service?.name[locale] ?? '—'}</h2>
                    <BookingStatusBadge status={booking.status} dict={dict} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {staffMember?.name[locale] ?? '—'} · {formatDate(booking.date, locale, 'weekday')}
                  </p>
                  <p className="text-[11px] text-muted tabular-nums" dir="ltr">
                    {formatTime(booking.start, locale)} – {formatTime(booking.end, locale)}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-sm font-semibold">{formatMoney(booking.price, booking.currency, locale)}</p>
                  <p className="text-[10px] text-muted" dir="ltr">
                    {booking.code}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line/70 pt-3">
                <button
                  type="button"
                  onClick={() => setInvoiceTarget(booking)}
                  className="rounded-full border border-line px-3 py-1.5 text-[11px] transition hover:bg-elevated"
                >
                  {dict.account.invoice}
                </button>
                {tab === 'upcoming' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleTarget(booking);
                        setRescheduleDate(booking.date);
                        setRescheduleStart(null);
                      }}
                      className="rounded-full border border-line px-3 py-1.5 text-[11px] transition hover:bg-elevated"
                    >
                      {dict.account.reschedule}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelTarget(booking)}
                      className="rounded-full border border-danger/30 px-3 py-1.5 text-[11px] text-danger transition hover:bg-danger/10"
                    >
                      {dict.account.cancelBooking}
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted">{settings?.cancellation.policy[locale]}</p>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={dict.account.cancelBooking}
        subtitle={cancelTarget ? cancelTarget.code : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              {dict.common.cancel}
            </Button>
            <Button variant="danger" onClick={doCancel} loading={waiting}>
              {dict.account.cancelConfirm}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">{dict.booking.simulateNote}</p>
      </Modal>

      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => {
          setRescheduleTarget(null);
          setRescheduleStart(null);
        }}
        title={dict.account.pickNewTime}
        subtitle={rescheduleTarget ? `${formatDate(rescheduleTarget.date, locale, 'long')} · ${rescheduleTarget.start}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRescheduleTarget(null);
                setRescheduleStart(null);
              }}
            >
              {dict.common.cancel}
            </Button>
            <Button onClick={doReschedule} disabled={!rescheduleStart} loading={waiting}>
              {dict.common.confirm}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <JalaliCalendar
            value={rescheduleDate}
            onChange={(next) => {
              setRescheduleDate(next);
              setRescheduleStart(null);
            }}
            locale={locale}
            minDate={todayIso()}
          />
          <div className="space-y-2">
            {loadingSlots && <Skeleton className="h-24 w-full" />}
            {!loadingSlots && availability?.closed && (
              <p className="rounded-xl bg-elevated/60 px-3 py-4 text-center text-xs text-muted">
                {availability.closedReason === 'holiday' ? dict.booking.closedHoliday : dict.booking.closedDayOff}
              </p>
            )}
            {!loadingSlots && availability && !availability.closed && (
              <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto">
                {availability.slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setRescheduleStart(slot.start)}
                    className={cn(
                      'rounded-lg border px-1 py-2 text-[11px] tabular-nums transition',
                      rescheduleStart === slot.start
                        ? 'border-primary bg-primary text-primary-ink'
                        : slot.available
                          ? 'border-line hover:border-primary/50'
                          : 'cursor-not-allowed border-transparent bg-elevated text-muted/40 line-through',
                    )}
                  >
                    {formatTime(slot.start, locale)}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted">{dict.account.transferNote}</p>
            <p className="text-[10px] text-muted" dir="ltr">
              {toLatinDigits(rescheduleTarget?.code ?? '')}
            </p>
          </div>
        </div>
      </Modal>

      <InvoiceDialog
        open={Boolean(invoiceTarget)}
        onClose={() => setInvoiceTarget(null)}
        booking={invoiceTarget}
        service={invoiceTarget ? serviceMap.get(invoiceTarget.serviceId) : undefined}
        staffMember={invoiceTarget ? staffMap.get(invoiceTarget.staffId) : undefined}
        customer={customer}
        settings={settings}
        locale={locale}
        dict={dict}
      />
    </div>
  );
}
