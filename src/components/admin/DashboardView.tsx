'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getBookings,
  getCustomers,
  getDashboardStats,
  getServices,
  getStaff,
  resetDemoData,
  updateBookingStatus,
} from '@/lib/api';
import { exportToExcel, type SheetRow } from '@/lib/export';
import { formatDate, formatMoney, formatTime, toPersianDigits } from '@/lib/format';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Booking, Customer, DashboardStats, Service, Staff } from '@/types';
import { Button } from '@/components/ui/Button';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { SectionHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/ToastProvider';
import { StatCard } from './StatCard';

type Props = { locale: Locale; dict: Dictionary };

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function DashboardView({ locale, dict }: Props) {
  const { show } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const today = todayIso();
    const [statsValue, bookings, serviceList, staffList, customerList] = await Promise.all([
      getDashboardStats(),
      getBookings({ from: today, to: today }),
      getServices(),
      getStaff(),
      getCustomers(),
    ]);
    setStats(statsValue);
    setTodayBookings(bookings);
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

  const currency = todayBookings[0]?.currency ?? 'AED';

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

  const doReset = async () => {
    setBusy(true);
    resetDemoData();
    setResetOpen(false);
    show(dict.admin.dashboard.resetDone, 'success');
    await load();
    setBusy(false);
  };

  const exportBookings = async () => {
    const rows: SheetRow[] = todayBookings.map((booking) => ({
      code: booking.code,
      date: booking.date,
      time: `${booking.start}-${booking.end}`,
      service: serviceMap.get(booking.serviceId)?.name.en ?? '',
      staff: staffMap.get(booking.staffId)?.name.en ?? '',
      customer: customerMap.get(booking.customerId)?.name ?? '',
      status: booking.status,
      price: booking.price,
      currency: booking.currency,
    }));
    await exportToExcel(rows, `nobat-bookings-${todayIso()}.xlsx`, 'Bookings');
    show(dict.admin.bookings.exportDone, 'success');
  };

  const chartData = (stats?.revenueSeries ?? []).map((point) => ({
    ...point,
    label: formatDate(point.date, locale, 'short'),
  }));

  const statusColors: Record<string, string> = {
    completed: '#2f7d60',
    confirmed: '#b76e79',
    pending: '#b07c20',
    cancelled: '#8a7a72',
    no_show: '#b04242',
  };

  const statusData = (stats?.statusBreakdown ?? []).map((entry) => ({
    name: dict.status.booking[entry.status],
    value: entry.count,
    status: entry.status,
  }));

  return (
    <div className="space-y-5">
      <SectionHeader
        title={dict.admin.dashboard.title}
        subtitle={dict.admin.dashboard.subtitle}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={exportBookings} disabled={todayBookings.length === 0}>
              {dict.admin.dashboard.export}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
              {dict.admin.dashboard.resetDemo}
            </Button>
          </div>
        }
      />

      {!stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={dict.admin.dashboard.todayBookings}
              value={toPersianDigits(stats.todayCount)}
              hint={formatDate(todayIso(), locale, 'weekday')}
              tone="primary"
            />
            <StatCard label={dict.admin.dashboard.weekRevenue} value={formatMoney(stats.weekRevenue, currency, locale)} />
            <StatCard label={dict.admin.dashboard.monthRevenue} value={formatMoney(stats.monthRevenue, currency, locale)} />
            <StatCard
              label={dict.admin.dashboard.capacity}
              value={`${toPersianDigits(stats.capacityRate)}%`}
              hint={dict.common.today}
              tone="accent"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={dict.admin.dashboard.noShows} value={toPersianDigits(stats.noShowCount)} hint={dict.admin.dashboard.recent} tone="danger" />
            <StatCard label={dict.admin.dashboard.avgTicket} value={formatMoney(stats.avgTicket, currency, locale)} hint={dict.admin.dashboard.recent} />
            <StatCard label={dict.admin.dashboard.activeCustomers} value={toPersianDigits(stats.activeCustomers)} hint={dict.admin.dashboard.recent} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="card p-4">
              <p className="mb-3 text-xs font-medium text-muted">{dict.admin.dashboard.revenueChart}</p>
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b76e79" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#b76e79" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 12,
                        border: '1px solid rgb(var(--c-line))',
                        background: 'rgb(var(--c-surface))',
                        color: 'rgb(var(--c-ink))',
                      }}
                      formatter={(value: number) => [value.toLocaleString('en-US'), dict.common.total]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#b76e79"
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-4">
              <p className="mb-3 text-xs font-medium text-muted">{dict.admin.dashboard.statusChart}</p>
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={82}
                      tick={{ fontSize: 10, fill: 'rgb(var(--c-muted))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 12,
                        border: '1px solid rgb(var(--c-line))',
                        background: 'rgb(var(--c-surface))',
                        color: 'rgb(var(--c-ink))',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={14}>
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={statusColors[entry.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="card p-4">
              <p className="mb-3 text-xs font-medium text-muted">{dict.admin.dashboard.topServices}</p>
              <ol className="space-y-2.5">
                {stats.topServices.map((entry, index) => (
                  <li key={entry.serviceId} className="flex items-center gap-3 text-xs">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-elevated text-[10px] text-muted">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.name[locale]}</span>
                    <span className="text-muted">{toPersianDigits(entry.count)}</span>
                    <span className="w-20 text-end tabular-nums">
                      {formatMoney(entry.revenue, currency, locale)}
                    </span>
                  </li>
                ))}
                {stats.topServices.length === 0 && <li className="text-xs text-muted">{dict.common.empty}</li>}
              </ol>
            </div>

            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-muted">{dict.admin.dashboard.todaySchedule}</p>
                <Link
                  href={`${localePath(locale, 'admin')}/calendar`}
                  className="text-[11px] text-primary hover:underline"
                >
                  {dict.nav.calendar}
                </Link>
              </div>
              {todayBookings.length === 0 && <p className="text-xs text-muted">{dict.admin.dashboard.noBookings}</p>}
              <ul className="space-y-2">
                {todayBookings.slice(0, 6).map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-elevated/40 px-3 py-2 text-xs"
                  >
                    <span className="rounded-lg bg-surface px-2 py-0.5 tabular-nums" dir="ltr">
                      {formatTime(booking.start, locale)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {customerMap.get(booking.customerId)?.name ?? '—'} ·{' '}
                      {serviceMap.get(booking.serviceId)?.name[locale]}
                    </span>
                    <span className="text-[10px] text-muted">
                      {staffMap.get(booking.staffId)?.name[locale]}
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
                          {dict.status.booking.completed}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => markStatus(booking, 'no_show')}
                          className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger"
                        >
                          {dict.status.booking.no_show}
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={dict.admin.dashboard.resetDemo}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button variant="danger" onClick={doReset} loading={busy}>
              {dict.common.confirm}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">{dict.admin.dashboard.resetConfirm}</p>
      </Modal>

      {!stats && <EmptyState title={dict.common.loading} />}
    </div>
  );
}
