'use client';

import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getBookings,
  getCustomers,
  getServices,
  getStaff,
  getStaffById,
  getTimeOff,
  requestTimeOff,
  updateBookingStatus,
} from '@/lib/api';
import { toIsoDate, weekOrder, dayKeyLabels } from '@/lib/availability';
import { asset } from '@/lib/asset';
import { clearSession } from '@/lib/auth/session';
import { useSession } from '@/lib/auth/use-session';
import { cn } from '@/lib/cn';
import { formatDate, formatTime, toPersianDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Booking, Customer, Service, Staff, TimeOff } from '@/types';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { JalaliCalendar } from '@/components/ui/JalaliCalendar';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

const todayIso = (): string => toIsoDate(new Date());

export function StaffPanel({ locale, dict }: Props) {
  const { session, ready } = useSession();
  const { show } = useToast();
  const calendarRef = useRef<FullCalendar>(null);

  const [staff, setStaff] = useState<Staff | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leave, setLeave] = useState({ fromDate: todayIso(), toDate: todayIso(), reason: '' });
  const [busy, setBusy] = useState(false);

  const staffId = session?.role === 'staff' ? session.subjectId : undefined;

  const load = useCallback(async () => {
    if (!staffId) return;
    const [member, bookingList, serviceList, customerList, timeOffList] = await Promise.all([
      getStaffById(staffId),
      getBookings({ staffId }),
      getServices(),
      getCustomers(),
      getTimeOff(staffId),
    ]);
    setStaff(member);
    setBookings(bookingList);
    setServices(serviceList);
    setCustomers(customerList);
    setTimeOff(timeOffList);
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const today = todayIso();
  const todaysBookings = bookings.filter(
    (booking) => booking.date === today && booking.status !== 'cancelled',
  );
  const upcoming = bookings.filter(
    (booking) =>
      booking.date > today && booking.status !== 'cancelled' && booking.status !== 'completed',
  );

  const events = bookings
    .filter((booking) => booking.status !== 'cancelled')
    .map((booking) => ({
      id: booking.id,
      title: `${customerMap.get(booking.customerId)?.name ?? ''} · ${
        serviceMap.get(booking.serviceId)?.name[locale] ?? ''
      }`,
      start: `${booking.date}T${booking.start}:00`,
      end: `${booking.date}T${booking.end}:00`,
      backgroundColor: staff?.color ?? '#b76e79',
      borderColor: 'transparent',
    }));

  const markStatus = async (booking: Booking, status: 'completed' | 'no_show') => {
    setBusy(true);
    try {
      await updateBookingStatus(booking.id, status);
      show(dict.common.saved, 'success');
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitLeave = async () => {
    if (!staffId) return;
    setBusy(true);
    try {
      await requestTimeOff({
        staffId,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        reason: leave.reason || undefined,
      });
      show(dict.staffPanel.submitted, 'success');
      setLeaveOpen(false);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="container max-w-4xl py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!staffId) {
    return (
      <div className="container flex max-w-md flex-col gap-4 py-10">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dict.staffPanel.title}</h1>
          <p className="text-xs text-muted">{dict.auth.notAuthorized}</p>
        </div>
        <div className="card p-5">
          <LoginForm locale={locale} dict={dict} initialTab="staff" compact />
        </div>
      </div>
    );
  }

  const todayKey = weekOrder[new Date().getDay()];
  const todaySchedule = staff?.schedule[todayKey];

  return (
    <div className="container max-w-4xl space-y-5 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {staff && (
            <img src={asset(staff.avatar)} alt="" className="h-12 w-12 rounded-2xl object-cover" />
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{dict.staffPanel.title}</h1>
            <p className="text-xs text-muted">{staff?.name[locale] ?? session?.name}</p>
            <p className="text-[11px] text-muted">
              {dict.staffPanel.workingHours}:{' '}
              {todaySchedule ? (
                <span dir="ltr">
                  {todaySchedule.start} – {todaySchedule.end}
                </span>
              ) : (
                dict.staffPanel.dayOff
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={localePath(locale)}
            className="h-9 rounded-full border border-line px-3 text-[11px] leading-9 text-muted"
          >
            {dict.nav.home}
          </Link>
          <button
            type="button"
            onClick={() => clearSession()}
            className="h-9 rounded-full border border-line px-3 text-[11px] text-muted"
          >
            {dict.nav.logout}
          </button>
        </div>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{dict.staffPanel.today}</h2>
          <span className="text-[11px] text-muted">{formatDate(today, locale, 'weekday')}</span>
        </div>
        {todaysBookings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-muted">
            {dict.staffPanel.empty}
          </p>
        )}
        <div className="space-y-2">
          {todaysBookings.map((booking) => (
            <article key={booking.id} className="card flex flex-wrap items-center gap-2 p-3 text-xs">
              <span className="rounded-lg bg-elevated px-2 py-1 tabular-nums" dir="ltr">
                {formatTime(booking.start, locale)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {customerMap.get(booking.customerId)?.name} ·{' '}
                {serviceMap.get(booking.serviceId)?.name[locale]}
              </span>
              <BookingStatusBadge status={booking.status} dict={dict} />
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markStatus(booking, 'completed')}
                    className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success"
                  >
                    {dict.staffPanel.markCompleted}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => markStatus(booking, 'no_show')}
                    className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger"
                  >
                    {dict.staffPanel.markNoShow}
                  </button>
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{dict.staffPanel.upcoming}</h2>
        {upcoming.length === 0 && <p className="text-xs text-muted">{dict.staffPanel.empty}</p>}
        <ul className="space-y-1.5">
          {upcoming.slice(0, 8).map((booking) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-elevated/40 px-3 py-2 text-[11px]"
            >
              <span className="text-muted">{formatDate(booking.date, locale, 'short')}</span>
              <span className="tabular-nums" dir="ltr">
                {formatTime(booking.start, locale)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {customerMap.get(booking.customerId)?.name} ·{' '}
                {serviceMap.get(booking.serviceId)?.name[locale]}
              </span>
              <BookingStatusBadge status={booking.status} dict={dict} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{dict.staffPanel.calendar}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().prev()}
              className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted"
              aria-label="previous"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().today()}
              className="h-7 rounded-full border border-line px-2 text-[10px] text-muted"
            >
              {dict.common.today}
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().next()}
              className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted"
              aria-label="next"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="admin-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            height="auto"
            direction={locale === 'fa' ? 'rtl' : 'ltr'}
            events={events}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{dict.staffPanel.myRequests}</h2>
          <Button size="sm" variant="ghost" onClick={() => setLeaveOpen(true)}>
            {dict.staffPanel.requestLeave}
          </Button>
        </div>
        {timeOff.length === 0 && <p className="text-xs text-muted">{dict.staffPanel.noRequests}</p>}
        <ul className="space-y-1.5 text-[11px]">
          {timeOff.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-elevated/40 px-3 py-2"
            >
              <span>
                {formatDate(entry.fromDate, locale, 'short')} – {formatDate(entry.toDate, locale, 'short')}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">{entry.reason}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px]',
                  entry.status === 'approved'
                    ? 'bg-success/10 text-success'
                    : entry.status === 'rejected'
                      ? 'bg-danger/10 text-danger'
                      : 'bg-elevated text-muted',
                )}
              >
                {dict.admin.team[entry.status]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted">
          {dayKeyLabels[todayKey][locale]} · {toPersianDigits(todaysBookings.length)}
        </p>
      </section>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={dict.staffPanel.requestLeave}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button onClick={submitLeave} loading={busy}>
              {dict.staffPanel.submit}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <JalaliCalendar
            value={leave.fromDate}
            onChange={(date) => setLeave({ ...leave, fromDate: date, toDate: date })}
            locale={locale}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={dict.staffPanel.leaveFrom}>
              <Input
                type="date"
                value={leave.fromDate}
                onChange={(event) => setLeave({ ...leave, fromDate: event.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label={dict.staffPanel.leaveTo}>
              <Input
                type="date"
                value={leave.toDate}
                onChange={(event) => setLeave({ ...leave, toDate: event.target.value })}
                dir="ltr"
              />
            </Field>
          </div>
          <Field label={dict.staffPanel.leaveReason}>
            <Textarea
              value={leave.reason}
              onChange={(event) => setLeave({ ...leave, reason: event.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
