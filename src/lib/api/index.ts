/**
 * Data access layer.
 *
 * Every screen talks to the app through these functions only. The current
 * implementation is the browser-only mock adapter in `./mock`, which seeds
 * demo data and persists changes in localStorage.
 *
 * Connecting a real Laravel backend means writing a second adapter
 * (`./http`) that calls the REST endpoints and swapping the exports below —
 * no component changes are required.
 *
 * Suggested Laravel endpoint map:
 *   GET    /api/services                → getServices
 *   GET    /api/staff                   → getStaff
 *   GET    /api/availability            → getAvailabilityFor
 *   POST   /api/bookings                → createBooking
 *   PATCH  /api/bookings/{id}/cancel    → cancelBooking
 *   PATCH  /api/bookings/{id}/reschedule→ rescheduleBooking
 *   PATCH  /api/bookings/{id}/status    → updateBookingStatus
 *   GET    /api/dashboard               → getDashboardStats
 *   POST   /api/auth/sms                → requestSmsCode
 *   POST   /api/auth/login              → loginWithPassword
 */
export * from './mock';
export type * from '@/types';
