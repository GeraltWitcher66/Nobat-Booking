'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBookings, getCustomers, getServices, getStaff, updateBookingStatus } from '@/lib/api';
import { exportToExcel, type SheetRow } from '@/lib/export';
import { formatDate, formatMoney, formatTime, toPersianDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Booking, BookingStatus, Customer, Service, Staff } from '@/types';
import { Button } from '@/components/ui/Button';
import { BookingStatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { Field, Select } from '@/components/ui/Field';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

const STATUSES: BookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled', 'no_show'];

export function BookingsTable({ locale, dict }: Props) {
  const { show } = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [bookingList, serviceList, staffList, customerList] = await Promise.all([
      getBookings(),
      getServices(),
      getStaff(),
      getCustomers(),
    ]);
    setBookings([...bookingList].reverse());
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

  const visible = (bookings ?? []).filter(
    (booking) =>
      (statusFilter === 'all' || booking.status === statusFilter) &&
      (staffFilter === 'all' || booking.staffId === staffFilter),
  );

  const doExport = async () => {
    const rows: SheetRow[] = visible.map((booking) => ({
      code: booking.code,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      service: serviceMap.get(booking.serviceId)?.name.en ?? '',
      staff: staffMap.get(booking.staffId)?.name.en ?? '',
      customer: customerMap.get(booking.customerId)?.name ?? '',
      phone: customerMap.get(booking.customerId)?.phone ?? '',
      status: booking.status,
      payment: booking.paymentStatus,
      method: booking.paymentMethod,
      price: booking.price,
      currency: booking.currency,
      source: booking.source,
    }));
    await exportToExcel(rows, `nobat-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Bookings');
    show(dict.admin.bookings.exportDone, 'success');
  };

  const changeStatus = async (booking: Booking, status: BookingStatus) => {
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

  return (
    <div className="space-y-4">
      <SectionHeader
        title={dict.admin.bookings.title}
        subtitle={dict.admin.bookings.subtitle}
        action={
          <Button variant="ghost" size="sm" onClick={doExport} disabled={visible.length === 0}>
            {dict.admin.bookings.export}
          </Button>
        }
      />

      <div className="card grid gap-3 p-3 sm:grid-cols-3">
        <Field label={dict.admin.bookings.filterStatus}>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">{dict.common.all}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {dict.status.booking[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.admin.bookings.filterStaff}>
          <Select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
            <option value="all">{dict.common.all}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name[locale]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <p className="text-xs text-muted">
            {toPersianDigits(visible.length)} {dict.admin.bookings.count}
          </p>
        </div>
      </div>

      {bookings === null && <Skeleton className="h-40 w-full" />}

      {bookings !== null && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-start text-xs">
              <thead className="bg-elevated/60 text-[11px] text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.code}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.customer}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.service}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.staff}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.dateTime}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.admin.bookings.amount}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.common.status}</th>
                  <th className="px-3 py-2 text-start font-medium">{dict.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.id} className="border-t border-line/60">
                    <td className="px-3 py-2 font-medium" dir="ltr">
                      {booking.code}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block">{customerMap.get(booking.customerId)?.name}</span>
                      <span className="block text-[10px] text-muted" dir="ltr">
                        {customerMap.get(booking.customerId)?.phone}
                      </span>
                    </td>
                    <td className="px-3 py-2">{serviceMap.get(booking.serviceId)?.name[locale]}</td>
                    <td className="px-3 py-2">{staffMap.get(booking.staffId)?.name[locale]}</td>
                    <td className="px-3 py-2">
                      <span className="block">{formatDate(booking.date, locale, 'short')}</span>
                      <span className="block text-[10px] text-muted tabular-nums" dir="ltr">
                        {formatTime(booking.start, locale)} – {formatTime(booking.end, locale)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block tabular-nums">{formatMoney(booking.price, booking.currency, locale)}</span>
                      <PaymentBadge status={booking.paymentStatus} dict={dict} className="mt-1" />
                    </td>
                    <td className="px-3 py-2">
                      <BookingStatusBadge status={booking.status} dict={dict} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => changeStatus(booking, 'completed')}
                              className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success"
                            >
                              {dict.status.booking.completed}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => changeStatus(booking, 'no_show')}
                              className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger"
                            >
                              {dict.status.booking.no_show}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => changeStatus(booking, 'cancelled')}
                              className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted"
                            >
                              {dict.status.booking.cancelled}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs text-muted">
                      {dict.admin.bookings.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
