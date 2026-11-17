export type ID = string;
export type Locale = 'fa' | 'en';
export type LocalizedText = { fa: string; en: string };
export type Currency = 'AED' | 'IRR';

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type ServiceCategory =
  | 'hair'
  | 'color'
  | 'treatment'
  | 'makeup'
  | 'nails'
  | 'brows'
  | 'skin'
  | 'lashes';

export interface Service {
  id: ID;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  category: ServiceCategory;
  /** Hands-on duration of the appointment, in minutes. */
  durationMin: number;
  /** Cleanup / preparation gap reserved after the appointment. */
  bufferMin: number;
  prices: Record<Currency, number>;
  staffIds: ID[];
  image: string;
  featured?: boolean;
  active: boolean;
}

export interface WorkingDay {
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
}

export interface StaffBreak {
  start: string;
  end: string;
  label?: LocalizedText;
}

export interface Staff {
  id: ID;
  name: LocalizedText;
  role: LocalizedText;
  bio: LocalizedText;
  avatar: string;
  services: ID[];
  rating: number;
  reviewsCount: number;
  schedule: Record<DayKey, WorkingDay | null>;
  breaks: StaffBreak[];
  /** Accent colour used in calendars. */
  color: string;
  email: string;
  active: boolean;
}

export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOff {
  id: ID;
  staffId: ID;
  fromDate: string;
  /** Inclusive. */
  toDate: string;
  reason?: string;
  status: TimeOffStatus;
  createdAt: string;
}

export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  notes: string;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'full' | 'deposit' | 'in_person';
export type PaymentStatus = 'paid' | 'deposit' | 'unpaid' | 'refunded';
export type BookingSource = 'online' | 'walk_in' | 'phone';

export interface Booking {
  id: ID;
  code: string;
  serviceId: ID;
  staffId: ID;
  customerId: ID;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  durationMin: number;
  bufferMin: number;
  status: BookingStatus;
  price: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  depositAmount?: number;
  notes?: string;
  source: BookingSource;
  verified: boolean;
  createdAt: string;
}

export interface Review {
  id: ID;
  author: LocalizedText;
  rating: number;
  text: LocalizedText;
  serviceId?: ID;
  date: string;
  avatar: string;
}

export interface Holiday {
  id: ID;
  date: string;
  title: LocalizedText;
}

export interface GalleryItem {
  id: ID;
  image: string;
  caption: LocalizedText;
  category: string;
}

export interface Settings {
  salonName: LocalizedText;
  tagline: LocalizedText;
  phone: string;
  whatsapp: string;
  email: string;
  address: LocalizedText;
  cancellation: {
    hoursBefore: number;
    policy: LocalizedText;
  };
  depositPercent: number;
  /** Minutes between two selectable start times. */
  slotStepMin: number;
  /** Minimum notice for a booking on the current day. */
  leadTimeMin: number;
  defaultCurrency: Currency;
  sms: {
    confirmation: LocalizedText;
    reminder: LocalizedText;
    cancellation: LocalizedText;
  };
}

export type SlotBlockReason = 'booked' | 'break' | 'past' | 'time_off' | 'off_hours';

export interface Slot {
  start: string;
  end: string;
  /** Staff that are free for this start time (empty when blocked). */
  staffIds: ID[];
  available: boolean;
  reason?: SlotBlockReason;
}

export interface DayAvailability {
  date: string;
  closed: boolean;
  closedReason?: 'holiday' | 'day_off' | 'time_off';
  holiday?: Holiday;
  slots: Slot[];
}

export type AuthRole = 'customer' | 'admin' | 'staff';

export interface Session {
  role: AuthRole;
  /** Customer id for customers, staff id for staff, "admin" for the manager. */
  subjectId: string;
  name: string;
  email?: string;
  phone?: string;
  loggedInAt: string;
}

export interface DashboardStats {
  todayCount: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  capacityRate: number;
  noShowCount: number;
  activeCustomers: number;
  avgTicket: number;
  revenueSeries: { date: string; label: string; revenue: number; bookings: number }[];
  statusBreakdown: { status: BookingStatus; count: number }[];
  topServices: { serviceId: ID; name: LocalizedText; count: number; revenue: number }[];
}
