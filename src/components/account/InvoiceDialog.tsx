'use client';

import { brand } from '@/config/brand';
import type { Booking, Customer, Service, Settings, Staff } from '@/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  service?: Service;
  staffMember?: Staff;
  customer?: Customer | null;
  settings: Settings | null;
  locale: Locale;
  dict: Dictionary;
};

export const InvoiceDialog = ({
  open,
  onClose,
  booking,
  service,
  staffMember,
  customer,
  settings,
  locale,
  dict,
}: Props) => {
  if (!booking) return null;

  const rows = [
    { label: dict.booking.service, value: service?.name[locale] ?? '—' },
    { label: dict.booking.staff, value: staffMember?.name[locale] ?? '—' },
    { label: dict.common.date, value: formatDate(booking.date, locale, 'long') },
    {
      label: dict.common.time,
      value: `${formatTime(booking.start, locale)} – ${formatTime(booking.end, locale)}`,
    },
    { label: dict.booking.paymentTitle, value: dict.status.method[booking.paymentMethod] },
    { label: dict.common.status, value: dict.status.payment[booking.paymentStatus] },
  ];

  return (
    <Modal open={open} onClose={onClose} title={dict.account.invoiceTitle} size="md">
      <div className="print-area space-y-4 bg-bg p-1 text-ink">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{settings?.salonName[locale] ?? brand.salonName[locale]}</p>
            <p className="text-[11px] text-muted">{settings?.address[locale] ?? brand.contact.address[locale]}</p>
            <p className="text-[11px] text-muted" dir="ltr">
              {settings?.phone ?? brand.contact.phone}
            </p>
          </div>
          <div className="text-end text-[11px] text-muted">
            <p>
              {dict.account.invoiceNumber}: <span dir="ltr">{booking.code}</span>
            </p>
            <p>
              {dict.account.issuedAt}: {formatDate(booking.date, locale, 'long')}
            </p>
          </div>
        </header>

        <section className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted">{dict.account.customer}</span>
            <span className="font-medium">{customer?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">{dict.common.phone}</span>
            <span dir="ltr">{customer?.phone ?? '—'}</span>
          </div>
        </section>

        <table className="w-full border-collapse text-xs">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line/60">
                <td className="py-2 text-muted">{row.label}</td>
                <td className="py-2 text-end">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-3 text-sm font-semibold">
            <span>{dict.common.total}</span>
            <span>{formatMoney(booking.price, booking.currency, locale)}</span>
          </div>
          {booking.depositAmount ? (
            <>
              <div className="flex justify-between gap-3 text-accent">
                <span>{dict.booking.depositPaid}</span>
                <span>{formatMoney(booking.depositAmount, booking.currency, locale)}</span>
              </div>
              <div className="flex justify-between gap-3 text-muted">
                <span>{dict.booking.dueAtClinic}</span>
                <span>{formatMoney(booking.price - booking.depositAmount, booking.currency, locale)}</span>
              </div>
            </>
          ) : null}
        </div>

        <p className="border-t border-line pt-3 text-[10px] leading-5 text-muted">
          {settings?.cancellation.policy[locale]}
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2 no-print">
        <Button variant="ghost" onClick={onClose}>
          {dict.common.close}
        </Button>
        <Button onClick={() => window.print()}>{dict.common.print}</Button>
      </div>
    </Modal>
  );
};
