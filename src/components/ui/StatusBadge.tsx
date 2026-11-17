import type { BookingStatus, PaymentStatus } from '@/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import { cn } from '@/lib/cn';

const bookingTones: Record<BookingStatus, string> = {
  confirmed: 'bg-success/10 text-success border-success/25',
  pending: 'bg-warning/10 text-warning border-warning/25',
  completed: 'bg-primary-soft text-primary border-primary/20',
  cancelled: 'bg-muted/10 text-muted border-line',
  no_show: 'bg-danger/10 text-danger border-danger/25',
};

export const BookingStatusBadge = ({
  status,
  dict,
  className,
}: {
  status: BookingStatus;
  dict: Dictionary;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
      bookingTones[status],
      className,
    )}
  >
    {dict.status.booking[status]}
  </span>
);

const paymentTones: Record<PaymentStatus, string> = {
  paid: 'bg-success/10 text-success border-success/25',
  deposit: 'bg-accent-soft text-accent border-accent/30',
  unpaid: 'bg-muted/10 text-muted border-line',
  refunded: 'bg-danger/10 text-danger border-danger/25',
};

export const PaymentBadge = ({
  status,
  dict,
  className,
}: {
  status: PaymentStatus;
  dict: Dictionary;
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]',
      paymentTones[status],
      className,
    )}
  >
    {dict.status.payment[status]}
  </span>
);
