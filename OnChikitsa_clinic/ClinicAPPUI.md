# OnChikitsa — Clinic App UI Spec (`ClinicAPPUI.md`)

The **clinic-staff** mobile app for OnChikitsa. Front-desk / clinic owners manage doctors,
services, schedules, appointments, a live token queue, patients, payments, earnings,
reviews and settings. This document is the single source of truth for building the UI.

> Sibling app: `OnChikitsa_user` (patient app). This app must feel like the same product.

---

## 1. Tech & platform

- **Framework:** Next.js 15 App Router, `output: 'export'` (static) → `out/`.
- **Shell:** Capacitor 7, Android committed under `android/`. `appId: com.onchikitsa.clinic`.
- **React 19**, JS (no TS), function components, `'use client'` on interactive pages.
- **Font:** Open Sans via `next/font/google` (weights 400/600/700), exposed as `--font-sans`.
- **Backend:** `process.env.NEXT_PUBLIC_API_URL` (health check only for now). Screens use
  realistic **mock data** — this is a UI build ("UI level"), not backend wiring.

### Native (this is NOT a web wrapper)
A `NativeShell` client component mounted once in `app/layout.js` owns native behavior:
- **Hardware back button** (`@capacitor/app` `backButton`): navigate `router.back()` within
  the app; on a **tab root** go to `/dashboard`; on `/dashboard` (home root) confirm-exit /
  `App.exitApp()`. Never let Android close the app from a deep screen.
- **Status bar** (`@capacitor/status-bar`): brand color, correct light/dark style.
- **Splash** (`@capacitor/splash-screen`): hide once the web layer is ready.
- **Haptics** (`@capacitor/haptics`): light impact on primary taps / tab switches.
- All native calls are guarded by `Capacitor.isNativePlatform()` and dynamic `import()` so the
  static web build still renders.

### Static-export routing rules
- **No dynamic `[id]` routes.** Use static detail routes (`/doctors/detail`) + query string
  (`?id=`) read on the client, or client-held selection state. Keeps `next export` clean.
- Every route is a folder with `page.js`. Interactive pages start with `'use client'`.

---

## 2. Design system (reuse OnChikitsa brand)

Tokens live in `app/globals.css` (ported from the user app + extended for clinic screens).
**Do not invent new colors** — compose the CSS variables below.

| Token | Value | Use |
|---|---|---|
| `--primary` | `#1C74E0` | brand blue, primary actions |
| `--primary-tint` | `#EAF2FE` | soft blue surfaces / icon bubbles |
| `--accent` | `#17B98A` | green — success, revenue, "paid" |
| `--accent-tint` | `#E6F7F0` | soft green surfaces |
| `--fg` / `--muted-fg` / `--faint-fg` | `#17233B` / `#6A788F` / `#9AA6B9` | text hierarchy |
| `--bg` / `--card` / `--field` | `#F4F7FD` / `#FFF` / `#F3F6FC` | surfaces |
| `--border` / `--border-strong` | `#E7ECF4` / `#D6DEEA` | hairlines |
| `--success` `--danger` `--warning` `--star` | green / `#F0435B` / `#F5A524` / `#FFB020` | status |
| `--grad-primary` | blue 135° gradient | primary buttons, splash, hero |
| radius | `--radius-sm 12 / --radius 16 / --radius-lg 22 / --radius-xl 28` | |

Dark mode is defined via `@media (prefers-color-scheme: dark)` — every screen must work in both.
Safe-area insets: `--sat` (top) / `--sab` (bottom). Mobile-first, centered `.app-frame` (max 480px).

### Global component classes (already in globals.css — compose these)
`.screen .pad .stack .grow` · buttons `.btn .btn-primary .btn-accent .btn-outline .btn-ghost .btn-soft .btn-block` ·
`.card .chip .chip-accent .chip-plain .badge .badge-success .badge-warning .dot` · brand `.brand-badge` ·
forms `.field .field-label .input-wrap .input .field-msg .phone-control .otp-*` ·
`.icon-btn .icon-back .avatar-btn .search .section .section-head .link` ·
clinic add-ons: `.topbar .subnav .seg .stat-grid .stat .list-row .q-*` (queue) `.money .chart-*` etc.
When something is truly one-off, use inline `style={{}}` (matches the existing codebase idiom).

### Icons
All icons come from `app/_components/icons.js` (inline-SVG, Lucide-style stroke, `size` prop).
It ships a broad clinic set: `Home Calendar Ticket Users User UserPlus Stethoscope Bell Search
Plus Clock MapPin ChevronRight/Left/Down ArrowRight ArrowLeft Check CheckCircle X AlertCircle
Phone Mail Star Building Camera Upload FileText Shield CreditCard Wallet TrendingUp BarChart
Edit Trash Filter MoreHorizontal Settings LogOut HelpCircle MessageCircle Bookmark Tag
IndianRupee Menu Grid Play SkipForward RotateCcw Navigation Info Sun Moon Heart Activity …`.
If a screen needs a glyph that isn't there, add a small inline `<svg>` locally — **do not edit
`icons.js`** (shared file, avoids merge conflicts).

### Shared components (`app/_components/`)
- `NativeShell` — native back button / status bar / splash / haptics (mounted in layout).
- `BrandBadge` — logo in white rounded badge (`sm|md|lg`).
- `TopBar` — screen header: back button + title + optional right action. Props: `title`,
  `onBack`, `right`, `subtitle`. Wires haptic + `router.back()` by default.
- `BottomNav` — 5-tab bar (Home / Appointments / Queue / Patients / More), `active` prop.
- `SubTabs` — segmented pill/underline tabs (e.g. Today | Upcoming | Completed | Cancelled).
- `Sheet` — bottom-sheet modal (used for filters, confirmations, pickers).
- `Field`, `Segmented`, `Stepper`, `Toggle` — form primitives.
- `EmptyState` — icon + title + hint + optional CTA.
- `StatusPill` — appointment/payment status → colored `.badge`.
- `Avatar` — initials or photo circle with optional status dot.

### State (`app/_lib/`)
- `flow.js` — localStorage flow: `isOnboarded/setOnboarded`, `isAuthed/setAuthed`,
  `isClinicSetup/setClinicSetup`, `getClinic/setClinic`, `entryRoute()`
  (`/onboarding` → `/login` → `/setup/clinic` → `/dashboard`).
- `data.js` — mock data (doctors, services, appointments, queue, patients, payments,
  reviews, notifications) so every screen renders realistic content.
- `haptic.js` — `tapLight()` helper (guarded Haptics).

---

## 3. Navigation map

```
Splash  →  Onboarding(3)  →  Login  →  OTP  →  [first run] Clinic Setup(6)  →  Dashboard
                                                                                 │
        ┌──────────────┬───────────────┬────────────────┬─────────────────┬─────┘
       Home        Appointments       Queue           Patients            More
    (dashboard)   (list+subtabs)   (live queue)    (patient db)     (hub → everything)
                       │                │                                  │
                  detail/create/     arrival/                     Doctors · Services · Schedule
                  reschedule/cancel  consultation                 Payments · Earnings · Reviews
                                                                  Notifications · Profile ·
                                                                  Settings · Support
```

Bottom nav shows on the 5 tab-root screens only. All other screens use `TopBar` with a working
back button (also driven by the Android hardware back button via `NativeShell`).

---

## 4. Screens (42)

Each entry: **route** · key components. Build every screen fully styled with mock data, both
themes, safe-area aware. Group headers map to the delegation batches.

### A. Entry & Auth
1. **Splash** — `/` · BrandBadge lg, app name "OnChikitsa Clinic", tagline, spinner, version.
   Redirect after ~1.8s to `flow.entryRoute()`.
2–4. **Onboarding** — `/onboarding` · single 3-slide pager: illustration, heading, description,
   page dots, Skip + Next (slide 3 → "Get Started"). Copy tuned for clinics (manage clinic,
   doctors & queue / accept appointments & payments / grow with insights). Sets `onboarded`.
5. **Login** — `/login` · logo, country-code + mobile field, "Send OTP", Terms & Privacy.
   (No role selection.) → `/verify`.
6. **OTP Verify** — `/verify` · masked number, 6-box OTP, resend timer, change number, Verify.
   → clinic setup (first run) or dashboard.

### B. Clinic Setup (first-run wizard, shared 6-step progress header)
7. **Clinic Setup** — `/setup/clinic` · clinic name, clinic type (chips: General/Dental/
   Multispeciality/Eye/…), owner/contact name, phone, email · Continue.
8. **Clinic Address** — `/setup/address` · address, city, state, pincode, map placeholder,
   "Use current location" · Continue.
9. **Clinic Details** — `/setup/details` · about clinic (textarea), services (multi-select
   chips), consultation type (In-clinic / Video / Home visit toggles), contact info · Continue.
10. **Clinic Photos** — `/setup/photos` · clinic logo upload, cover image, gallery grid with
    add/remove tiles · Continue.
11. **Verification Documents** — `/setup/documents` · registration doc, license/certificate,
    ID proof — upload rows with status (pending/uploaded) · Submit for verification.
12. **Setup Complete / Pending** — `/setup/complete` · success or "Verification Pending — our
    team is reviewing your clinic", clinic name, status · Continue to dashboard.

### C. Dashboard (Home tab)
13. **Dashboard** — `/dashboard` · header (clinic name + location, notifications, profile/avatar);
    **Today's summary** stat grid (Appointments / Completed / Waiting / Cancelled / Revenue);
    **Today's schedule** appointment cards (time, patient, doctor, status, token e.g. A-12);
    **Quick actions** (Add appointment, View queue, Add doctor, Manage schedule);
    **Upcoming** list. BottomNav active=Home.

### D. Doctors
14. **Doctors** — `/doctors` · TopBar, search, doctor cards (avatar, name, specialization, fee,
    ● active/inactive), Add-doctor FAB/button.
15. **Add Doctor** — `/doctors/add` · photo, name, specialization, qualification, experience,
    registration no., phone, email, consultation fee · Save.
16. **Doctor Details** — `/doctors/detail` (`?id=`) · profile header, info, fee, services,
    schedule summary, appointment stats; actions Edit / Disable / Manage schedule.
17. **Edit Doctor** — `/doctors/edit` (`?id=`) · same form as Add, pre-filled.

### E. Services
18. **Services** — `/services` · TopBar, search, service rows (name, price, duration,
    active toggle), Add service.
19. **Add/Edit Service** — `/services/edit` (`?id=` optional) · name, description, fee, duration,
    GST/tax, active toggle · Save.

### F. Schedule
20. **Doctor Schedule** — `/schedule` · doctor selector, week/day selector, per-day time ranges,
    add/edit/delete/copy schedule.
21. **Slot Configuration** — `/schedule/slots` · slot duration, break duration, max patients,
    advance-booking limit, same-day booking toggle, booking availability. Stepper controls.
22. **Holidays / Leave** — `/schedule/holidays` · calendar, clinic holidays list, doctor leave,
    block date, add holiday/leave.

### G. Appointments (Appointments tab)
23. **Appointments** — `/appointments` · SubTabs Today | Upcoming | Completed | Cancelled;
    filters (date, doctor, status, service); appointment cards (token A-102, patient, doctor,
    time, ● status). BottomNav active=Appointments.
24. **Appointment Details** — `/appointments/detail` (`?id=`) · id, patient, doctor, service,
    date, time, token, payment status, appointment status; actions Confirm / Reschedule /
    Cancel / Mark arrived / Start consultation / Complete (contextual).
25. **Create Appointment** — `/appointments/create` · search existing / add new patient, doctor,
    service, date, available slot grid, payment mode, Confirm booking (walk-in / phone booking).
26. **Reschedule** — `/appointments/reschedule` (`?id=`) · current appointment, doctor, calendar,
    available slots, new slot, Confirm.
27. **Cancel** — `/appointments/cancel` (`?id=`) · appointment details, cancellation reason
    (radio), refund info, cancellation policy, Confirm cancellation.

### H. Queue (Queue tab)
28. **Live Queue** — `/queue` · "Currently consulting" big token card (A-14, patient); "Waiting"
    list (A-15 Amit, A-16 Priya…); actions Call next / Skip / Recall / Mark consulting / Complete.
    BottomNav active=Queue.
29. **Patient Arrival** — `/queue/arrival` (`?id=`) · patient, appointment id, time, doctor,
    payment status, big "Mark Arrived" → shows assigned token.
30. **Consultation Status** — `/queue/consultation` (`?id=`) · token, patient, ● Consulting,
    started time (live timer feel), "Complete Consultation".

### I. Patients (Patients tab)
31. **Patients** — `/patients` · search, patient list rows (name, phone, last visit, total
    visits). BottomNav active=Patients.
32. **Patient Details** — `/patients/detail` (`?id=`) · basic info, appointment history,
    previous visits, payments, documents (if any).

### J. Payments
33. **Payments** — `/payments` · today's revenue summary (online / cash / pending / refunded),
    filters (date, doctor, method, status), payment list rows.
34. **Payment Details** — `/payments/detail` (`?id=`) · payment id, appointment, patient, amount,
    platform fee, GST/taxes, clinic amount, method, status, refund status.

### K. Earnings
35. **Earnings** — `/earnings` · Today ₹24,800 / This week ₹1,42,000 / This month ₹5,84,000 hero
    tiles; revenue chart (inline SVG bar/line); doctor-wise, service-wise breakdown;
    online/cash split.
36. **Settlement History** — `/earnings/settlements` · settlement list (id, amount, date, status)
    → detail.

### L. Reviews
37. **Reviews** — `/reviews` · overall rating + total, rating distribution bars, review list
    (patient, stars, text, doctor-wise / clinic tabs); actions View / Reply.

### M. Notifications
38. **Notifications** — `/notifications` · grouped list; types: new appointment, cancellation,
    reschedule, payment received, patient arrived, settlement, system. Icon+color per type.

### N. Clinic Profile & Settings
39. **Clinic Profile** — `/profile` · logo + cover, clinic name, address, phone, email,
    description, photos, working hours; Edit action.
40. **Settings** — `/settings` · grouped rows: booking settings, cancellation policy, payment
    settings, notification settings, working hours, privacy, terms, help & support, Logout
    (with theme toggle). Logout clears flow → `/login`.

### O. Support
41. **Help & Support** — `/support` · FAQ accordion, search help, contact support, raise ticket.
42. **Support Ticket** — `/support/ticket` · issue category, description, attachment, ticket
    status, conversation thread with support (chat bubbles).

### P. More (hub)
- **More** — `/more` · grid/list linking to Doctors, Services, Schedule, Payments, Earnings,
  Reviews, Notifications, Clinic Profile, Settings, Support. Header with clinic identity.
  BottomNav active=More.

---

## 5. Build conventions for contributors / agents
- Read `OnChikitsa_user/app/dashboard/page.js` + `app/globals.css` for the house style before
  writing. Match class usage, icon imports, spacing, and copy voice.
- **Only create files in your assigned route folder(s).** Never edit `globals.css`, `layout.js`,
  `icons.js`, or shared `_components` — request additions instead (pre-provided).
- Every interactive control needs an `aria-label`; every list an empty state; every screen a
  working back path. Tap targets ≥ 44px. No emoji as icons (use the SVG set).
- Prefer realistic Indian clinic mock data (names, ₹ fees, specializations, tokens A-12).
- Verify with `npm run build` (static export must succeed) before considering a screen done.

