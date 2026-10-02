# WashSlot 🧺

A slot booking system for shared washing machines in student hostels.

## Problem
Hostlers waste time checking if washing machines are free. No reservation system means first-come-first-served chaos.

## Solution
WashSlot lets hostlers view real-time machine status, browse upcoming slots, and book their laundry time in advance — all from their phone.

---

## Features

### Users (Hostlers)
- View washing machine status: Available / In Use / Under Repair
- Browse next 24 hours of slots with color-coded availability
- Book available slots (one active booking at a time)
- Cancel bookings before slot starts
- Get notified 30 minutes and 5 minutes before their slot
- Calendar reminder added on booking

### Admin (Warden)
- Configure slot operating hours and duration
- Apply schedules to all days / weekdays / weekends / holidays
- Block specific time ranges
- Mark machines as under repair / available
- Add or remove washing machines
- View booking history (last 7 days / last 30 days)
- Manage admin accounts (super admin only)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + PostgreSQL |
| Mobile | Flutter (Android + iOS) |
| Web Admin | React + Vite |
| Auth | JWT + bcrypt |
| Notifications | Firebase Cloud Messaging |
| ORM | Prisma |

---

## Monorepo Structure

```
WashSlot/
├── backend/        # NestJS API server
├── mobile/         # Flutter mobile app
├── web-admin/      # React admin dashboard
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- Flutter >= 3.x
- pnpm or npm

### Backend
```bash
cd backend
npm install
cp .env.example .env
# fill in your .env values
npm run start:dev
```

### Web Admin
```bash
cd web-admin
npm install
cp .env.example .env
npm run dev
```

### Mobile
```bash
cd mobile
flutter pub get
flutter run
```

---

## Rules & Logic Summary
- Only `@bvrithyderabad.edu.in` emails can register as users
- Admin accounts are provisioned by super admin
- Rolling 7-day booking frequency limit (admin-configurable)
- Cancelled bookings count against weekly frequency limit
- Users can book next slot only after current slot fully ends
- Slots shown: next 24 hours only
- 30-min default slot duration, 10-min buffer between slots
- Machine under repair: all its slots are closed until admin reopens

---

## License
Private — All rights reserved.
