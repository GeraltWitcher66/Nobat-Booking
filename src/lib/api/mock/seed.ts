import servicesJson from '@/data/services.json';
import staffJson from '@/data/staff.json';
import customersJson from '@/data/customers.json';
import reviewsJson from '@/data/reviews.json';
import galleryJson from '@/data/gallery.json';
import settingsJson from '@/data/settings.json';
import type {
  Booking,
  BookingStatus,
  Currency,
  Customer,
  GalleryItem,
  Holiday,
  PaymentMethod,
  Review,
  Service,
  Settings,
  Staff,
  TimeOff,
} from '@/types';
import { dayKeyOf, toIsoDate } from '@/lib/availability';
import { addMinutesToTime, timeToMinutes } from '@/lib/time';

export const DB_VERSION = 3;

export interface Database {
  version: number;
  seededAt: string;
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  bookings: Booking[];
  reviews: Review[];
  gallery: GalleryItem[];
  holidays: Holiday[];
  timeOff: TimeOff[];
  settings: Settings;
}

const DEMO_BOOKING_TARGET = 40;

/** Deterministic PRNG so the demo looks the same within a day, but shifts every day. */
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(items: T[], random: () => number): T =>
  items[Math.floor(random() * items.length)];

const shiftIso = (base: Date, days: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

const bookingCode = (random: () => number): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)];
  }
  return `NB-${code}`;
};

export const buildSeed = (now = new Date()): Database => {
  const services = servicesJson as Service[];
  const staff = staffJson as Staff[];
  const customers = customersJson as Customer[];
  const settings = settingsJson as Settings;

  const todayIso = toIsoDate(now);
  const random = createRandom(Number(todayIso.replace(/-/g, '')) % 100000);

  const holidays: Holiday[] = [
    {
      id: 'hol_1',
      date: shiftIso(now, 9),
      title: { fa: 'تعطیلی رسمی — روز ملی', en: 'Public holiday — National Day' },
    },
    {
      id: 'hol_2',
      date: shiftIso(now, 18),
      title: { fa: 'تعطیلی سالن (بازآموزی تیم)', en: 'Clinic closed — team training' },
    },
  ];

  const timeOff: TimeOff[] = [
    {
      id: 'to_1',
      staffId: 'stf_maryam',
      fromDate: shiftIso(now, 4),
      toDate: shiftIso(now, 5),
      reason: 'مرخصی شخصی / Personal leave',
      status: 'approved',
      createdAt: todayIso,
    },
    {
      id: 'to_2',
      staffId: 'stf_negar',
      fromDate: shiftIso(now, 7),
      toDate: shiftIso(now, 7),
      reason: 'دوره آموزشی / Training day',
      status: 'pending',
      createdAt: todayIso,
    },
  ];

  // Occupancy per staff/date so generated bookings never collide.
  const occupied = new Map<string, { start: number; end: number }[]>();
  const bookings: Booking[] = [];

  const days = Array.from({ length: 28 }, (_, index) => shiftIso(now, index - 14));
  const plan = days.map((date) => ({ date, count: random() < 0.42 ? 2 : 1 }));

  let created = 0;
  for (const entry of plan) {
    for (let attempt = 0; attempt < entry.count && created < DEMO_BOOKING_TARGET; attempt += 1) {
      const service = pick(services, random);
      const candidates = staff.filter(
        (member) =>
          member.active &&
          service.staffIds.includes(member.id) &&
          member.schedule[dayKeyOf(entry.date)],
      );
      if (candidates.length === 0) continue;

      const member = pick(candidates, random);
      const workingDay = member.schedule[dayKeyOf(entry.date)];
      if (!workingDay) continue;

      const key = `${member.id}|${entry.date}`;
      const blocks = occupied.get(key) ?? [];
      const dayStart = timeToMinutes(workingDay.start);
      const dayEnd = timeToMinutes(workingDay.end);
      const total = service.durationMin + service.bufferMin;

      const possibleStarts: number[] = [];
      for (let start = dayStart; start + total <= dayEnd; start += 15) {
        const collidesBooking = blocks.some((block) => start < block.end && block.start < start + total);
        const collidesBreak = member.breaks.some(
          (brk) => start < timeToMinutes(brk.end) && timeToMinutes(brk.start) < start + total,
        );
        if (!collidesBooking && !collidesBreak) possibleStarts.push(start);
      }
      if (possibleStarts.length === 0) continue;

      const startMinutes = pick(possibleStarts, random);
      const startTime = addMinutesToTime('00:00', startMinutes);
      const endTime = addMinutesToTime(startTime, service.durationMin);
      blocks.push({ start: startMinutes, end: startMinutes + total });
      occupied.set(key, blocks);

      const customer = pick(customers, random);
      const currency: Currency = 'AED';
      const isPast = entry.date < todayIso;
      const statusRoll = random();
      let status: BookingStatus;
      if (isPast) {
        status = statusRoll < 0.82 ? 'completed' : statusRoll < 0.92 ? 'no_show' : 'cancelled';
      } else if (entry.date === todayIso) {
        status = statusRoll < 0.7 ? 'completed' : 'confirmed';
      } else {
        status = statusRoll < 0.86 ? 'confirmed' : 'pending';
      }

      const paymentMethod: PaymentMethod =
        status === 'cancelled' ? 'in_person' : pick<PaymentMethod>(['full', 'deposit', 'in_person'], random);
      const price = service.prices[currency];
      const depositAmount = Math.round((price * settings.depositPercent) / 100);

      created += 1;
      bookings.push({
        id: `bk_${created}_${entry.date.replace(/-/g, '')}`,
        code: bookingCode(random),
        serviceId: service.id,
        staffId: member.id,
        customerId: customer.id,
        date: entry.date,
        start: startTime,
        end: endTime,
        durationMin: service.durationMin,
        bufferMin: service.bufferMin,
        status,
        price,
        currency,
        paymentMethod,
        paymentStatus:
          status === 'cancelled'
            ? 'refunded'
            : paymentMethod === 'full'
              ? 'paid'
              : paymentMethod === 'deposit'
                ? 'deposit'
                : 'unpaid',
        depositAmount: paymentMethod === 'deposit' ? depositAmount : undefined,
        source: random() < 0.72 ? 'online' : random() < 0.5 ? 'phone' : 'walk_in',
        verified: true,
        createdAt: `${entry.date}T09:00:00.000Z`,
      });
    }
  }

  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    services,
    staff,
    customers,
    bookings,
    reviews: reviewsJson as Review[],
    gallery: galleryJson as GalleryItem[],
    holidays,
    timeOff,
    settings,
  };
};
