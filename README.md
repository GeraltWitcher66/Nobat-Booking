# Nobat — online booking for salons, clinics and consultants

A bilingual (Persian / English) booking front end for a beauty clinic: public landing page, a five-step booking flow with SMS verification and simulated payment, a customer portal, a full admin panel and a specialist panel — all running as a static site on GitHub Pages with all data stored in the browser.

**Live demo:** `https://YOUR-USERNAME.github.io/Nobat-Booking/` — replace `YOUR-USERNAME` with your GitHub account after the first deployment.

---

## Demo accounts

All accounts are demo-only; nothing leaves the browser.

| Role | Sign in with | Notes |
| --- | --- | --- |
| Customer | `0500000000` + SMS code `1234` | Pre-seeded with past and upcoming appointments |
| Manager | `admin@demo.test` / `password` | Full admin panel |
| Specialist | `staff@demo.test` / `password` | Calendar, today's list and leave requests |

The credentials are also shown on the sign-in screen. Any phone number that follows the `05xxxxxxxx` pattern can sign in with the code `1234`.

---

## Screenshots

Screenshots live in [`/docs/screenshots`](./docs/screenshots) — see that folder's README for the expected file names. Drop the captures in and they will render here:

| Page | File |
| --- | --- |
| Public salon page | `docs/screenshots/01-home.png` |
| Booking flow | `docs/screenshots/02-booking.png` |
| Admin dashboard | `docs/screenshots/03-admin-dashboard.png` |
| Admin calendar | `docs/screenshots/04-admin-calendar.png` |

---

## Features

### Public site
- Hero with photography, live opening hours, rating and direct booking calls to action.
- Service catalogue (8 services) with durations, buffers and prices in **AED** or **IRR**, switchable and remembered per visitor.
- Specialist profiles with ratings and the services they deliver.
- Gallery, 10 customer reviews and a location block with a map image and directions link.
- Fully responsive, dark mode, and Persian (RTL, default) / English (LTR) with a language switch that preserves the current page.

### Booking flow
1. Choose a service.
2. Choose a specialist, or “anyone available” (the engine picks the least busy specialist offering that service).
3. Pick a date from a Jalali calendar and a time from the slots that are actually free; blocked times are shown greyed out.
4. Name and mobile number.
5. SMS verification — the demo code `1234` is displayed on screen.
6. Payment: pay in full, pay a deposit (percentage configured in settings), or pay at the clinic. Card details are a simulation, nothing is charged.
7. Confirmation with the booking code and a success animation.

### Customer portal
- Upcoming and past appointments.
- Cancel and reschedule (rescheduling re-runs the availability engine).
- Printable invoice / browser PDF export.

### Admin panel
- **Dashboard:** today's appointments, week and month revenue, capacity utilisation, no-shows, average ticket, active customers, 14-day revenue chart and booking status chart (Recharts), most booked services, and today's schedule with quick “completed” / “no-show” actions.
- **Calendar:** day and week views for every specialist (FullCalendar), drag a booking to move it, click for details, and a manual booking dialog for walk-in or phone customers.
- **Bookings:** filter by status and specialist, change status inline, and export the filtered list to Excel (SheetJS).
- **Customers:** search, visit history, lifetime value and internal notes.
- **Services:** create, edit and delete services — names and descriptions in both languages, duration, cleanup buffer, both prices, assigned specialists and visibility.
- **Team:** per-day working hours, breaks, assigned services, clinic holidays and leave approvals.
- **Settings:** clinic name, tagline, contact details, cancellation policy, deposit percentage, slot interval, minimum notice, default currency and SMS templates.
- **Reset demo data** restores the original seed at any time.

### Specialist panel
- Personal calendar, today's list, upcoming appointments and marking appointments as completed or no-show.
- Leave requests with status tracking; the manager approves them in the team screen, and approved leave immediately removes those days from availability.

### Everywhere
- A dismissible banner states that this is a demo build.
- Jalali dates for Persian (via `date-fns-jalali`), Gregorian for English, with Persian digits.
- Local fonts (Vazirmatn + Inter) shipped in the repository — no CDN request, so the site works where Google Fonts is blocked.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) with `output: 'export'` |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS 3 with design tokens generated from the brand config |
| State / data | In-browser mock adapter over `localStorage` |
| Dates | `date-fns-jalali` (Jalali) and `Intl` (Gregorian) |
| Animation | Framer Motion |
| Charts | Recharts |
| Calendar | FullCalendar |
| Excel export | SheetJS (`xlsx`) |
| Tests | Vitest for the availability engine |
| Hosting | GitHub Pages via GitHub Actions |

---

## Project structure

```
src/
  app/[locale]/            # fa and en route trees (static export: /fa/..., /en/...)
    page.tsx               # public salon page
    book/                  # booking flow
    login/                 # sign-in (customer, manager, specialist)
    account/               # customer portal
    staff/                 # specialist panel
    admin/                 # dashboard, calendar, bookings, customers, services, team, settings
  components/              # layout, booking, account, admin, staff, ui primitives
  config/brand.ts          # name, logo mark, palette, contact details, demo credentials
  data/*.json              # demo seed data (services, staff, customers, reviews, gallery, settings)
  i18n/                    # locale config and typed dictionaries
  lib/
    api/
      index.ts             # the only data surface the UI imports
      mock/                # mock adapter: seed, store, catalogue, bookings, auth
    availability.ts        # pure slot engine (+ availability.test.ts)
    format.ts              # money, duration, Jalali/Gregorian formatting
    auth/                  # demo session storage and hook
  assets/fonts/            # self-hosted woff2 files
public/
  images/                  # photography used by the demo
```

---

## Data layer and the Laravel backend

Every screen reads and writes through `src/lib/api` — no component touches `localStorage` directly.

- `src/lib/api/index.ts` is the public surface (`getServices`, `getStaff`, `getAvailabilityFor`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `updateBookingStatus`, `getDashboardStats`, `loginCustomer`, `loginWithPassword`, …).
- `src/lib/api/mock/*` is the current implementation. It seeds demo data relative to today's date (40 bookings across the previous and next two weeks), adds a short artificial delay so loading states behave like a network, and persists every change under a namespaced `localStorage` key.
- The availability engine lives in `src/lib/availability.ts` as a pure function and is covered by `src/lib/availability.test.ts`.

To connect a Laravel API:

1. Add an adapter, e.g. `src/lib/api/http/`, implementing the same function signatures against your endpoints (fetch or axios, token handling, error mapping to the existing codes such as `slot_unavailable`).
2. Switch the exports in `src/lib/api/index.ts` from `./mock` to `./http`. No component changes are needed.
3. Replace `src/lib/auth/session.ts` with real session handling (httpOnly cookie or token) and remove the demo credentials from `src/config/brand.ts`.

A suggested endpoint map is documented at the top of `src/lib/api/index.ts`:

```
GET    /api/services                 → getServices
GET    /api/staff                    → getStaff
GET    /api/availability             → getAvailabilityFor
POST   /api/bookings                 → createBooking
PATCH  /api/bookings/{id}/cancel     → cancelBooking
PATCH  /api/bookings/{id}/reschedule → rescheduleBooking
PATCH  /api/bookings/{id}/status     → updateBookingStatus
GET    /api/dashboard                → getDashboardStats
POST   /api/auth/sms                 → requestSmsCode
POST   /api/auth/login               → loginWithPassword
```

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000/Nobat-Booking/fa/
npm run build      # static export into ./out (adds .nojekyll)
npm test           # Vitest: availability engine
npm run preview    # serve ./out locally
```

Node 20 or newer is recommended.

The app is served under the `/Nobat-Booking` base path in development as well, so links behave exactly like production. If your repository has another name, set `NEXT_PUBLIC_BASE_PATH=/your-repo` before running or building.

---

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds the project and publishes `out/` on every push to `main`:

1. Push the repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The base path is taken from the repository name automatically.

`next.config.mjs` sets `output: 'export'`, `trailingSlash: true`, and `basePath`/`assetPrefix` from `NEXT_PUBLIC_BASE_PATH` (default `/Nobat-Booking`), so every route is exported as `folder/index.html` and refreshing a deep link works on Pages. `scripts/postbuild.mjs` writes `.nojekyll` so Jekyll does not strip the `_next` directory.

---

## Customisation

- **Branding:** `src/config/brand.ts` holds the clinic name, logo mark, taglines, contact details, demo credentials and the light/dark palette. Tailwind generates its colour tokens from the same palette, so one file rebrands the whole product.
- **Content:** services, specialists, customers, reviews, gallery and settings live in `src/data/*.json`; the running demo can also be edited from the admin panel.
- **Photography:** images are committed under `public/images` (fetched once from Unsplash with `node scripts/fetch-images.mjs`); nothing is loaded from an external host at runtime.

---

## Notes and limitations

- This build is a front end only: there is no server, no real SMS and no real payment. Data is stored per browser and is cleared by the **Reset demo data** button.
- Sign-in is simulated; it is not a security boundary. Do not ship it as-is to production.
- The demo seed is generated relative to the current date, so the calendar always looks current.
