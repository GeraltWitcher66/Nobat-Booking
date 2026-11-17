'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelBooking,
  createBooking,
  getAvailabilityFor,
  getBookings,
  getCustomers,
  getServices,
  getStaff,
  rescheduleBooking,
  updateBookingStatus,
} from '@/lib/api';
import { toIsoDate } from '@/lib/availability';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, formatTime, toPersianDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type {
  Booking,
  Currency,
  Customer,
  DayAvailability,
  PaymentMethod,
  Service,
  Slot,
  Staff,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { Field, Input, Select } from '@/components/ui/Field';
import { JalaliCalendar } from '@/components/ui/JalaliCalendar';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/Card';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

const todayIso = (): string => toIsoDate(new Date());

export function AdminCalendar({ locale, dict }: Props) {
  const { show } = useToast();
  const calendarRef = useRef<FullCalendar>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffFilter, setStaffFilter] = useState('all');
  const [rangeLabel, setRangeLabel] = useState('');
  const [view, setView] = useState<'timeGridDay' | 'timeGridWeek'>('timeGridWeek');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    serviceId: '',
    staffId: 'any',
    date: todayIso(),
    start: null as string | null,
    name: '',
    phone: '',
    paymentMethod: 'in_person' as PaymentMethod,
  });
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const load = useCallback(async () => {
    const [bookingList, serviceList, staffList, customerList] = await Promise.all([
      getBookings(),
      getServices(),
      getStaff(),
      getCustomers(),
    ]);
    setBookings(bookingList);
    setServices(serviceList);
    setStaff(staffList);
    setCustomers(customerList);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const staffMap = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);
  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const events = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status !== 'cancelled')
        .filter((booking) => staffFilter === 'all' || booking.staffId === staffFilter)
        .map((booking) => {
          const member = staffMap.get(booking.staffId);
          const customer = customerMap.get(booking.customerId);
          const service = serviceMap.get(booking.serviceId);
          return {
            id: booking.id,
            title: `${customer?.name ?? ''} · ${service?.name[locale] ?? ''}`,
            start: `${booking.date}T${booking.start}:00`,
            end: `${booking.date}T${booking.end}:00`,
            backgroundColor: member?.color ?? '#b76e79',
            borderColor: 'transparent',
            extendedProps: { status: booking.status, code: booking.code },
          };
        }),
    [bookings, customerMap, locale, serviceMap, staffFilter, staffMap],
  );

  const onEventDrop = async (arg: EventDropArg) => {
    if (!arg.event.start) return;
    const start = arg.event.start;
    const date = toIsoDate(start);
    const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    try {
      await rescheduleBooking(arg.event.id, { date, start: time });
      show(dict.admin.calendar.moved, 'success');
      await load();
    } catch {
      arg.revert();
      show(dict.errors.slot_unavailable, 'error');
    }
  };

  const onEventClick = (arg: EventClickArg) => {
    const booking = bookings.find((item) => item.id === arg.event.id) ?? null;
    setSelected(booking);
  };

  const changeStatus = async (status: 'completed' | 'no_show') => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateBookingStatus(selected.id, status);
      show(dict.common.saved, 'success');
      setSelected(null);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await cancelBooking(selected.id);
      show(dict.account.cancelled, 'success');
      setSelected(null);
      await load();
    } catch {
      show(dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!manualOpen || !manual.serviceId) return;
    let alive = true;
    setLoadingSlots(true);
    getAvailabilityFor(manual.serviceId, manual.date, manual.staffId === 'any' ? undefined : manual.staffId)
      .then((day) => {
        if (alive) setAvailability(day);
      })
      .finally(() => {
        if (alive) setLoadingSlots(false);
      });
    return () => {
      alive = false;
    };
  }, [manualOpen, manual.serviceId, manual.date, manual.staffId]);

  const createManual = async () => {
    if (!manual.serviceId || !manual.start) return;
    setBusy(true);
    try {
      const selectedService = serviceMap.get(manual.serviceId);
      const currency: Currency = selectedService ? 'AED' : 'AED';
      await createBooking({
        serviceId: manual.serviceId,
        staffId: manual.staffId,
        date: manual.date,
        start: manual.start,
        customer: { name: manual.name, phone: manual.phone },
        paymentMethod: manual.paymentMethod,
        currency,
        source: 'walk_in',
        verified: true,
      });
      show(dict.admin.calendar.created, 'success');
      setManualOpen(false);
      setManual({
        serviceId: '',
        staffId: 'any',
        date: todayIso(),
        start: null,
        name: '',
        phone: '',
        paymentMethod: 'in_person',
      });
      await load();
    } catch (error) {
      show(error instanceof Error && error.message === 'slot_unavailable' ? dict.errors.slot_unavailable : dict.errors.generic, 'error');
    } finally {
      setBusy(false);
    }
  };

  const manualService = manual.serviceId ? serviceMap.get(manual.serviceId) : null;
  const eligibleStaff = manualService
    ? staff.filter((member) => member.services.includes(manualService.id))
    : staff;

  return (
    <div className="space-y-4">
      <SectionHeader
        title={dict.admin.calendar.title}
        subtitle={dict.admin.calendar.subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
              className="h-9 w-40 py-1 text-xs"
              aria-label={dict.admin.bookings.filterStaff}
            >
              <option value="all">{dict.admin.calendar.allStaff}</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name[locale]}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={() => setManualOpen(true)}>
              {dict.admin.calendar.newBooking}
            </Button>
          </div>
        }
      />

      <div className="card p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().prev()}
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
              aria-label="previous"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().today()}
              className="h-8 rounded-full border border-line px-3 text-[11px] text-muted transition hover:text-ink"
            >
              {dict.common.today}
            </button>
            <button
              type="button"
              onClick={() => calendarRef.current?.getApi().next()}
              className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
              aria-label="next"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="text-xs font-medium">{rangeLabel}</p>

          <div className="flex rounded-full border border-line bg-elevated/60 p-0.5 text-[11px]">
            {(
              [
                { value: 'timeGridWeek', label: dict.admin.calendar.week },
                { value: 'timeGridDay', label: dict.admin.calendar.day },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setView(option.value);
                  calendarRef.current?.getApi().changeView(option.value);
                }}
                className={cn(
                  'rounded-full px-3 py-1 transition',
                  view === option.value ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            editable
            eventDurationEditable={false}
            allDaySlot={false}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            height="auto"
            nowIndicator
            direction={locale === 'fa' ? 'rtl' : 'ltr'}
            events={events}
            eventDrop={onEventDrop}
            eventClick={onEventClick}
            datesSet={(arg) => {
              setView(arg.view.type as 'timeGridDay' | 'timeGridWeek');
              setRangeLabel(
                arg.view.type === 'timeGridDay'
                  ? formatDate(toIsoDate(arg.view.currentStart), locale, 'weekday')
                  : formatDate(toIsoDate(arg.view.currentStart), locale, 'month'),
              );
            }}
            eventContent={(arg) => (
              <div className="flex flex-col gap-0.5 overflow-hidden px-1 py-0.5 text-[10px] leading-tight text-white">
                <span className="font-medium">
                  {formatTime(arg.timeText.split(' ')[0], locale)} {arg.event.extendedProps.code}
                </span>
                <span className="truncate opacity-90">{arg.event.title}</span>
              </div>
            )}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
        <p className="mt-2 text-[10px] text-muted">{dict.admin.calendar.dragHint}</p>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={dict.admin.calendar.details}
        subtitle={selected?.code}
        footer={
          selected && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" size="sm" onClick={doCancel} loading={busy}>
                {dict.admin.calendar.cancelBooking}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => changeStatus('no_show')} loading={busy}>
                {dict.admin.calendar.markNoShow}
              </Button>
              <Button size="sm" onClick={() => changeStatus('completed')} loading={busy}>
                {dict.admin.calendar.markCompleted}
              </Button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.admin.bookings.customer}</span>
              <span className="font-medium">{customerMap.get(selected.customerId)?.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.common.phone}</span>
              <span dir="ltr">{customerMap.get(selected.customerId)?.phone}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.admin.bookings.service}</span>
              <span>{serviceMap.get(selected.serviceId)?.name[locale]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.admin.bookings.staff}</span>
              <span>{staffMap.get(selected.staffId)?.name[locale]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.admin.bookings.dateTime}</span>
              <span>
                {formatDate(selected.date, locale, 'long')} · {formatTime(selected.start, locale)} –{' '}
                {formatTime(selected.end, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">{dict.common.total}</span>
              <span className="font-semibold">{formatMoney(selected.price, selected.currency, locale)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">{dict.common.status}</span>
              <BookingStatusBadge status={selected.status} dict={dict} />
            </div>
            {selected.notes && <p className="rounded-xl bg-elevated/60 p-2 text-[11px] text-muted">{selected.notes}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title={dict.admin.calendar.manualTitle}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setManualOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button
              onClick={createManual}
              loading={busy}
              disabled={!manual.serviceId || !manual.start || manual.name.length < 2 || manual.phone.length < 10}
            >
              {dict.admin.calendar.create}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={dict.admin.bookings.service}>
            <Select
              value={manual.serviceId}
              onChange={(event) => setManual({ ...manual, serviceId: event.target.value, start: null })}
            >
              <option value="">—</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name[locale]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.admin.bookings.staff}>
            <Select
              value={manual.staffId}
              onChange={(event) => setManual({ ...manual, staffId: event.target.value, start: null })}
            >
              <option value="any">{dict.booking.anyStaff}</option>
              {eligibleStaff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name[locale]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.admin.calendar.customerName}>
            <Input
              value={manual.name}
              onChange={(event) => setManual({ ...manual, name: event.target.value })}
              placeholder={dict.booking.namePlaceholder}
            />
          </Field>
          <Field label={dict.admin.calendar.customerPhone}>
            <Input
              value={manual.phone}
              onChange={(event) => setManual({ ...manual, phone: event.target.value })}
              placeholder="0500000000"
              dir="ltr"
              inputMode="tel"
            />
          </Field>
          <Field label={dict.booking.paymentTitle}>
            <Select
              value={manual.paymentMethod}
              onChange={(event) => setManual({ ...manual, paymentMethod: event.target.value as PaymentMethod })}
            >
              <option value="in_person">{dict.status.method.in_person}</option>
              <option value="deposit">{dict.status.method.deposit}</option>
              <option value="full">{dict.status.method.full}</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <JalaliCalendar
                value={manual.date}
                onChange={(next) => setManual({ ...manual, date: next, start: null })}
                locale={locale}
              />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">{dict.admin.calendar.pickSlot}</p>
                {!manual.serviceId && <p className="text-[11px] text-muted">{dict.admin.bookings.service}</p>}
                {manual.serviceId && loadingSlots && <p className="text-[11px] text-muted">{dict.common.loading}</p>}
                {manual.serviceId && !loadingSlots && availability?.closed && (
                  <p className="text-[11px] text-muted">{dict.booking.closedDayOff}</p>
                )}
                {manual.serviceId && !loadingSlots && availability && !availability.closed && (
                  <div className="grid max-h-52 grid-cols-4 gap-1.5 overflow-y-auto">
                    {availability.slots.map((slot: Slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setManual({ ...manual, start: slot.start })}
                        className={cn(
                          'rounded-lg border px-1 py-2 text-[11px] tabular-nums transition',
                          manual.start === slot.start
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
                <p className="text-[10px] text-muted">
                  {toPersianDigits(formatDate(manual.date, locale, 'long'))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
