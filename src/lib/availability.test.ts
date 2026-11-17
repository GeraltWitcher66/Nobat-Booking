import { describe, expect, it } from 'vitest';
import type { Booking, Service, Staff } from '@/types';
import { getAvailability, toIsoDate } from './availability';

const service: Service = {
  id: 'svc_test',
  slug: 'test',
  name: { fa: 'تست', en: 'Test' },
  description: { fa: '', en: '' },
  category: 'hair',
  durationMin: 30,
  bufferMin: 0,
  prices: { AED: 100, IRR: 1000000 },
  staffIds: ['stf_1'],
  image: '',
  active: true,
};

const makeStaff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 'stf_1',
  name: { fa: 'سارا', en: 'Sara' },
  role: { fa: '', en: '' },
  bio: { fa: '', en: '' },
  avatar: '',
  services: ['svc_test'],
  rating: 5,
  reviewsCount: 0,
  schedule: {
    sun: { start: '10:00', end: '12:00' },
    mon: { start: '10:00', end: '12:00' },
    tue: { start: '10:00', end: '12:00' },
    wed: { start: '10:00', end: '12:00' },
    thu: { start: '10:00', end: '12:00' },
    fri: null,
    sat: { start: '10:00', end: '12:00' },
  },
  breaks: [],
  color: '#000',
  email: 'sara@demo.test',
  active: true,
  ...overrides,
});

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'bk_1',
  code: 'NB-1',
  serviceId: 'svc_test',
  staffId: 'stf_1',
  customerId: 'cus_1',
  date: '2026-03-02',
  start: '10:00',
  end: '10:30',
  durationMin: 30,
  bufferMin: 0,
  status: 'confirmed',
  price: 100,
  currency: 'AED',
  paymentMethod: 'in_person',
  paymentStatus: 'unpaid',
  source: 'online',
  verified: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  ...overrides,
});

// 2026-03-02 is a Monday.
const MONDAY = '2026-03-02';
const referenceNow = new Date('2026-02-20T09:00:00');

const build = (options: Partial<Parameters<typeof getAvailability>[0]> = {}) =>
  getAvailability({
    date: MONDAY,
    service,
    staff: [makeStaff()],
    bookings: [],
    now: referenceNow,
    ...options,
  });

describe('getAvailability', () => {
  it('generates starts that fit inside working hours', () => {
    const day = build();
    expect(day.closed).toBe(false);
    expect(day.slots.map((slot) => slot.start)).toEqual([
      '10:00',
      '10:15',
      '10:30',
      '10:45',
      '11:00',
      '11:15',
      '11:30',
    ]);
    expect(day.slots.every((slot) => slot.available)).toBe(true);
  });

  it('closes a day the staff member does not work', () => {
    const day = build({ date: '2026-03-06' }); // Friday
    expect(day.closed).toBe(true);
    expect(day.closedReason).toBe('day_off');
  });

  it('closes the day for a holiday', () => {
    const day = build({
      holidays: [{ id: 'hol_1', date: MONDAY, title: { fa: 'تعطیل', en: 'Holiday' } }],
    });
    expect(day.closed).toBe(true);
    expect(day.closedReason).toBe('holiday');
  });

  it('marks existing bookings and their buffers as booked', () => {
    const day = build({
      bookings: [makeBooking({ start: '10:00', end: '10:30', bufferMin: 15 })],
    });
    const byStart = Object.fromEntries(day.slots.map((slot) => [slot.start, slot]));
    expect(byStart['10:00'].available).toBe(false);
    expect(byStart['10:00'].reason).toBe('booked');
    expect(byStart['10:30'].available).toBe(false);
    expect(byStart['10:45'].available).toBe(true);
  });

  it('blocks break time', () => {
    const day = build({
      staff: [makeStaff({ breaks: [{ start: '10:30', end: '11:00' }] })],
    });
    const byStart = Object.fromEntries(day.slots.map((slot) => [slot.start, slot]));
    expect(byStart['10:15'].available).toBe(false);
    expect(byStart['10:15'].reason).toBe('break');
    expect(byStart['11:00'].available).toBe(true);
  });

  it('reserves the cleanup buffer after the new appointment', () => {
    const day = build({
      service: { ...service, durationMin: 60, bufferMin: 15 },
      staff: [makeStaff()],
    });
    const starts = day.slots.filter((slot) => slot.available).map((slot) => slot.start);
    // 10:45 + 60 + 15 = 12:00 exactly, so it still fits.
    expect(starts.at(-1)).toBe('10:45');
  });

  it('ignores cancelled bookings', () => {
    const day = build({ bookings: [makeBooking({ status: 'cancelled' })] });
    const byStart = Object.fromEntries(day.slots.map((slot) => [slot.start, slot]));
    expect(byStart['10:00'].available).toBe(true);
  });

  it('excludes past times on the current day, honouring the notice period', () => {
    const today = toIsoDate(new Date('2026-02-19T10:00:00')); // Thursday, a working day
    const day = build({
      date: today,
      now: new Date('2026-02-19T10:00:00'),
      leadTimeMin: 60,
    });
    const byStart = Object.fromEntries(day.slots.map((slot) => [slot.start, slot]));
    expect(byStart['10:00'].available).toBe(false);
    expect(byStart['10:00'].reason).toBe('past');
    expect(byStart['11:00'].available).toBe(true);
  });

  it('merges free staff for the same start time', () => {
    const second = makeStaff({ id: 'stf_2', color: '#111' });
    const day = build({
      staff: [makeStaff(), second],
      bookings: [makeBooking({ staffId: 'stf_1' })],
    });
    const first = day.slots.find((slot) => slot.start === '10:00');
    expect(first?.available).toBe(true);
    expect(first?.staffIds).toEqual(['stf_2']);
  });

  it('skips staff who are on approved leave but not pending leave', () => {
    const leave = [
      {
        id: 'to_1',
        staffId: 'stf_1',
        fromDate: MONDAY,
        toDate: MONDAY,
        status: 'approved' as const,
        createdAt: '2026-02-01',
      },
    ];
    expect(build({ timeOff: leave }).closed).toBe(true);
    expect(build({ timeOff: [{ ...leave[0], status: 'pending' }] }).closed).toBe(false);
  });

  it('ignores staff who do not offer the service', () => {
    const day = build({ staff: [makeStaff({ services: ['svc_other'] })] });
    expect(day.closed).toBe(true);
  });
});
