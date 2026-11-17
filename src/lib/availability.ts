import type {
  Booking,
  DayAvailability,
  DayKey,
  Holiday,
  Service,
  Slot,
  SlotBlockReason,
  Staff,
  TimeOff,
} from '@/types';
import { addMinutesToTime, rangesOverlap, timeToMinutes } from './time';

const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Weekday key of an ISO calendar date (`YYYY-MM-DD`), read in local time. */
export const dayKeyOf = (iso: string): DayKey => {
  const date = new Date(`${iso}T00:00:00`);
  return DAY_KEYS[date.getDay()];
};

export const dayKeyLabels: Record<DayKey, { fa: string; en: string }> = {
  sat: { fa: 'شنبه', en: 'Saturday' },
  sun: { fa: 'یکشنبه', en: 'Sunday' },
  mon: { fa: 'دوشنبه', en: 'Monday' },
  tue: { fa: 'سه‌شنبه', en: 'Tuesday' },
  wed: { fa: 'چهارشنبه', en: 'Wednesday' },
  thu: { fa: 'پنجشنبه', en: 'Thursday' },
  fri: { fa: 'جمعه', en: 'Friday' },
};

/** Ordered for display in this market: the week starts on Saturday. */
export const weekOrder: DayKey[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

export interface AvailabilityOptions {
  date: string;
  service: Service;
  staff: Staff[];
  bookings: Booking[];
  holidays?: Holiday[];
  timeOff?: TimeOff[];
  /** Minutes between two selectable starts. */
  slotStepMin?: number;
  /** Minimum notice for same-day bookings. */
  leadTimeMin?: number;
  /** Reference clock, injected for testability. */
  now?: Date;
}

interface Interval {
  start: number;
  end: number;
}

const ACTIVE_BOOKING_STATUSES = new Set<Booking['status']>(['pending', 'confirmed', 'completed']);

const occupiedIntervals = (
  staffId: string,
  date: string,
  bookings: Booking[],
  staffMember: Staff,
): { blocks: Interval[]; hasBooking: boolean } => {
  const staffBookings = bookings.filter(
    (booking) =>
      booking.staffId === staffId &&
      booking.date === date &&
      ACTIVE_BOOKING_STATUSES.has(booking.status),
  );

  const blocks: Interval[] = staffBookings.map((booking) => ({
    start: timeToMinutes(booking.start),
    // The buffer after an appointment belongs to that appointment.
    end: timeToMinutes(booking.end) + booking.bufferMin,
  }));

  for (const brk of staffMember.breaks) {
    blocks.push({ start: timeToMinutes(brk.start), end: timeToMinutes(brk.end) });
  }

  return { blocks, hasBooking: staffBookings.length > 0 };
};

const isDateCovered = (date: string, timeOff: TimeOff[]): boolean =>
  timeOff.some(
    (entry) =>
      entry.status === 'approved' && entry.fromDate <= date && entry.toDate >= date,
  );

/**
 * Builds every selectable start time for a service on a date.
 *
 * A start time is free when, for at least one eligible staff member:
 * - the day is a working day and the staff member is not on approved leave,
 * - the appointment plus its cleanup buffer fits inside working hours,
 * - it does not collide with a booking (including its buffer) or a break,
 * - it is not in the past, respecting the minimum notice for today.
 *
 * Blocked times are returned as well (`available: false`) so the UI can render them greyed out.
 */
export const getAvailability = ({
  date,
  service,
  staff,
  bookings,
  holidays = [],
  timeOff = [],
  slotStepMin = 15,
  leadTimeMin = 60,
  now = new Date(),
}: AvailabilityOptions): DayAvailability => {
  const holiday = holidays.find((entry) => entry.date === date);
  if (holiday) {
    return { date, closed: true, closedReason: 'holiday', holiday, slots: [] };
  }

  const eligibleStaff = staff.filter(
    (member) => member.active && member.services.includes(service.id),
  );
  if (eligibleStaff.length === 0) {
    return { date, closed: true, closedReason: 'day_off', slots: [] };
  }

  const dayKey = dayKeyOf(date);
  const totalNeeded = service.durationMin + service.bufferMin;
  const todayIso = toIsoDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const scheduledStaff = eligibleStaff.filter((member) => member.schedule[dayKey]);
  if (scheduledStaff.length === 0) {
    return { date, closed: true, closedReason: 'day_off', slots: [] };
  }

  const onDutyStaff = scheduledStaff.filter(
    (member) => !isDateCovered(date, timeOff.filter((entry) => entry.staffId === member.id)),
  );
  if (onDutyStaff.length === 0) {
    return { date, closed: true, closedReason: 'time_off', slots: [] };
  }

  const freeStaffByStart = new Map<string, string[]>();
  const blockedReasonByStart = new Map<string, SlotBlockReason>();
  const slotEnds = new Map<string, string>();

  for (const member of onDutyStaff) {
    const workingDay = member.schedule[dayKey];
    if (!workingDay) continue;

    const dayStart = timeToMinutes(workingDay.start);
    const dayEnd = timeToMinutes(workingDay.end);
    const { blocks, hasBooking } = occupiedIntervals(member.id, date, bookings, member);

    for (let start = dayStart; start + totalNeeded <= dayEnd; start += slotStepMin) {
      const end = start + service.durationMin;
      const blockEnd = end + service.bufferMin;
      const startLabel = minutesLabel(start);
      const endLabel = minutesLabel(end);

      let reason: SlotBlockReason | undefined;
      if (date < todayIso) {
        reason = 'past';
      } else if (date === todayIso && start < nowMinutes + leadTimeMin) {
        reason = 'past';
      } else if (blocks.some((block) => rangesOverlap(start, blockEnd, block.start, block.end))) {
        const overlapsBooking = bookings.some(
          (booking) =>
            booking.staffId === member.id &&
            booking.date === date &&
            ACTIVE_BOOKING_STATUSES.has(booking.status) &&
            rangesOverlap(
              start,
              blockEnd,
              timeToMinutes(booking.start),
              timeToMinutes(booking.end) + booking.bufferMin,
            ),
        );
        reason = overlapsBooking ? 'booked' : 'break';
      }

      if (reason) {
        if (!blockedReasonByStart.has(startLabel) || reason === 'booked') {
          blockedReasonByStart.set(startLabel, reason);
        }
      } else {
        const list = freeStaffByStart.get(startLabel) ?? [];
        list.push(member.id);
        freeStaffByStart.set(startLabel, list);
      }

      if (!slotEnds.has(startLabel)) slotEnds.set(startLabel, endLabel);
      void hasBooking;
    }
  }

  const starts = Array.from(new Set([...freeStaffByStart.keys(), ...blockedReasonByStart.keys()])).sort();

  const slots: Slot[] = starts.map((start) => {
    const staffIds = freeStaffByStart.get(start) ?? [];
    return {
      start,
      end: slotEnds.get(start) ?? addMinutesToTime(start, service.durationMin),
      staffIds,
      available: staffIds.length > 0,
      reason: staffIds.length > 0 ? undefined : blockedReasonByStart.get(start),
    };
  });

  return { date, closed: false, slots };
};

const minutesLabel = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** First available start on a date, respecting a preferred staff member. */
export const findFirstAvailable = (
  day: DayAvailability,
  preferredStaffId?: string,
): Slot | undefined =>
  day.slots.find(
    (slot) =>
      slot.available && (!preferredStaffId || slot.staffIds.includes(preferredStaffId)),
  );
