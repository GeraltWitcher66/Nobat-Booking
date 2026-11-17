import type {
  Booking,
  BookingSource,
  BookingStatus,
  Currency,
  Customer,
  DayAvailability,
  DashboardStats,
  PaymentMethod,
  Service,
} from '@/types';
import { getAvailability, toIsoDate } from '@/lib/availability';
import { timeToMinutes } from '@/lib/time';
import { ApiError, latency } from './latency';
import { loadDb, mutateDb } from './store';

export interface BookingFilter {
  from?: string;
  to?: string;
  staffId?: string;
  customerId?: string;
  status?: BookingStatus[];
}

export interface CreateBookingInput {
  serviceId: string;
  /** `'any'` lets the engine choose the freest specialist. */
  staffId: string | 'any';
  date: string;
  start: string;
  customer: { name: string; phone: string; email?: string };
  paymentMethod: PaymentMethod;
  currency: Currency;
  notes?: string;
  source?: BookingSource;
  verified?: boolean;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = (existing: Booking[]): string => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const body = Array.from({ length: 4 }, () =>
      CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
    const code = `NB-${body}`;
    if (!existing.some((booking) => booking.code === code)) return code;
  }
  return `NB-${Date.now().toString(36).slice(-4).toUpperCase()}`;
};

const normalizePhone = (phone: string): string => phone.trim().replace(/\s+/g, '');

const ensureCustomer = (customers: Customer[], input: CreateBookingInput['customer']): Customer => {
  const phone = normalizePhone(input.phone);
  const existing = customers.find((customer) => customer.phone === phone);
  if (existing) {
    if (!existing.name && input.name) existing.name = input.name;
    return existing;
  }
  const created: Customer = {
    id: `cus_${Date.now().toString(36)}`,
    name: input.name.trim(),
    phone,
    email: input.email,
    notes: '',
    createdAt: toIsoDate(new Date()),
  };
  customers.push(created);
  return created;
};

const sortBookings = (bookings: Booking[]): Booking[] =>
  [...bookings].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );

export const getBookings = async (filter: BookingFilter = {}): Promise<Booking[]> => {
  await latency();
  const { bookings } = loadDb();
  return sortBookings(
    bookings.filter((booking) => {
      if (filter.from && booking.date < filter.from) return false;
      if (filter.to && booking.date > filter.to) return false;
      if (filter.staffId && booking.staffId !== filter.staffId) return false;
      if (filter.customerId && booking.customerId !== filter.customerId) return false;
      if (filter.status && !filter.status.includes(booking.status)) return false;
      return true;
    }),
  );
};

export const getBookingById = async (id: string): Promise<Booking | null> => {
  await latency();
  return loadDb().bookings.find((booking) => booking.id === id) ?? null;
};

export const getBookingByCode = async (code: string): Promise<Booking | null> => {
  await latency();
  const normalized = code.trim().toUpperCase();
  return loadDb().bookings.find((booking) => booking.code.toUpperCase() === normalized) ?? null;
};

export const getAvailabilityFor = async (
  serviceId: string,
  date: string,
  staffId?: string,
): Promise<DayAvailability> => {
  await latency();
  const db = loadDb();
  const service = db.services.find((item) => item.id === serviceId);
  if (!service) throw new ApiError('service_not_found');

  const day = getAvailability({
    date,
    service,
    staff: staffId && staffId !== 'any' ? db.staff.filter((member) => member.id === staffId) : db.staff,
    bookings: db.bookings,
    holidays: db.holidays,
    timeOff: db.timeOff,
    slotStepMin: db.settings.slotStepMin,
    leadTimeMin: db.settings.leadTimeMin,
  });

  return day;
};

export const getNextAvailableSlot = async (
  serviceId: string,
  fromDate: string,
  maxDays = 21,
): Promise<{ date: string; start: string } | null> => {
  const db = loadDb();
  const service = db.services.find((item) => item.id === serviceId);
  if (!service) return null;

  const startDate = new Date(`${fromDate}T00:00:00`);
  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);
    const iso = toIsoDate(date);
    const day = getAvailability({
      date: iso,
      service,
      staff: db.staff,
      bookings: db.bookings,
      holidays: db.holidays,
      timeOff: db.timeOff,
      slotStepMin: db.settings.slotStepMin,
      leadTimeMin: db.settings.leadTimeMin,
    });
    const slot = day.slots.find((entry) => entry.available);
    if (slot) return { date: iso, start: slot.start };
  }
  return null;
};

export const createBooking = async (input: CreateBookingInput): Promise<Booking> => {
  await latency(420);

  return mutateDb((db) => {
    const service = db.services.find((item) => item.id === input.serviceId);
    if (!service) throw new ApiError('service_not_found');

    const day = getAvailability({
      date: input.date,
      service,
      staff: db.staff,
      bookings: db.bookings,
      holidays: db.holidays,
      timeOff: db.timeOff,
      slotStepMin: db.settings.slotStepMin,
      leadTimeMin: db.settings.leadTimeMin,
    });

    const slot = day.slots.find((entry) => entry.start === input.start && entry.available);
    if (!slot) throw new ApiError('slot_unavailable');

    const preferred = input.staffId !== 'any' && slot.staffIds.includes(input.staffId) ? input.staffId : null;
    const staffId =
      preferred ??
      slot.staffIds
        .map((id) => ({
          id,
          load: db.bookings.filter(
            (booking) => booking.staffId === id && booking.date === input.date,
          ).length,
        }))
        .sort((a, b) => a.load - b.load)[0].id;

    const customer = ensureCustomer(db.customers, input.customer);
    const price = service.prices[input.currency];
    const depositAmount = Math.round((price * db.settings.depositPercent) / 100);

    const booking: Booking = {
      id: `bk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      code: generateCode(db.bookings),
      serviceId: service.id,
      staffId,
      customerId: customer.id,
      date: input.date,
      start: input.start,
      end: slot.end,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      status: input.verified === false ? 'pending' : 'confirmed',
      price,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      paymentStatus:
        input.paymentMethod === 'full' ? 'paid' : input.paymentMethod === 'deposit' ? 'deposit' : 'unpaid',
      depositAmount: input.paymentMethod === 'deposit' ? depositAmount : undefined,
      notes: input.notes,
      source: input.source ?? 'online',
      verified: input.verified ?? true,
      createdAt: new Date().toISOString(),
    };

    db.bookings.push(booking);
    return booking;
  });
};

export const cancelBooking = async (id: string): Promise<Booking> => {
  await latency();
  return mutateDb((db) => {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking) throw new ApiError('booking_not_found');
    if (booking.status === 'completed') throw new ApiError('booking_already_completed');
    booking.status = 'cancelled';
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'deposit') {
      booking.paymentStatus = 'refunded';
    }
    return booking;
  });
};

export const rescheduleBooking = async (
  id: string,
  input: { date: string; start: string; staffId?: string },
): Promise<Booking> => {
  await latency(380);
  return mutateDb((db) => {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking) throw new ApiError('booking_not_found');

    const service = db.services.find((item) => item.id === booking.serviceId);
    if (!service) throw new ApiError('service_not_found');

    const day = getAvailability({
      date: input.date,
      service,
      staff: db.staff,
      // Exclude the booking being moved so it does not block itself.
      bookings: db.bookings.filter((entry) => entry.id !== id),
      holidays: db.holidays,
      timeOff: db.timeOff,
      slotStepMin: db.settings.slotStepMin,
      leadTimeMin: db.settings.leadTimeMin,
    });

    const slot = day.slots.find((entry) => entry.start === input.start && entry.available);
    if (!slot) throw new ApiError('slot_unavailable');

    const staffId =
      input.staffId && slot.staffIds.includes(input.staffId) ? input.staffId : slot.staffIds[0];

    booking.date = input.date;
    booking.start = input.start;
    booking.end = slot.end;
    booking.staffId = staffId;
    if (booking.status === 'cancelled') booking.status = 'confirmed';
    return booking;
  });
};

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus,
): Promise<Booking> => {
  await latency();
  return mutateDb((db) => {
    const booking = db.bookings.find((item) => item.id === id);
    if (!booking) throw new ApiError('booking_not_found');
    booking.status = status;
    if (status === 'completed' && booking.paymentStatus === 'unpaid') {
      booking.paymentStatus = 'paid';
    }
    return booking;
  });
};

export const getCustomerBookings = async (customerId: string): Promise<Booking[]> => {
  await latency();
  return sortBookings(loadDb().bookings.filter((booking) => booking.customerId === customerId));
};

export const getBookingsForCustomerPhone = async (phone: string): Promise<Booking[]> => {
  await latency();
  const db = loadDb();
  const customer = db.customers.find((item) => item.phone === normalizePhone(phone));
  if (!customer) return [];
  return sortBookings(db.bookings.filter((booking) => booking.customerId === customer.id));
};

const startOfWeek = (date: Date): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay()); // Sunday-based week
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const getDashboardStats = async (now = new Date()): Promise<DashboardStats> => {
  await latency();
  const db = loadDb();
  const todayIso = toIsoDate(now);

  const weekStartIso = toIsoDate(startOfWeek(now));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartIso = toIsoDate(monthStart);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = toIsoDate(thirtyDaysAgo);

  const revenueOf = (booking: Booking) => (booking.status === 'completed' ? booking.price : 0);

  const todayBookings = db.bookings.filter(
    (booking) => booking.date === todayIso && booking.status !== 'cancelled',
  );

  const weekRevenue = db.bookings
    .filter((booking) => booking.date >= weekStartIso && booking.date <= todayIso)
    .reduce((sum, booking) => sum + revenueOf(booking), 0);

  const monthRevenue = db.bookings
    .filter((booking) => booking.date >= monthStartIso && booking.date <= todayIso)
    .reduce((sum, booking) => sum + revenueOf(booking), 0);

  // Capacity: booked minutes ÷ total scheduled minutes for today.
  const totalMinutes = db.staff.reduce((sum, member) => {
    const workingDay = member.schedule[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()] as keyof typeof member.schedule];
    if (!workingDay) return sum;
    return sum + (timeToMinutes(workingDay.end) - timeToMinutes(workingDay.start));
  }, 0);
  const bookedMinutes = todayBookings.reduce(
    (sum, booking) => sum + booking.durationMin + booking.bufferMin,
    0,
  );

  const recent = db.bookings.filter(
    (booking) => booking.date >= thirtyDaysAgoIso && booking.date <= todayIso,
  );

  const revenueSeries = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (13 - index));
    const iso = toIsoDate(date);
    const entries = db.bookings.filter((booking) => booking.date === iso);
    return {
      date: iso,
      label: iso,
      revenue: entries.reduce((sum, booking) => sum + revenueOf(booking), 0),
      bookings: entries.filter((booking) => booking.status !== 'cancelled').length,
    };
  });

  const statuses: BookingStatus[] = ['completed', 'confirmed', 'pending', 'cancelled', 'no_show'];

  const topServicesMap = new Map<string, { count: number; revenue: number }>();
  for (const booking of recent) {
    if (booking.status === 'cancelled') continue;
    const entry = topServicesMap.get(booking.serviceId) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += revenueOf(booking);
    topServicesMap.set(booking.serviceId, entry);
  }

  const topServices = Array.from(topServicesMap.entries())
    .map(([serviceId, entry]) => ({
      serviceId,
      name: db.services.find((service) => service.id === serviceId)?.name ?? { fa: serviceId, en: serviceId },
      count: entry.count,
      revenue: entry.revenue,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const completedRecent = recent.filter((booking) => booking.status === 'completed');

  return {
    todayCount: todayBookings.length,
    todayRevenue: todayBookings.reduce((sum, booking) => sum + revenueOf(booking), 0),
    weekRevenue,
    monthRevenue,
    capacityRate: totalMinutes === 0 ? 0 : Math.min(100, Math.round((bookedMinutes / totalMinutes) * 100)),
    noShowCount: recent.filter((booking) => booking.status === 'no_show').length,
    activeCustomers: new Set(recent.map((booking) => booking.customerId)).size,
    avgTicket:
      completedRecent.length === 0
        ? 0
        : Math.round(
            completedRecent.reduce((sum, booking) => sum + booking.price, 0) / completedRecent.length,
          ),
    revenueSeries,
    statusBreakdown: statuses.map((status) => ({
      status,
      count: recent.filter((booking) => booking.status === status).length,
    })),
    topServices,
  };
};

export const getServiceMap = (services: Service[]): Map<string, Service> =>
  new Map(services.map((service) => [service.id, service]));
