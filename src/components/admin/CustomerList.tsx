'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBookings, getCustomers, getServices, getStaff, updateCustomer } from '@/lib/api';
import { formatDate, formatMoney, toPersianDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Booking, Customer, Service, Staff } from '@/types';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';

type Props = { locale: Locale; dict: Dictionary };

export function CustomerList({ locale, dict }: Props) {
  const { show } = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [customerList, bookingList, serviceList, staffList] = await Promise.all([
      getCustomers(),
      getBookings(),
      getServices(),
      getStaff(),
    ]);
    setCustomers(customerList);
    setBookings(bookingList);
    setServices(serviceList);
    setStaff(staffList);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const serviceMap = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const staffMap = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const statsFor = (customerId: string) => {
    const own = bookings.filter((booking) => booking.customerId === customerId);
    const completed = own.filter((booking) => booking.status === 'completed');
    return {
      visits: own.filter((booking) => booking.status !== 'cancelled').length,
      total: completed.reduce((sum, booking) => sum + booking.price, 0),
      last: own.length > 0 ? [...own].sort((a, b) => b.date.localeCompare(a.date))[0].date : null,
      history: own,
    };
  };

  const visible = (customers ?? []).filter((customer) => {
    if (!query.trim()) return true;
    const value = query.trim().toLowerCase();
    return customer.name.toLowerCase().includes(value) || customer.phone.includes(value);
  });

  const saveNotes = async (customer: Customer) => {
    setBusy(true);
    try {
      await updateCustomer(customer.id, { notes: draftNotes });
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
      <SectionHeader title={dict.admin.customers.title} subtitle={dict.admin.customers.subtitle} />

      <div className="card p-3">
        <Field label={dict.admin.customers.search}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={dict.admin.customers.search}
          />
        </Field>
      </div>

      {customers === null && <Skeleton className="h-40 w-full" />}

      {customers !== null && visible.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-muted">
          {dict.admin.customers.empty}
        </p>
      )}

      <div className="space-y-2">
        {visible.map((customer) => {
          const info = statsFor(customer.id);
          const isOpen = expanded === customer.id;
          const currency = info.history[0]?.currency ?? 'AED';
          return (
            <div key={customer.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setExpanded(isOpen ? null : customer.id);
                  setDraftNotes(customer.notes);
                }}
                className="flex w-full items-center gap-3 p-3 text-start transition hover:bg-elevated/50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                  {customer.name.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{customer.name}</span>
                  <span className="block text-[11px] text-muted" dir="ltr">
                    {customer.phone}
                  </span>
                </span>
                <span className="hidden shrink-0 text-end text-[11px] text-muted sm:block">
                  <span className="block">
                    {toPersianDigits(info.visits)} {dict.admin.customers.visits}
                  </span>
                  <span className="block">{formatMoney(info.total, currency, locale)}</span>
                </span>
                {info.last && (
                  <span className="hidden shrink-0 text-[11px] text-muted md:block">
                    {dict.admin.customers.lastVisit}: {formatDate(info.last, locale, 'short')}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="grid gap-4 border-t border-line/70 p-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted">{dict.admin.customers.history}</p>
                    {info.history.length === 0 && (
                      <p className="text-[11px] text-muted">{dict.admin.customers.noHistory}</p>
                    )}
                    <ul className="space-y-1.5">
                      {[...info.history]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 8)
                        .map((booking) => (
                          <li
                            key={booking.id}
                            className="flex items-center gap-2 rounded-xl border border-line/60 bg-elevated/40 px-2.5 py-1.5 text-[11px]"
                          >
                            <span className="text-muted">{formatDate(booking.date, locale, 'short')}</span>
                            <span className="min-w-0 flex-1 truncate">
                              {serviceMap.get(booking.serviceId)?.name[locale]}
                            </span>
                            <span className="hidden text-muted sm:inline">
                              {staffMap.get(booking.staffId)?.name[locale]}
                            </span>
                            <BookingStatusBadge status={booking.status} dict={dict} />
                          </li>
                        ))}
                    </ul>
                    <p className="text-[10px] text-muted">
                      {dict.admin.customers.since} {formatDate(customer.createdAt.slice(0, 10), locale, 'long')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Field label={dict.admin.customers.notes}>
                      <Textarea
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        placeholder={dict.admin.customers.notesPlaceholder}
                      />
                    </Field>
                    <Button size="sm" onClick={() => saveNotes(customer)} loading={busy}>
                      {dict.admin.customers.saveNotes}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
