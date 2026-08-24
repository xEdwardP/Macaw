# Macaw — University Peer Tutoring Platform

Peer-to-peer tutoring marketplace for universities. It connects students with tutors from their own institution, using an internal credit wallet with escrow, PayPal top-ups, Jitsi video calls and AI-powered recommendations.

**Languages / Idiomas:** [English](#english) · [Español](#español)

---

<a name="english"></a>

# English

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the project](#running-the-project)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [Seed data and demo credentials](#seed-data-and-demo-credentials)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Business rules](#business-rules)
- [Background jobs](#background-jobs)
- [Notifications](#notifications)
- [AI features](#ai-features)
- [Real-time](#real-time)
- [Frontend routes](#frontend-routes)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

---

## Overview

Macaw is a full-stack web application with four roles, each with its own dashboard and permissions:

| Role | What they can do |
|---|---|
| `student` | Search tutors, book sessions, top up the wallet with PayPal, join the video call, confirm or dispute a session, leave reviews |
| `tutor` | Manage their profile (bio, hourly rate, subjects, weekly availability), accept/reject bookings, mark sessions as delivered, request withdrawals |
| `university` | Manage faculties and subjects, view analytics, top up the institutional balance and grant subsidies to students |
| `admin` | Manage users, sessions, universities, resolve disputes, approve/reject withdrawals, view platform earnings |

Money never moves directly between users. Students buy internal credits, credits are frozen (escrow) when a session is booked, and they are only released to the tutor when the session is confirmed as delivered — minus a 10% platform commission.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 + Framer Motion |
| Routing / state | React Router 7, Zustand (persisted auth), TanStack React Query |
| Forms / validation | React Hook Form + Zod |
| UI extras | lucide-react, react-hot-toast, recharts, react-big-calendar, date-fns |
| Backend | Node.js + Express 5 |
| ORM / DB | Prisma 6 + PostgreSQL 18 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | helmet, cors, express-rate-limit |
| Payments | PayPal REST API (sandbox) + `@paypal/react-paypal-js` |
| AI | OpenAI `gpt-4o-mini` |
| Video calls | Jitsi Meet (public rooms generated per session) |
| Email | Nodemailer (Gmail SMTP) |
| Automations | Make.com webhook for session lifecycle notifications |
| Real-time | Socket.io authenticated by JWT, one room per person, with the notification persisted in the database |
| Scheduling | node-cron |
| Container | Docker Compose (PostgreSQL) |

## Architecture

```
┌─────────────────────┐        HTTPS / JSON        ┌──────────────────────┐
│  React SPA (Vite)   │ ─────────────────────────► │  Express API         │
│  Zustand + Query    │ ◄───────────────────────── │  JWT + role guards   │
└─────────┬───────────┘                            └──────────┬───────────┘
          │                                                   │
          │ PayPal JS SDK                                     │ Prisma
          ▼                                                   ▼
   ┌─────────────┐        ┌──────────────┐          ┌──────────────────┐
   │  PayPal     │◄──────►│  PayPal REST │          │  PostgreSQL 18   │
   └─────────────┘        └──────────────┘          └──────────────────┘
                                                              ▲
   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐      │
   │  Jitsi Meet │   │  OpenAI API  │   │ Make webhook │──────┘
   └─────────────┘   └──────────────┘   └──────────────┘
```

The backend follows a **module → routes → controller → service** layout. Routes declare the auth/role middleware, controllers only translate HTTP to service calls and shape the response with `utils/apiResponse`, and services hold all business logic and Prisma transactions.

Every API response uses the same envelope:

```json
{ "success": true,  "message": "Success", "data": { } }
{ "success": false, "message": "Saldo insuficiente" }
```

## Project structure

```
macaw/
├── docker-compose.yml            # PostgreSQL 18 (host port 5433)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # 13 models + 5 enums
│   │   ├── migrations/
│   │   ├── seed.js               # seed orchestrator
│   │   └── seeds/                # university, faculties, subjects, users, tutors
│   └── src/
│       ├── app.js                # Express app (middleware, routes, error handling)
│       ├── config/
│       │   ├── prisma.js         # single shared PrismaClient
│       │   ├── paypal.js         # OAuth token cache, create/capture order
│       │   ├── platform.js       # cached platform wallet lookup
│       │   └── mailer.js         # Nodemailer transport (Gmail SMTP)
│       ├── middlewares/
│       │   └── auth.middleware.js  # authenticate() + authorize(...roles)
│       ├── modules/
│       │   ├── auth/             # register, login, profile
│       │   ├── users/            # admin user listing, activate/deactivate
│       │   ├── tutors/           # profile, subjects, availability, booked slots
│       │   ├── sessions/         # booking lifecycle + escrow + disputes
│       │   ├── wallet/           # wallet, transactions, PayPal, withdrawals
│       │   ├── reviews/          # ratings + average recalculation
│       │   ├── ai/               # recommendations, review summaries
│       │   └── universities/     # faculties, subjects, analytics, subsidies
│       ├── jobs/
│       │   ├── sessionReminders.js  # daily 08:00 reminder emails
│       │   └── autoConfirm.js       # hourly auto-release of escrow
│       └── utils/
│           ├── jwt.js            # sign / verify
│           ├── apiResponse.js    # ok, created, error, notFound, unauthorized, forbidden
│           ├── dateTime.js       # America/Tegucigalpa helpers, slot overlap math
│           └── emailTemplates.js # HTML email templates
└── frontend/
    ├── vercel.json               # SPA rewrite
    ├── vite.config.js            # port 5173 + /api proxy to :3000
    └── src/
        ├── main.jsx / App.jsx
        ├── router.jsx            # rutas perezosas / lazy routes, one chunk per page
        ├── app/ErrorBoundary.jsx # a broken screen no longer takes the app down
        ├── ui/                   # Button, Input, Select, Modal, Card, Badge, Avatar, Skeleton, Alert
        ├── patterns/             # PageHeader, StatCard, DataTable, Pagination, SearchInput,
        │                         # FilterBar, EmptyState, ErrorState, ConfirmDialog, Wizard
        ├── domain/               # Money, DateTime, SessionCard, TutorCard, SessionStatusBadge,
        │                         # RoleBadge, TransactionList, WalletBalanceCard
        ├── data/                 # queryKeys factory + one hook file per domain
        ├── components/
        │   ├── layout/Navbar.jsx
        │   └── wallet/           # RechargeModal, UniversityRechargeModal
        ├── pages/
        │   ├── public/           # Landing, Login, Register, NotFound,
        │   │                     # AcceptInvitation, ApplyForAccount
        │   ├── student/          # Dashboard, TutorSearch, TutorProfile, BookSession, MySessions, MyWallet
        │   ├── tutor/            # Dashboard, MyProfile, MySessions, MyWallet
        │   ├── institution/      # Dashboard, AcademicUnits, Subjects, Students, Subsidies,
        │   │                     # Settings, Domains, Team, Imports
        │   └── admin/            # Dashboard, Users, Sessions, Withdrawals, Institutions,
        │                         # InstitutionDetail, NewInstitution, Plans
        ├── services/             # axios instance + one service per API module
        ├── store/                # authStore ("macaw-auth"), themeStore ("macaw-theme")
        └── utils/dateTime.js
```

## Design system

Every page is built from three shared layers, so a change lands once instead of twenty-five times.

- **`ui/`** — primitives with CVA variants. `Input`, `Select` and `Textarea` wrap a `Field` that generates the id and links its own label, so the control is labelled by construction. `Modal` is a Radix dialog: focus trap, Escape, scroll lock and ARIA come with it.
- **`patterns/`** — the compositions that used to be copy-pasted: pagination, search, filters, empty and error states, confirmation dialogs, stat cards.
- **`domain/`** — components that know what the data means. `<Money>` formats with `Intl.NumberFormat` in the currency and locale of the institution, so an institution in lempiras finally sees lempiras.

**Every colour is a token.** Not one raw `bg-white`, `text-gray-500` or `bg-red-600` is left in `src`: components name what a colour *means* — `bg-surface`, `text-content-secondary`, `bg-danger-solid` — and each token has a value per theme.

**The API envelope is unwrapped once.** The response interceptor returns `data`, so no page contains `r.data.data`. Query keys live in a single factory (`data/queryKeys.js`) and every mutation invalidates through it, which is what keeps a list from going stale after a write.

**Routes are lazy.** Each page is its own chunk, so the login screen no longer downloads the admin panel.

## Setting up an institution

There are two ways in, and they are deliberately different shapes.

**An institution asks to join.** `/institutions/apply` is a single public form: name, email domain, type, currency and a contact. It lands as `pending`, and someone on the platform approves or rejects it from `/admin/institutions`. Approving assigns a plan and sends the invitation to the contact address; rejecting records a reason.

**The platform sets up a client that already signed.** `/admin/institutions/new` is a five-step wizard, because this path has to pick a currency — which **cannot be changed once money has moved** — plus a plan, an academic template and the first coordinator.

The wizard makes three separate requests, and HTTP has no transaction across them. So it keeps the id of the institution once created and shows each step's outcome: if applying the template fails, retrying repeats only the steps that failed instead of creating a second institution.

**Domains are verified two ways.** DNS, by publishing a TXT record, or email, with a code sent to the domain's postmaster address. Until a domain is verified nobody is auto-assigned to the institution through it — that is what stops someone claiming a domain that isn't theirs.

**The CSV preview does not lie.** It runs the same code as the real import, inside a transaction that is rolled back, and returns the outcome of every row. The screen shows the line number, the offending value and the translated reason, because whoever uploaded a roster is going to fix the file and upload it again — a count of failures alone would not help them.

## Theming

The theme has three states — light, dark, and whatever the operating system says. A store holds the *preference*; `data-theme` on `<html>` holds the *effective* theme. An inline script in `index.html` writes it before the first paint, so the page never flashes white on the way to dark.

**No page contains a `dark:` class.** The variant appears only where the tokens are defined. That is what makes the palette verifiable: there are twenty-eight token pairs to check, not a thousand scattered classes.

Run `npm run check:contrast` to check them. It fails the build below WCAG AA (4.5:1 for text, 3:1 for control boundaries under 1.4.11), and it earned its keep on the first run: white text on the orange button had been failing at 3.56:1 since the beginning. The identity colour did not change — `--brand` is still the same orange — but the button fill is now a separate, deeper token.

**Every brand colour is a real theme token**, declared in `@theme inline`, not a hand-written class in `@layer utilities`. That is not cosmetic: `tailwind-merge` classifies unknown classes by prefix, so `bg-brand` and `bg-brand-hover` used to look like the same conflicting utility and the base one got dropped — every primary button in the app rendered with no background at all. Hand-written classes also do not support variants, so `hover:border-brand` silently did nothing. The names follow the same shape as the rest of the palette: `brand-surface`, `brand-line`, `brand-content`, `brand-solid`, `brand-solid-hover`, `brand-contrast`.

Each institution still overrides the brand with its own `primaryColor`. `applyBrand` derives the whole ramp from that one colour **for the current theme**, and recomputes it when the theme changes: the fill is darkened until white text clears 4.5:1, the soft surface is mixed towards the page background, and the accent is nudged until it clears 3:1 against it.

## Languages

Spanish and English, with `i18next`. The language is resolved in this order: the user's saved preference, the institution's `locale`, the browser, then Spanish.

Dictionaries are split into twelve namespaces and loaded per language, so switching to English downloads the English files and nothing else — they are not in the initial bundle.

**Backend errors are translated by code, never by message.** The API returns `{ code, params }`; the client looks the code up in the `errors` namespace and interpolates the params. The server's Spanish message is an emergency fallback, and a code arriving without a translation logs a warning in development instead of failing silently. Otherwise you get an English interface that answers in Spanish at the exact moment something breaks.

Emails are translated on the server, in the recipient's language, with amounts formatted in the institution's real currency.

Two scripts keep it honest: `npm run check:errors` proves every code in the backend catalogue has a translation in both languages, and `npm run check:i18n` proves the two dictionaries carry the same keys and that no key used in the code is missing.

**Labels follow the institution type.** A university has faculties, a school has levels, a bootcamp has programs. `useUnitLabels()` resolves that in one place, in both languages.

## Requirements

- Node.js v18 or newer
- Docker Desktop (for PostgreSQL) or a local PostgreSQL 18 instance
- Git
- A PayPal developer sandbox account (for payments)
- An OpenAI API key (for the AI features)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/xEdwardP/Macaw.git
cd Macaw
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in both files with your own credentials — see [Environment variables](#environment-variables).

### 3. Start the database

```bash
docker-compose up -d
```

This starts PostgreSQL 18 in the `macaw_postgres` container, exposed on **host port 5433** (container port 5432), with database `macaw_db`, user `macaw` and password `macaw123`. Data is persisted in the `postgres_data` volume.

Matching connection string:

```
DATABASE_URL="postgresql://macaw:macaw123@localhost:5433/macaw_db"
```

### 4. Install backend dependencies and migrate

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

### 5. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Running the project

You need three terminals running at the same time.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

**Terminal 3 — Worker**

```bash
cd backend
npm run worker:dev
```

The worker is not optional in practice. Emails are not sent by the request that triggers them: the
business transaction writes an `OutboxEvent` and the worker dispatches it. **Without the worker
running, invitations, reminders and domain verification codes stay `pending` in the database and
nobody receives anything.** Sending also needs `MAIL_USER` and `MAIL_PASS` — if they are missing,
`sendMail` logs a warning and skips, rather than pretending it sent.

When email is not set up, the invitation screens show the accept link with a copy button, so a
coordinator can still be onboarded.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |
| Prisma Studio | http://localhost:5555 (`npx prisma studio` from `backend/`) |

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. With the bundled Docker setup: `postgresql://macaw:macaw123@localhost:5433/macaw_db` |
| `JWT_SECRET` | yes | Secret used to sign tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | yes | Token lifetime, e.g. `7d` |
| `PORT` | no | API port (defaults to `3000`) |
| `CLIENT_URL` | yes | Frontend origin, used for the CORS allowlist, e.g. `http://localhost:5173` |
| `OPENAI_API_KEY` | for AI | OpenAI API key from platform.openai.com |
| `MAIL_USER` | for email | Gmail account used as the sender |
| `MAIL_PASS` | for email | Gmail **app password** (not the account password) |
| `MAIL_HOST` / `MAIL_PORT` | no | Present in `.env.example` for reference; the transport currently hardcodes `smtp.gmail.com:465` |
| `PAYPAL_CLIENT_ID` | for payments | PayPal sandbox client ID from developer.paypal.com |
| `PAYPAL_CLIENT_SECRET` | for payments | PayPal sandbox client secret |
| `PAYPAL_MODE` | for payments | `sandbox` for development, anything else uses live PayPal |
| `MAKE_WEBHOOK_URL` | for notifications | Make.com webhook that receives the session lifecycle events |
| `CLOUDINARY_CLOUD_NAME` | for uploads | Cloud name from your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | for uploads | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | no | Folder prefix for uploads (defaults to `macaw`) |
| `UPLOAD_MAX_BYTES` | no | Maximum image size in bytes (defaults to 2 MB) |
| `NODE_ENV` | no | Switches Morgan logging between `dev` and `combined` |

Without the three `CLOUDINARY_*` values, avatar and logo uploads answer **503 `UPLOAD_NOT_CONFIGURED`** with a clear message instead of failing halfway. Everything else keeps working: both fields also accept a plain URL.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | yes | Backend base URL, e.g. `http://localhost:3000/api` |
| `VITE_PAYPAL_CLIENT_ID` | for payments | Same PayPal sandbox client ID used by the backend |
| `VITE_SUPPORT_EMAIL` | no | Contact address shown on the landing page and used by its contact form |
| `VITE_SUPPORT_PHONE` | no | Contact phone shown on the landing page |
| `VITE_SUPPORT_ADDRESS` | no | Office location shown on the landing page |

## NPM scripts

### Backend

| Script | What it does |
|---|---|
| `npm run dev` | Starts the API with nodemon |
| `npm start` | Starts the API with node |
| `npm run start:prod` | Applies pending migrations (`prisma migrate deploy`) and starts the API |
| `npm run worker` | Starts the background worker (crons and outbox dispatcher) |
| `npm run worker:dev` | Same, with nodemon |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:seed` | Runs `prisma/seed.js` |
| `npm run prisma:studio` | Opens Prisma Studio |

### Frontend

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 with `/api` proxy to `:3000` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Runs ESLint |

## Seed data and demo credentials

`node prisma/seed.js` is idempotent (it uses `upsert`) and creates:

- **7 currencies** — USD, HNL, MXN, EUR, GTQ, CRC, COP
- **4 plans** — starter (200 students), basic (1,000), pro (5,000), enterprise (unlimited)
- **3 institutions of different types and currencies**, so tenant isolation can be exercised for real:
  - Universidad Católica de Honduras — `university`, USD, enterprise plan, domain `unicah.edu`
  - Instituto San José — `college`, HNL, basic plan, domain `sanjose.edu.hn`
  - Macaw Academy — `academy`, USD, starter plan, domain `macawacademy.com`
- **12 academic units** in UNICAH — ARQ, COM, DEN, DER, ENF, GEE, ICIV, ICC, IIND, MED, MKT, PSI
- **General and per-unit subjects**, linked through `UnitSubject`
- **100 students** across 10 programs, each with a wallet pre-loaded with **$50**
- **24 tutors** with a verified profile, badges, subjects at `advanced` level and Monday–Friday 08:00–18:00 availability
- **1 platform admin**, **1 institution admin** and the internal **platform wallet**

All demo accounts share the password `password123`.

| Role | Email | Password |
|---|---|---|
| Platform admin (`platform_admin`) | `admin.macaw@yopmail.com` | `password123` |
| Institution admin (`institution_admin`) | `coordinador.macaw@yopmail.com` | `password123` |
| Student | `sponce@unicah.edu` | `password123` |
| Tutor | `epineda@yopmail.com` | `password123` |

> The `platform@macaw.app` account is internal: it owns the wallet where commissions accumulate, it is hidden from the admin user list and it is not meant for login.

New users can also self-register at `/register` with the `student` or `tutor` role. If no institution is supplied, it is resolved from the email domain through `InstitutionDomain` (`@unicah.edu` → UNICAH). Registering a student is rejected when the institution has reached its plan limit. Registering automatically creates a wallet, and a `TutorProfile` when the role is `tutor`.

## Data model

Prisma schema: `backend/prisma/schema.prisma`.

| Model | Purpose |
|---|---|
| `Institution` | Any educational institution — `type`, `status`, `currencyCode`, `timezone`, per-tenant `settings`, optional `commissionRate` override, institutional `balance` for subsidies |
| `InstitutionDomain` | Email domains that resolve to an institution at registration; an institution may own several |
| `Currency` | Currency catalogue (`USD`, `HNL`, `MXN`, `EUR`, `GTQ`, `CRC`, `COP`) — a table rather than an enum, so new currencies need no migration |
| `ExchangeRate` | Rate between two currencies, valid from a date, for consolidated reporting |
| `Plan` | Commercial plan with `maxStudents` (`null` = unlimited), `priceMonthly` and feature flags |
| `Subscription` | An institution's plan, its status and its cached student count |
| `AcademicUnit` | Academic unit within an institution — faculty, level, department, area or program (`kind`), unique per `(institutionId, code)` |
| `GradeLevel` | Concrete grade inside a unit, for schools and colleges |
| `Subject` | Subject with `code`, `termNumber`, `credits` and an `isGeneral` flag, unique per `(institutionId, code)` |
| `UnitSubject` | Many-to-many between academic units and subjects |
| `User` | Account with `role`, optional `institutionId` / `academicUnitId` / `gradeLevelId`, `program`, `termNumber`, `academicScore`, `paypalEmail`, `isActive`, plus `locale` (null = inherit the institution's) and `themePreference` |
| `LedgerAccount` | Double-entry account — `user_wallet`, `user_escrow`, `institution_funds`, `external_payments`, `external_payouts`, `opening_balance` — unique per `kind:currency:owner` |
| `LedgerTransaction` | A journal entry. Its unique `idempotencyKey` makes settling the same session twice impossible at the database level |
| `LedgerEntry` | One leg of an entry: `debit` or `credit`, always positive, always in a single currency |
| `PaymentOrder` | A provider order with a unique `providerOrderId` and a `created → completed \| failed` state machine |
| `OutboxEvent` | Domain event written inside the business transaction and dispatched by the worker with exponential backoff |
| `Invitation` | Invitation to join an institution, with a unique token, a role and an expiry date |
| `AuditLog` | Audit trail per institution: who did what, to which entity and with which values |
| `TutorProfile` | 1:1 with a tutor user — `bio`, `hourlyRate`, `isVerified`, `totalSessions`, `averageRating`, `badges` |
| `TutorSubject` | Subjects a tutor teaches, with a `SubjectLevel` |
| `Availability` | Weekly recurring block: `dayOfWeek` (1 = Monday … 7 = Sunday) + `startTime`/`endTime` as `"HH:MM"` |
| `Session` | Booking: date, time range, `price`, `currency` and `commissionRate` frozen at booking time, `status`, generated `meetingUrl`, and the `institutionId` of the paying student |
| `Review` | One review per session, 1–5 rating; recalculates the tutor's average |
| `Wallet` | 1:1 with a user — `currency`, `balance`, `frozen` (escrow), `lifetimeEarned`. These are **cached projections of the ledger**, written only by `postEntry()` |
| `Transaction` | The statement line the user sees, linked to its `LedgerTransaction` |
| `Subsidy` | Credit granted by an institution to a student |
| `WithdrawalRequest` | Tutor payout request to PayPal |

**Enums**

| Enum | Values |
|---|---|
| `Role` | `student`, `tutor`, `institution_admin`, `platform_admin`, `institution_staff`, `guardian` |
| `InstitutionType` | `university`, `college`, `school`, `technical`, `academy`, `bootcamp`, `organization` |
| `InstitutionStatus` | `pending`, `active`, `suspended`, `rejected` |
| `DomainVerificationMethod` | `dns`, `email`, `manual` |
| `AcademicUnitKind` | `faculty`, `level`, `department`, `area`, `program` |
| `SubscriptionStatus` | `trialing`, `active`, `past_due`, `suspended`, `cancelled` |
| `LedgerAccountKind` | `user_wallet`, `user_escrow`, `platform_revenue`, `institution_funds`, `external_payments`, `external_payouts`, `opening_balance` |
| `LedgerDirection` | `debit`, `credit` |
| `PaymentPurpose` | `wallet_topup`, `institution_topup` |
| `PaymentOrderStatus` | `created`, `completed`, `failed`, `cancelled` |
| `OutboxStatus` | `pending`, `processing`, `delivered`, `failed` |
| `SessionStatus` | `pending`, `confirmed`, `pending_confirmation`, `disputed`, `completed`, `cancelled` |
| `TransactionType` | `recharge`, `frozen`, `released`, `commission`, `subsidy`, `withdrawal`, `refund` |
| `SubjectLevel` | `basic`, `intermediate`, `advanced` |
| `WithdrawalStatus` | `pending`, `approved`, `rejected` |

## API reference

Base URL: `http://localhost:3000/api`

Authentication uses a bearer token: `Authorization: Bearer <token>`. The `authenticate` middleware re-reads the user from the database on every request and rejects deactivated accounts, so revoking access is immediate.

### Auth — `/auth`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| POST | `/register` | public | `{ name, email, password, role, academicUnitId?, institutionId? }` — role must be `student` or `tutor`. Without `institutionId` the institution is resolved from the email domain. Rejected with `PLAN_STUDENT_LIMIT_REACHED` when the institution has hit its plan limit |
| POST | `/login` | public | `{ email, password }` → `{ user, token }` |
| GET | `/profile` | authenticated | — |

### Users — `/users`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/` | admin | `?search&role&institutionId&page&limit` |
| PUT | `/:id/toggle` | admin | Activates / deactivates a user |
| PATCH | `/me/preferences` | authenticated | `{ locale?, themePreference? }` — the person's own language and theme |

### Tutors — `/tutors`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/` | authenticated | `?search&minRating&maxRate&unitId&page&limit` (default 9 per page, sorted by rating) — only tutors the tutoring policy allows |
| GET | `/:id` | authenticated | Full tutor profile with subjects and availability; never exposes the email |
| GET | `/:id/availability` | authenticated | Weekly availability blocks |
| GET | `/:id/booked-slots` | authenticated | `?date=YYYY-MM-DD` → occupied slots for that day |
| PUT | `/profile` | tutor | `{ bio, hourlyRate }` |
| POST | `/subjects` | tutor | `{ subjectId, level? }` |
| DELETE | `/subjects/:subjectId` | tutor | — |
| POST | `/availability` | tutor | `{ slots: [{ dayOfWeek, startTime, endTime }] }` — replaces all existing blocks |

### Sessions — `/sessions`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/` | authenticated | `?page&limit&status` — scoped to the caller (admins see everything) |
| GET | `/:id` | participants / admin | — |
| POST | `/` | student | `{ tutorId, subjectId, date, startTime, endTime, notes? }` |
| PUT | `/:id/confirm` | tutor | `pending` → `confirmed` |
| PUT | `/:id/cancel` | participants / admin | Applies the cancellation policy |
| PUT | `/:id/complete` | tutor | `confirmed` → `pending_confirmation` |
| PUT | `/:id/student-confirm` | student | Releases the escrow and completes the session |
| PUT | `/:id/dispute` | student | `{ reason }` — only from `pending_confirmation` |
| PUT | `/:id/resolve` | admin | `{ favorOf: "student" \| "tutor" }` |

### Wallet — `/wallet`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/` | authenticated | Own wallet |
| GET | `/transactions` | authenticated | `?limit&offset&type` |
| POST | `/recharge` | admin | `{ userId, amount }` — manual credit |
| POST | `/subsidy` | admin, university | `{ studentId, amount, reason?, universityId }` — debits the university balance |

### PayPal — `/paypal`

| Method | Endpoint | Access | Body |
|---|---|---|---|
| POST | `/create-order` | authenticated | `{ amount }` — allowed: 5, 10, 20, 50, 100 USD |
| POST | `/capture-order` | authenticated | `{ orderId }` — credits the wallet of whoever **created** the order, not of whoever calls; duplicates are rejected by the order state machine |
| POST | `/webhook` | public | PayPal event; re-captures against PayPal before crediting, so a forged event cannot invent money |

### Withdrawals — `/withdrawals`

| Method | Endpoint | Access | Body |
|---|---|---|---|
| GET | `/` | authenticated | Own requests; admins see all |
| POST | `/` | tutor | `{ amount, paypalEmail }` — only one pending request at a time |
| PUT | `/:id/approve` | admin | Confirms the payout and clears the frozen amount |
| PUT | `/:id/reject` | admin | `{ notes }` — returns the amount to the balance |

### Reviews — `/reviews`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/tutor/:tutorId` | public | `?limit&offset` |
| POST | `/` | student | `{ sessionId, rating, comment? }` — completed sessions only, one review each |
| DELETE | `/:id` | admin | Deletes and recalculates the average |

### AI — `/ai`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/recommendations` | authenticated | Top 3 tutors for the student, with a reason for each |
| GET | `/review-summary/:tutorId` | public | Summary of the tutor's latest reviews |

### Institutions — `/institutions`

Every endpoint that returns tenant data is scoped to the institution of the caller. `platform_admin` is the only role with a global view.

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/public` | public | Active institutions for the registration picker — no balance, no settings |
| GET | `/units` | public | `?institutionId&page&limit` — `institutionId` is **required**, so the listing can never span institutions |
| GET | `/units/:id/subjects` | public | `?page&limit` |
| GET | `/me` | authenticated | Own institution with resolved `settings`, `labels`, effective `commissionRate`, currency and subscription |
| GET | `/currencies` | authenticated | Active currency catalogue |
| GET | `/plans` | authenticated | Active plan catalogue |
| GET | `/subjects` | authenticated | `?search&unitId&page&limit` — scoped to the institution of the caller |
| GET | `/` | platform_admin | `?search&status&type&page&limit` — paginated institution list |
| POST | `/` | platform_admin | Creates an institution, its verified primary domain and its subscription |
| GET | `/:id` | platform_admin | One institution with domains, subscription and counts |
| PUT | `/:id` | platform_admin | Updates any field. `currencyCode` is refused once money exists |
| PATCH | `/:id/status` | platform_admin | `{ status: active \| suspended, reason? }` |
| POST | `/:id/approve` | platform_admin | `{ planCode?, trialDays? }` — activates a pending application and invites its contact |
| POST | `/:id/reject` | platform_admin | `{ reason }` |
| DELETE | `/:id` | platform_admin | Only when the institution has no users |
| PATCH | `/me` | institution_admin | Name, logo, colour, timezone, locale and `settings` — never currency or commission |
| GET | `/platform-earnings` | platform_admin | Commission balance **read from the ledger**, with the cached projection alongside |
| POST | `/recharge` | platform_admin | `{ institutionId, amount }` — manual institutional top-up |
| POST | `/subjects` | institution_admin | `{ name, code, termNumber?, credits?, isGeneral?, unitId? }` |
| PUT | `/subjects/:id` | institution_admin | Updates a subject |
| DELETE | `/subjects/:id` | institution_admin | Deletes a subject |
| POST | `/units` | institution_admin | `{ name, code, kind? }` — `kind` defaults to the institution type |
| PUT | `/units/:id` | institution_admin | `{ name, code, kind }` |
| DELETE | `/units/:id` | institution_admin | — |
| POST | `/units/:id/subjects` | institution_admin | `{ subjectId }` |
| DELETE | `/units/:id/subjects/:subjectId` | institution_admin | — |
| GET | `/analytics` | institution_admin, platform_admin | Overview, top tutors, top subjects, recent sessions |
| GET | `/students` | institution_admin, platform_admin | `?search&page&limit` |
| GET | `/subsidies` | institution_admin, platform_admin | Subsidy history |
| POST | `/create-order` | institution_admin | `{ amount }` — allowed: 100, 250, 500, 1000, 2000 |
| POST | `/capture-order` | institution_admin | `{ orderId }` — credits the institutional balance |
| GET | `/units/:id/grade-levels` | institution_admin | Grades of a unit, ordered |
| POST | `/units/:id/grade-levels` | institution_admin | `{ name, code, orderIndex? }` |
| PUT | `/grade-levels/:id` | institution_admin | Renames or reorders a grade |
| DELETE | `/grade-levels/:id` | institution_admin | Refused while students are assigned to it |
| GET | `/templates` | institution_admin | Academic structure templates, flagging the one that fits the institution type |
| POST | `/templates/:code/apply` | institution_admin | Creates the units and grades of a template. Idempotent |
| GET | `/domains` | institution_admin | Domains of the institution — never the verification token |
| POST | `/domains` | institution_admin | `{ domain }` |
| POST | `/domains/:id/verification` | institution_admin | `{ method: dns \| email }` — returns the TXT record, or emails `postmaster@` |
| POST | `/domains/:id/verify` | institution_admin | `{ method, token? }` |
| POST | `/domains/:id/primary` | institution_admin | Requires a verified domain |
| DELETE | `/domains/:id` | institution_admin | Refused on the primary domain |
| GET | `/invitations` | institution_admin | `?status&page&limit` — never the token |
| POST | `/invitations` | institution_admin | `{ email, role, name? }` |
| POST | `/invitations/:id/resend` | institution_admin | Rotates the token and invalidates the previous one |
| DELETE | `/invitations/:id` | institution_admin | Revokes a pending invitation |
| POST | `/imports/students` | institution_admin | `text/csv` body, `?dryRun` — columns `name,email,unitCode?,gradeCode?,program?,termNumber?` |
| POST | `/imports/subjects` | institution_admin | `text/csv` body, `?dryRun` — columns `code,name,unitCode?,termNumber?,credits?,isGeneral?` |
| GET | `/subscription` | institution_admin | Plan occupancy: students, maximum, remaining |
| POST | `/subscription` | platform_admin | `{ institutionId?, planCode, status?, renewsAt? }` |
| DELETE | `/subscription` | platform_admin | Cancels the subscription |
| GET | `/admin/plans` | platform_admin | Plan catalogue including inactive ones |
| POST | `/admin/plans` | platform_admin | `{ code, name, maxStudents?, priceMonthly?, currencyCode? }` |
| PUT | `/admin/plans/:id` | platform_admin | Updates a plan |
| DELETE | `/admin/plans/:id` | platform_admin | Refused while institutions are subscribed |
| GET | `/exchange-rates` | platform_admin | `?fromCurrency&toCurrency&limit` |
| POST | `/exchange-rates` | platform_admin | `{ fromCurrency, toCurrency, rate, source?, validFrom? }` |
| GET | `/audit-logs` | institution_admin, platform_admin | `?entity&page&limit` — scoped to the caller's institution |

Resources belonging to another institution answer `404`, not `403`: confirming that an id exists is itself a leak.

### Public — `/public`

No authentication. These are the endpoints the registration and onboarding forms need before anyone has an account.

| Method | Endpoint | Body / Query |
|---|---|---|
| GET | `/institutions` | Active institutions for the registration picker — no balance, no settings |
| GET | `/institutions/resolve` | `?email` or `?domain` — resolves the institution of a **verified** domain, primary or secondary |
| POST | `/institutions/apply` | `{ name, domain, type, currencyCode?, contactName, contactEmail }` — creates a `pending` application |

### Invitations — `/auth`

| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| GET | `/invitations/:token` | public | Describes a pending invitation: email, role and institution |
| POST | `/invitations/accept` | public | `{ token, name, password }` — creates or activates the account and returns a session |

### Deprecated — `/universities`

Every old path answers with `Deprecation: true`, a `Sunset` date and a `Link` to its successor, and each call is logged. Paths that kept their shape are forwarded to `/institutions`; `/faculties*` and `/list` changed shape and answer `410 Gone` with the successor in the body.

### Health

| Method | Endpoint | Access |
|---|---|---|
| GET | `/health` | public |

## Money and accounting

Every movement of money goes through a single function, `postEntry()`, which refuses to persist an entry that does not balance, that mixes currencies, or whose amounts are not positive. There is no other way to move money in the codebase.

- **Amounts are `Decimal(14,2)`**, never floats, and each one carries its currency.
- **The API still returns numbers, not strings.** A serializer in `apiResponse` converts `Decimal` on the way out, so the client contract is unchanged.
- **`Wallet.balance`, `Wallet.frozen` and `Institution.balance` are cached projections** of the ledger. `reconcile()` recomputes them from the entries and reports any drift; the test suite asserts it is zero after thousands of random operations.
- **Balances cannot go negative**: enforced by `CHECK` constraints in the database, not only in code.
- **The commission rate is frozen on the session at booking time**, so changing `PLATFORM_COMMISSION_RATE` never rewrites sessions already booked.

| Operation | Debit | Credit |
|---|---|---|
| Top-up | `external_payments` | `wallet(user)` |
| Booking | `wallet(student)` | `escrow(student)` |
| Settlement | `escrow(student)` | `wallet(tutor)` + platform commission |
| Refund | `escrow(student)` | `wallet(student)` |
| Subsidy | `institution_funds` | `wallet(student)` |
| Withdrawal | `wallet(tutor)` | `external_payouts` |

## Business rules

### Booking validation

When a student books a session, the API checks, in order:

1. The tutor exists and has availability on that weekday (1 = Monday … 7 = Sunday).
2. The requested time range fits **entirely** inside one availability block.
3. The date and time are in the future, evaluated in `America/Tegucigalpa`.
4. The tutor has no overlapping `pending` or `confirmed` session.
5. The student has no overlapping `pending` or `confirmed` session.
6. The student's wallet balance covers the price (the tutor's `hourlyRate`).

If all checks pass, a single transaction creates the session (`pending`), moves the price from `balance` to `frozen`, and writes a `frozen` transaction. A Jitsi room (`https://meet.jit.si/macaw-<timestamp>-<random>`) is generated at booking time.

### Payment flow

```
1. The student tops up their wallet with PayPal (5 / 10 / 20 / 50 / 100 USD)
2. They book a session      → the credits are frozen (escrow)
3. The tutor confirms and delivers the tutoring session
4. The tutor marks it as delivered → status pending_confirmation
5. The student confirms
   → 90% goes to the tutor's balance and lifetimeEarned
   → 10% goes to the platform wallet as commission
   → the tutor's totalSessions counter is incremented
6. The tutor requests a withdrawal → an admin approves it and pays out via PayPal
```

If the student does nothing, step 5 happens automatically 24 hours later (see [Background jobs](#background-jobs)).

### Session lifecycle

```
              tutor confirms          tutor marks delivered      student confirms
   pending ────────────────► confirmed ─────────────────► pending_confirmation ──────────────► completed
      │                          │                                │                              ▲
      │ cancel                   │ cancel                         │ dispute                      │
      ▼                          ▼                                ▼            admin resolves    │
  cancelled                 cancelled                         disputed ────────────────────────┘
   (full refund)      (policy applies)                                    (in favor of tutor)
                                                                     └──► cancelled (in favor of student)
```

### Cancellation policy

```
More than 24h before the session  → 100% refunded to the student
Less than 24h  (confirmed session) → 50% refunded to the student
                                   → 50% paid to the tutor as compensation
```

Sessions already `completed`, `cancelled` or `disputed` cannot be cancelled. Both participants — and admins — can cancel.

### Disputes

A student can dispute a session only while it is in `pending_confirmation`, optionally supplying a reason (stored in `notes`). Every admin is notified. An admin resolves it with `favorOf`:

- `student` → the session is `cancelled` and the full price is refunded.
- `tutor` → the session is `completed`, the tutor receives 90% and `totalSessions` is incremented.

### Withdrawals

Requesting a withdrawal moves the amount from `balance` to `frozen` immediately, so it cannot be spent twice. Approval clears the frozen amount and records a `withdrawal` transaction; rejection returns the amount to `balance` as a `refund` and stores the admin's notes. A tutor can only have one `pending` request at a time.

### Subsidies

Universities top up an institutional balance (with PayPal or an admin recharge) and grant credits to their students. The subsidy is rejected if the institutional balance is insufficient; otherwise it debits the university, credits the student's wallet, and records both a `subsidy` transaction and a `Subsidy` row.

### Reviews

Only the student who took a `completed` session can review it, once, with a 1–5 rating. Creating or deleting a review recalculates the tutor's `averageRating` inside the same transaction.

## Background jobs

Jobs run in a **separate process** (`npm run worker`), not inside the API. Two API instances would otherwise both fire the same cron and release the same payment twice.

Each job takes a `pg_advisory_lock` before running, so only one worker instance executes it. The real guarantee against double payment is not the lock, though — it is the ledger's idempotency key, which makes settling a session twice impossible at the database level.

| Job | Schedule | What it does |
|---|---|---|
| `sessionReminders` | `0 8 * * *` (daily 08:00) | Queues a reminder for both participants of every `confirmed` session scheduled for the next day. Idempotent: running it twice does not send two emails |
| `autoConfirm` | `0 * * * *` (hourly) | Finds `pending_confirmation` sessions untouched for 24h, completes them and releases the escrow. A session already settled is skipped, not paid again |
| `outboxDispatcher` | `* * * * *` (every minute) | Delivers pending outbox events with exponential backoff (30s, 2m, 10m, 1h) before giving up |
| `reconcileSubscriptions` | `30 3 * * *` (daily 03:30) | Recounts the active students of every institution and corrects any drift in the cached counter |

## Notifications

There are two notification channels:

**Make.com webhook** — session lifecycle events are POSTed to `MAKE_WEBHOOK_URL` with an `eventType` field and the relevant payload. Failures are logged and never break the request. Events: `session_booked`, `session_confirmed`, `session_cancelled`, `session_pending_confirmation`, `session_completed`, `session_disputed`, `dispute_resolved`.

**Nodemailer (Gmail SMTP)** — used directly for withdrawal emails (`withdrawalRequested`, `withdrawalApproved`, `withdrawalRejected`) and daily session reminders, rendered from the HTML templates in `src/utils/emailTemplates.js`.

## AI features

Both endpoints use OpenAI `gpt-4o-mini`:

- **Tutor recommendations** — builds a prompt with the student's career, quarter, GPA and last 10 completed subjects, plus up to 20 active tutors, and asks for the top 3 with a short reason each. The JSON reply is parsed and enriched with the real tutor records.
- **Review summary** — summarizes a tutor's last 20 reviews into at most three sentences covering strengths and areas for improvement. Returns a friendly message when there are no reviews or no comments yet.

## Real-time

Socket.io is back, and this time it emits. It had been removed during the hardening sprint because it was initialized, never fired a single event, and joined an unauthenticated room.

**The connection is authenticated before it joins anything.** The client sends its JWT in the handshake; the server verifies it and joins exactly one room, `user:<id>`. There is no client-supplied room name anywhere, so nobody can listen to someone else's events.

**The socket is an extra, not the mechanism.** A notification that only lives in a socket is lost for anyone who was not connected, and the worker — a separate process — cannot emit into the API's socket server without a Redis adapter. So the `Notification` row is written first, inside the same transaction as the change that caused it, and the emit is a best-effort extra on top. If the socket is down, the bell catches up on the next fetch or when the tab regains focus.

With more than one API instance you need `@socket.io/redis-adapter`, otherwise live delivery only reaches whoever is connected to the instance that emitted (BL-68).

## Frontend routes

| Route | Access |
|---|---|
| `/` | public — landing page |
| `/login`, `/register` | public — redirect to the role dashboard when already logged in |
| `/dashboard` | authenticated — redirects to the dashboard for the role |
| `/student/dashboard`, `/tutors`, `/tutors/:id`, `/tutors/:id/book`, `/student/sessions`, `/student/wallet` | student |
| `/tutor/dashboard`, `/tutor/sessions`, `/tutor/wallet`, `/tutor/profile` | tutor |
| `/invitation/:token` | public — accept an invitation and choose a password |
| `/institutions/apply` | public — an institution asks for an account |
| `/institution/dashboard`, `/institution/units`, `/institution/subjects`, `/institution/settings`, `/institution/domains`, `/institution/team`, `/institution/import` | institution_admin |
| `/institution/students`, `/institution/subsidies` | institution_admin, platform_admin |
| `/admin/dashboard`, `/admin/users`, `/admin/sessions`, `/admin/withdrawals`, `/admin/plans` | platform_admin |
| `/admin/institutions`, `/admin/institutions/new`, `/admin/institutions/:id` | platform_admin |
| `*` | 404 page |

The old `/university/*` and `/admin/universities` paths redirect to their new homes, so bookmarks keep working.

The session token is persisted by Zustand in `localStorage` under `macaw-auth`. The axios interceptor attaches it to every request and, on any `401` that is not a login attempt, clears the session and redirects to `/login`.

## Deployment

**Frontend** — the included `vercel.json` rewrites every path to `/index.html` so client-side routing works on Vercel. Build with `npm run build` and set `VITE_API_URL` and `VITE_PAYPAL_CLIENT_ID` in the hosting provider.

**Backend** — use `npm run start:prod`, which runs `prisma migrate deploy` before starting the server, and run `npm run worker` as a second process for the crons and the outbox. Set every backend variable in the environment, point `CLIENT_URL` at the deployed frontend (the CORS allowlist depends on it) and switch `PAYPAL_MODE` away from `sandbox` only when you are ready to take real payments.

**Database** — any managed PostgreSQL works; only `DATABASE_URL` needs to change. Run the seed once if you want the demo dataset.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `Can't reach database server` | The container is not running (`docker-compose up -d`) or `DATABASE_URL` uses port 5432 instead of **5433** |
| CORS errors in the browser | `CLIENT_URL` does not exactly match the frontend origin |
| `Platform wallet not found` | The seed has not been run — the `platform@macaw.app` account is required to collect commissions |
| 401 on every request right after logging in | `JWT_SECRET` changed after the token was issued, or the account was deactivated |
| `PayPal: ...` errors | Wrong sandbox credentials, or `PAYPAL_MODE` does not match the credentials you are using |
| The AI returns "respuesta inválida" | The model did not answer with valid JSON — retry; also check `OPENAI_API_KEY` and your quota |
| Emails never arrive | Gmail requires an **app password** in `MAIL_PASS`; failures are only logged, they don't fail the request |
| Time slots look shifted | All date logic assumes `America/Tegucigalpa` (`src/utils/dateTime.js`) |

## Known limitations

- The rate limiter is configured (100 requests / 15 min) but the `app.use("/api", limiter)` line is commented out in `src/app.js`.
- The 10% commission is hardcoded in the session and job logic, even though `University.commissionRate` exists in the schema.
- The email transport hardcodes Gmail SMTP; `MAIL_HOST` and `MAIL_PORT` are not read.
- Live notification delivery reaches only the API instance that emitted; scaling out needs a Redis adapter.
- There is no automated test suite — `npm test` in the backend is still the default placeholder.

---

<a name="español"></a>

# Español

## Tabla de contenido

- [Descripción general](#descripción-general)
- [Stack técnico](#stack-técnico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Correr el proyecto](#correr-el-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Scripts de NPM](#scripts-de-npm)
- [Datos semilla y credenciales demo](#datos-semilla-y-credenciales-demo)
- [Modelo de datos](#modelo-de-datos)
- [Referencia de la API](#referencia-de-la-api)
- [Reglas de negocio](#reglas-de-negocio)
- [Jobs programados](#jobs-programados)
- [Notificaciones](#notificaciones)
- [Funcionalidades de IA](#funcionalidades-de-ia)
- [Tiempo real](#tiempo-real)
- [Rutas del frontend](#rutas-del-frontend)
- [Despliegue](#despliegue)
- [Solución de problemas](#solución-de-problemas)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Descripción general

Macaw es una aplicación web full-stack con cuatro roles, cada uno con su propio dashboard y permisos:

| Rol | Qué puede hacer |
|---|---|
| `student` | Buscar tutores, reservar sesiones, recargar la wallet con PayPal, entrar a la videollamada, confirmar o reportar una sesión, dejar reseñas |
| `tutor` | Administrar su perfil (bio, tarifa por hora, materias, disponibilidad semanal), aceptar/rechazar reservas, marcar sesiones como impartidas, solicitar retiros |
| `university` | Administrar facultades y materias, ver analíticas, recargar el saldo institucional y otorgar subsidios a sus estudiantes |
| `admin` | Administrar usuarios, sesiones y universidades, resolver disputas, aprobar/rechazar retiros, ver las ganancias de la plataforma |

El dinero nunca se mueve directamente entre usuarios. El estudiante compra créditos internos, los créditos se congelan (escrow) al reservar y solo se liberan al tutor cuando la sesión se confirma como impartida, descontando el 10% de comisión de la plataforma.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 + Framer Motion |
| Ruteo / estado | React Router 7, Zustand (auth persistida), TanStack React Query |
| Formularios / validación | React Hook Form + Zod |
| UI adicional | lucide-react, react-hot-toast, recharts, react-big-calendar, date-fns |
| Backend | Node.js + Express 5 |
| ORM / BD | Prisma 6 + PostgreSQL 18 |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Seguridad | helmet, cors, express-rate-limit |
| Pagos | PayPal REST API (sandbox) + `@paypal/react-paypal-js` |
| IA | OpenAI `gpt-4o-mini` |
| Videollamadas | Jitsi Meet (sala pública generada por sesión) |
| Email | Nodemailer (SMTP de Gmail) |
| Automatizaciones | Webhook de Make.com para las notificaciones del ciclo de vida de la sesión |
| Tiempo real | Socket.io autenticado por JWT, una sala por persona, con la notificación persistida en la base |
| Tareas programadas | node-cron |
| Contenedor | Docker Compose (PostgreSQL) |

## Arquitectura

```
┌─────────────────────┐        HTTPS / JSON        ┌──────────────────────┐
│  SPA React (Vite)   │ ─────────────────────────► │  API Express         │
│  Zustand + Query    │ ◄───────────────────────── │  JWT + guards de rol │
└─────────┬───────────┘                            └──────────┬───────────┘
          │                                                   │
          │ SDK de PayPal                                     │ Prisma
          ▼                                                   ▼
   ┌─────────────┐        ┌──────────────┐          ┌──────────────────┐
   │  PayPal     │◄──────►│  PayPal REST │          │  PostgreSQL 18   │
   └─────────────┘        └──────────────┘          └──────────────────┘
                                                              ▲
   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐      │
   │  Jitsi Meet │   │  OpenAI API  │   │ Webhook Make │──────┘
   └─────────────┘   └──────────────┘   └──────────────┘
```

El backend sigue el patrón **módulo → routes → controller → service**. Las rutas declaran los middlewares de autenticación y rol, los controladores solo traducen HTTP a llamadas del servicio y arman la respuesta con `utils/apiResponse`, y los servicios contienen toda la lógica de negocio y las transacciones de Prisma.

Todas las respuestas usan el mismo formato:

```json
{ "success": true,  "message": "Success", "data": { } }
{ "success": false, "message": "Saldo insuficiente" }
```

## Estructura del proyecto

```
macaw/
├── docker-compose.yml            # PostgreSQL 18 (puerto 5433 en el host)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # 13 modelos + 5 enums
│   │   ├── migrations/
│   │   ├── seed.js               # orquestador del seed
│   │   └── seeds/                # universidad, facultades, materias, usuarios, tutores
│   └── src/
│       ├── app.js                # App de Express (middleware, rutas, manejo de errores)
│       ├── config/
│       │   ├── prisma.js         # PrismaClient único compartido
│       │   ├── paypal.js         # cache del token OAuth, crear/capturar orden
│       │   ├── platform.js       # wallet de la plataforma cacheada
│       │   └── mailer.js         # transporte de Nodemailer (SMTP Gmail)
│       ├── middlewares/
│       │   └── auth.middleware.js  # authenticate() + authorize(...roles)
│       ├── modules/
│       │   ├── auth/             # registro, login, perfil
│       │   ├── users/            # listado admin, activar/desactivar
│       │   ├── tutors/           # perfil, materias, disponibilidad, slots ocupados
│       │   ├── sessions/         # ciclo de vida de la reserva + escrow + disputas
│       │   ├── wallet/           # wallet, transacciones, PayPal, retiros
│       │   ├── reviews/          # calificaciones + recálculo del promedio
│       │   ├── ai/               # recomendaciones, resumen de reseñas
│       │   └── universities/     # facultades, materias, analíticas, subsidios
│       ├── jobs/
│       │   ├── sessionReminders.js  # recordatorios diarios a las 08:00
│       │   └── autoConfirm.js       # liberación automática del escrow cada hora
│       └── utils/
│           ├── jwt.js            # sign / verify
│           ├── apiResponse.js    # ok, created, error, notFound, unauthorized, forbidden
│           ├── dateTime.js       # helpers de America/Tegucigalpa y traslape de horarios
│           └── emailTemplates.js # plantillas HTML de correo
└── frontend/
    ├── vercel.json               # rewrite para SPA
    ├── vite.config.js            # puerto 5173 + proxy de /api al :3000
    └── src/
        ├── main.jsx / App.jsx
        ├── router.jsx            # rutas perezosas, un chunk por página + ProtectedRoute
        ├── app/ErrorBoundary.jsx # una pantalla rota ya no tumba la aplicación
        ├── ui/                   # Button, Input, Select, Modal, Card, Badge, Avatar, Skeleton, Alert
        ├── patterns/             # PageHeader, StatCard, DataTable, Pagination, SearchInput,
        │                         # FilterBar, EmptyState, ErrorState, ConfirmDialog, Wizard
        ├── domain/               # Money, DateTime, SessionCard, TutorCard, SessionStatusBadge,
        │                         # RoleBadge, TransactionList, WalletBalanceCard
        ├── data/                 # factory de queryKeys + un archivo de hooks por dominio
        ├── components/
        │   ├── layout/Navbar.jsx
        │   └── wallet/           # RechargeModal, UniversityRechargeModal
        ├── pages/
        │   ├── public/           # Landing, Login, Register, NotFound,
        │   │                     # AcceptInvitation, ApplyForAccount
        │   ├── student/          # Dashboard, TutorSearch, TutorProfile, BookSession, MySessions, MyWallet
        │   ├── tutor/            # Dashboard, MyProfile, MySessions, MyWallet
        │   ├── institution/      # Dashboard, AcademicUnits, Subjects, Students, Subsidies,
        │   │                     # Settings, Domains, Team, Imports
        │   └── admin/            # Dashboard, Users, Sessions, Withdrawals, Institutions,
        │                         # InstitutionDetail, NewInstitution, Plans
        ├── services/             # instancia de axios + un servicio por módulo de la API
        ├── store/                # authStore ("macaw-auth"), themeStore ("macaw-theme")
        └── utils/dateTime.js
```

## Design system

Todas las páginas se arman con tres capas compartidas, así un cambio se hace una vez y no veinticinco.

- **`ui/`** — primitivas con variantes en CVA. `Input`, `Select` y `Textarea` envuelven un `Field` que genera el id y asocia su propia etiqueta, así que el control queda etiquetado por construcción. `Modal` es un diálogo de Radix: foco atrapado, cierre con Escape, bloqueo del scroll y ARIA vienen incluidos.
- **`patterns/`** — las composiciones que antes se copiaban y pegaban: paginación, búsqueda, filtros, estados vacíos y de error, diálogos de confirmación, tarjetas de métrica.
- **`domain/`** — componentes que saben qué significan los datos. `<Money>` formatea con `Intl.NumberFormat` en la moneda y el idioma de la institución, así que una institución en lempiras por fin ve lempiras.

**Todo color es un token.** No queda un solo `bg-white`, `text-gray-500` ni `bg-red-600` crudo en `src`: los componentes nombran lo que un color *significa* — `bg-surface`, `text-content-secondary`, `bg-danger-solid` — y cada token tiene un valor por tema.

**La envoltura de la API se desempaqueta una sola vez.** El interceptor de respuesta devuelve `data`, así que ninguna página contiene `r.data.data`. Las claves de consulta viven en una única factory (`data/queryKeys.js`) y toda mutación invalida a través de ella, que es lo que evita que una lista quede desactualizada tras una escritura.

**Las rutas son perezosas.** Cada página es su propio chunk, así que la pantalla de login ya no descarga el panel de administración.

## Dar de alta una institución

Hay dos caminos de entrada, y tienen forma distinta a propósito.

**Una institución pide entrar.** `/institutions/apply` es un único formulario público: nombre, dominio de correo, tipo, moneda y un contacto. Queda en `pending` y alguien de la plataforma la aprueba o la rechaza desde `/admin/institutions`. Aprobar asigna plan y envía la invitación al contacto; rechazar deja un motivo escrito.

**La plataforma da de alta a un cliente que ya firmó.** `/admin/institutions/new` es un asistente de cinco pasos, porque este camino tiene que elegir moneda —que **no se puede cambiar una vez que hay movimientos de dinero**—, plan, plantilla académica y primer coordinador.

El asistente hace tres peticiones distintas, y HTTP no tiene transacción entre ellas. Por eso guarda el id de la institución en cuanto se crea y enseña el resultado de cada paso: si falla aplicar la plantilla, reintentar repite solo lo que falló en vez de crear una segunda institución.

**Los dominios se verifican de dos formas.** Por DNS, publicando un registro TXT, o por correo, con un código enviado a la dirección postmaster del dominio. Hasta que un dominio no está verificado, nadie se asocia automáticamente a la institución a través de él: eso es lo que impide que alguien reclame un dominio que no es suyo.

**La vista previa del CSV no miente.** Recorre el mismo código que la importación real, dentro de una transacción que se revierte, y devuelve el resultado de cada fila. La pantalla muestra el número de línea, el valor conflictivo y el motivo traducido, porque quien sube un padrón va a corregir el archivo y volver a subirlo: un recuento de fallos no le serviría de nada.

## Temas

El tema tiene tres estados: claro, oscuro y lo que diga el sistema operativo. El store guarda la *preferencia*; `data-theme` en `<html>` guarda el tema *efectivo*. Un script en línea dentro de `index.html` lo escribe antes del primer pintado, así que la página no parpadea en blanco camino del oscuro.

**Ninguna página contiene una clase `dark:`.** La variante aparece solo donde se definen los tokens. Eso es lo que hace verificable la paleta: hay veintiocho pares de tokens que comprobar, no mil clases dispersas.

Se comprueban con `npm run check:contrast`. El script falla por debajo de WCAG AA (4,5:1 para texto, 3:1 para el contorno de un control según 1.4.11), y se ganó el sueldo en la primera ejecución: el texto blanco sobre el botón naranja llevaba desde el principio en 3,56:1. El color de identidad no cambió —`--brand` sigue siendo el mismo naranja—, pero el relleno del botón es ahora un token aparte, más profundo.

**Todos los colores de marca son tokens de verdad del tema**, declarados en `@theme inline`, no clases escritas a mano en `@layer utilities`. No es cosmética: `tailwind-merge` clasifica por prefijo las clases que no conoce, así que `bg-brand` y `bg-brand-hover` le parecían la misma utilidad en conflicto y se quedaba solo con la segunda —cada botón primario de la aplicación se pintaba sin fondo—. Una clase escrita a mano tampoco admite variantes, así que `hover:border-brand` no hacía nada. Los nombres siguen la misma forma que el resto de la paleta: `brand-surface`, `brand-line`, `brand-content`, `brand-solid`, `brand-solid-hover`, `brand-contrast`.

Cada institución sigue sobreescribiendo la marca con su `primaryColor`. `applyBrand` deriva la rampa entera a partir de ese único color **para el tema activo**, y la recalcula al cambiar de tema: oscurece el relleno hasta que el texto blanco supera 4,5:1, mezcla la superficie suave hacia el fondo de la página y ajusta el acento hasta que supera 3:1 contra él.

## Idiomas

Español e inglés, con `i18next`. El idioma se resuelve en este orden: preferencia guardada de la persona, `locale` de la institución, navegador, español.

Los diccionarios están partidos en doce namespaces y se cargan por idioma, así que cambiar a inglés descarga los archivos en inglés y nada más: no están en el bundle inicial.

**Los errores del backend se traducen por código, nunca por mensaje.** La API devuelve `{ code, params }`; el cliente busca el código en el namespace `errors` e interpola los parámetros. El mensaje en español del servidor es una reserva de emergencia, y un código que llegue sin traducción registra un aviso en desarrollo en vez de fallar en silencio. De lo contrario tendrías una interfaz en inglés que responde en español justo cuando algo se rompe.

Los correos se traducen en el servidor, en el idioma de quien los recibe, y con los montos en la moneda real de la institución.

Dos scripts lo mantienen honesto: `npm run check:errors` demuestra que todos los códigos del catálogo del backend tienen traducción en los dos idiomas, y `npm run check:i18n` demuestra que los dos diccionarios llevan las mismas claves y que ninguna clave usada en el código falta.

**Las etiquetas siguen al tipo de institución.** Una universidad tiene facultades, una escuela tiene niveles, un bootcamp tiene programas. `useUnitLabels()` lo resuelve en un solo sitio, en los dos idiomas.

## Requisitos

- Node.js v18 o superior
- Docker Desktop (para PostgreSQL) o una instancia local de PostgreSQL 18
- Git
- Una cuenta sandbox de PayPal developer (para los pagos)
- Una API key de OpenAI (para las funciones de IA)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/xEdwardP/Macaw.git
cd Macaw
```

### 2. Configurar las variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edita ambos archivos con tus credenciales — revisa [Variables de entorno](#variables-de-entorno).

### 3. Levantar la base de datos

```bash
docker-compose up -d
```

Levanta PostgreSQL 18 en el contenedor `macaw_postgres`, expuesto en el **puerto 5433 del host** (5432 dentro del contenedor), con la base `macaw_db`, usuario `macaw` y contraseña `macaw123`. Los datos se persisten en el volumen `postgres_data`.

Cadena de conexión correspondiente:

```
DATABASE_URL="postgresql://macaw:macaw123@localhost:5433/macaw_db"
```

### 4. Instalar dependencias del backend y migrar

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
```

### 5. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

## Correr el proyecto

Necesitas tres terminales abiertas al mismo tiempo.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

**Terminal 3 — Worker**

```bash
cd backend
npm run worker:dev
```

El worker no es opcional en la práctica. Los correos no los envía la petición que los provoca: la
transacción de negocio escribe un `OutboxEvent` y el worker lo despacha. **Sin el worker levantado,
las invitaciones, los recordatorios y los códigos de verificación de dominio se quedan en
`pending` en la base y no llega nada.** Enviar además necesita `MAIL_USER` y `MAIL_PASS`: si
faltan, `sendMail` avisa en el log y no envía, en lugar de fingir que sí.

Cuando el correo no está configurado, las pantallas de invitación muestran el enlace de aceptación
con un botón de copiar, para que igual se pueda dar de alta a un coordinador.

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API del backend | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |
| Prisma Studio | http://localhost:5555 (`npx prisma studio` desde `backend/`) |

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | sí | Cadena de conexión a PostgreSQL. Con el Docker incluido: `postgresql://macaw:macaw123@localhost:5433/macaw_db` |
| `JWT_SECRET` | sí | Clave para firmar los tokens. Genera una con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | sí | Duración del token, por ejemplo `7d` |
| `PORT` | no | Puerto de la API (por defecto `3000`) |
| `CLIENT_URL` | sí | Origen del frontend, usado por la lista blanca de CORS. Ejemplo: `http://localhost:5173` |
| `OPENAI_API_KEY` | para IA | API key de OpenAI, se obtiene en platform.openai.com |
| `MAIL_USER` | para email | Cuenta de Gmail usada como remitente |
| `MAIL_PASS` | para email | **Contraseña de aplicación** de Gmail (no la contraseña de la cuenta) |
| `MAIL_HOST` / `MAIL_PORT` | no | Están en `.env.example` como referencia; el transporte hoy fija `smtp.gmail.com:465` |
| `PAYPAL_CLIENT_ID` | para pagos | Client ID del sandbox de PayPal (developer.paypal.com) |
| `PAYPAL_CLIENT_SECRET` | para pagos | Client Secret del sandbox de PayPal |
| `PAYPAL_MODE` | para pagos | `sandbox` en desarrollo; cualquier otro valor usa PayPal en producción |
| `MAKE_WEBHOOK_URL` | para notificaciones | Webhook de Make.com que recibe los eventos del ciclo de vida de las sesiones |
| `CLOUDINARY_CLOUD_NAME` | para subidas | Cloud name de tu panel de Cloudinary |
| `CLOUDINARY_API_KEY` | para subidas | API key de Cloudinary |
| `CLOUDINARY_API_SECRET` | para subidas | API secret de Cloudinary |
| `CLOUDINARY_FOLDER` | no | Carpeta donde se suben las imágenes (por defecto `macaw`) |
| `UPLOAD_MAX_BYTES` | no | Tamaño máximo de imagen en bytes (por defecto 2 MB) |
| `NODE_ENV` | no | Cambia el log de Morgan entre `dev` y `combined` |

Sin las tres variables `CLOUDINARY_*`, subir avatar o logotipo responde **503 `UPLOAD_NOT_CONFIGURED`** con un mensaje claro en lugar de romperse a medias. Lo demás sigue funcionando: los dos campos también aceptan una URL escrita a mano.

### Frontend (`frontend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_API_URL` | sí | URL base del backend, por ejemplo `http://localhost:3000/api` |
| `VITE_PAYPAL_CLIENT_ID` | para pagos | El mismo Client ID de sandbox que usa el backend |
| `VITE_SUPPORT_EMAIL` | no | Correo de contacto de la Landing, también el destino de su formulario |
| `VITE_SUPPORT_PHONE` | no | Teléfono de contacto de la Landing |
| `VITE_SUPPORT_ADDRESS` | no | Ubicación que muestra la Landing |

## Scripts de NPM

### Backend

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta la API con nodemon |
| `npm start` | Levanta la API con node |
| `npm run start:prod` | Aplica las migraciones pendientes (`prisma migrate deploy`) y arranca la API |
| `npm run worker` | Arranca el worker de segundo plano (crons y despachador del outbox) |
| `npm run worker:dev` | Igual, con nodemon |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:seed` | Ejecuta `prisma/seed.js` |
| `npm run prisma:studio` | Abre Prisma Studio |

### Frontend

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite en el puerto 5173 con proxy de `/api` al `:3000` |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run lint` | Ejecuta ESLint |

## Datos semilla y credenciales demo

`node prisma/seed.js` es idempotente (usa `upsert`) y crea:

- **7 monedas** — USD, HNL, MXN, EUR, GTQ, CRC, COP
- **4 planes** — starter (200 estudiantes), basic (1.000), pro (5.000), enterprise (ilimitado)
- **3 instituciones de tipos y monedas distintas**, para poder ejercitar el aislamiento de verdad:
  - Universidad Católica de Honduras — `university`, USD, plan enterprise, dominio `unicah.edu`
  - Instituto San José — `college`, HNL, plan basic, dominio `sanjose.edu.hn`
  - Macaw Academy — `academy`, USD, plan starter, dominio `macawacademy.com`
- **12 unidades académicas** en UNICAH — ARQ, COM, DEN, DER, ENF, GEE, ICIV, ICC, IIND, MED, MKT, PSI
- **Materias generales y por unidad**, relacionadas mediante `UnitSubject`
- **100 estudiantes** de 10 programas, cada uno con una wallet precargada con **$50**
- **24 tutores** con perfil verificado, badges, materias en nivel `advanced` y disponibilidad de lunes a viernes de 08:00 a 18:00
- **1 admin de plataforma**, **1 administrador de institución** y la **wallet interna de la plataforma**

Todas las cuentas demo usan la contraseña `password123`.

| Rol | Email | Contraseña |
|---|---|---|
| Admin de plataforma (`platform_admin`) | `admin.macaw@yopmail.com` | `password123` |
| Administrador de institución (`institution_admin`) | `coordinador.macaw@yopmail.com` | `password123` |
| Estudiante | `sponce@unicah.edu` | `password123` |
| Tutor | `epineda@yopmail.com` | `password123` |

> La cuenta `platform@macaw.app` es interna: es dueña de la wallet donde se acumulan las comisiones, está oculta del listado de usuarios del admin y no se usa para iniciar sesión.

También puedes registrarte en `/register` con el rol `student` o `tutor`. Si no se envía institución, se resuelve por el dominio del correo a través de `InstitutionDomain` (`@unicah.edu` → UNICAH). El registro de un estudiante se rechaza si la institución alcanzó el límite de su plan. El registro crea automáticamente la wallet, y un `TutorProfile` cuando el rol es `tutor`.

## Modelo de datos

Esquema de Prisma: `backend/prisma/schema.prisma`.

| Modelo | Para qué sirve |
|---|---|
| `Institution` | Cualquier institución educativa — `type`, `status`, `currencyCode`, `timezone`, `settings` por tenant, `commissionRate` opcional como override y `balance` institucional para subsidios |
| `InstitutionDomain` | Dominios de correo que resuelven a una institución en el registro; una institución puede tener varios |
| `Currency` | Catálogo de monedas (`USD`, `HNL`, `MXN`, `EUR`, `GTQ`, `CRC`, `COP`) — tabla y no enum, para añadir monedas sin migración |
| `ExchangeRate` | Tipo de cambio entre dos monedas, vigente desde una fecha, para informes consolidados |
| `Plan` | Plan comercial con `maxStudents` (`null` = ilimitado), `priceMonthly` y flags de funcionalidades |
| `Subscription` | Plan de una institución, su estado y el conteo cacheado de estudiantes |
| `AcademicUnit` | Unidad académica de una institución — facultad, nivel, departamento, área o programa (`kind`), única por `(institutionId, code)` |
| `GradeLevel` | Grado concreto dentro de una unidad, para colegios y escuelas |
| `Subject` | Materia con `code`, `termNumber`, `credits` y la bandera `isGeneral`, única por `(institutionId, code)` |
| `UnitSubject` | Relación muchos a muchos entre unidades académicas y materias |
| `User` | Cuenta con `role`, `institutionId` / `academicUnitId` / `gradeLevelId` opcionales, `program`, `termNumber`, `academicScore`, `paypalEmail`, `isActive`, más `locale` (nulo = hereda el de la institución) y `themePreference` |
| `LedgerAccount` | Cuenta de partida doble — `user_wallet`, `user_escrow`, `institution_funds`, `external_payments`, `external_payouts`, `opening_balance` — única por `kind:currency:dueño` |
| `LedgerTransaction` | Un asiento contable. Su `idempotencyKey` única hace imposible liquidar dos veces la misma sesión a nivel de base de datos |
| `LedgerEntry` | Un movimiento del asiento: `debit` o `credit`, siempre positivo y siempre en una sola moneda |
| `PaymentOrder` | Orden del proveedor con `providerOrderId` único y máquina de estados `created → completed \| failed` |
| `OutboxEvent` | Evento de dominio escrito dentro de la transacción de negocio y despachado por el worker con reintentos exponenciales |
| `Invitation` | Invitación para unirse a una institución, con token único, rol y fecha de expiración |
| `AuditLog` | Rastro de auditoría por institución: quién hizo qué, sobre qué entidad y con qué valores |
| `TutorProfile` | 1:1 con un usuario tutor — `bio`, `hourlyRate`, `isVerified`, `totalSessions`, `averageRating`, `badges` |
| `TutorSubject` | Materias que imparte un tutor, con su `SubjectLevel` |
| `Availability` | Bloque semanal recurrente: `dayOfWeek` (1 = lunes … 7 = domingo) + `startTime`/`endTime` como `"HH:MM"` |
| `Session` | Reserva: fecha, rango horario, `price`, `currency` y `commissionRate` congeladas al reservar, `status`, `meetingUrl` generado y el `institutionId` del estudiante que paga |
| `Review` | Una reseña por sesión, calificación de 1 a 5; recalcula el promedio del tutor |
| `Wallet` | 1:1 con un usuario — `currency`, `balance`, `frozen` (escrow), `lifetimeEarned`. Son **proyecciones cacheadas del ledger**, y solo las escribe `postEntry()` |
| `Transaction` | La línea de extracto que ve el usuario, ligada a su `LedgerTransaction` |
| `Subsidy` | Crédito otorgado por una institución a un estudiante |
| `WithdrawalRequest` | Solicitud de retiro del tutor hacia PayPal |

**Enums**

| Enum | Valores |
|---|---|
| `Role` | `student`, `tutor`, `institution_admin`, `platform_admin`, `institution_staff`, `guardian` |
| `InstitutionType` | `university`, `college`, `school`, `technical`, `academy`, `bootcamp`, `organization` |
| `InstitutionStatus` | `pending`, `active`, `suspended`, `rejected` |
| `DomainVerificationMethod` | `dns`, `email`, `manual` |
| `AcademicUnitKind` | `faculty`, `level`, `department`, `area`, `program` |
| `SubscriptionStatus` | `trialing`, `active`, `past_due`, `suspended`, `cancelled` |
| `LedgerAccountKind` | `user_wallet`, `user_escrow`, `platform_revenue`, `institution_funds`, `external_payments`, `external_payouts`, `opening_balance` |
| `LedgerDirection` | `debit`, `credit` |
| `PaymentPurpose` | `wallet_topup`, `institution_topup` |
| `PaymentOrderStatus` | `created`, `completed`, `failed`, `cancelled` |
| `OutboxStatus` | `pending`, `processing`, `delivered`, `failed` |
| `SessionStatus` | `pending`, `confirmed`, `pending_confirmation`, `disputed`, `completed`, `cancelled` |
| `TransactionType` | `recharge`, `frozen`, `released`, `commission`, `subsidy`, `withdrawal`, `refund` |
| `SubjectLevel` | `basic`, `intermediate`, `advanced` |
| `WithdrawalStatus` | `pending`, `approved`, `rejected` |

## Referencia de la API

URL base: `http://localhost:3000/api`

La autenticación usa un bearer token: `Authorization: Bearer <token>`. El middleware `authenticate` vuelve a leer al usuario desde la base en cada petición y rechaza cuentas desactivadas, así que revocar el acceso es inmediato.

### Auth — `/auth`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| POST | `/register` | público | `{ name, email, password, role, academicUnitId?, institutionId? }` — el rol debe ser `student` o `tutor`. Sin `institutionId` la institución se resuelve por el dominio del correo. Se rechaza con `PLAN_STUDENT_LIMIT_REACHED` si la institución agotó el límite de su plan |
| POST | `/login` | público | `{ email, password }` → `{ user, token }` |
| GET | `/profile` | autenticado | — |

### Usuarios — `/users`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/` | admin | `?search&role&institutionId&page&limit` |
| PUT | `/:id/toggle` | admin | Activa / desactiva un usuario |
| PATCH | `/me/preferences` | autenticado | `{ locale?, themePreference? }` — idioma y tema de la propia persona |

### Tutores — `/tutors`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/` | autenticado | `?search&minRating&maxRate&unitId&page&limit` (9 por página por defecto, ordenado por rating) — solo los tutores que permite la política de tutorías |
| GET | `/:id` | autenticado | Perfil completo con materias y disponibilidad; nunca expone el correo |
| GET | `/:id/availability` | autenticado | Bloques de disponibilidad semanal |
| GET | `/:id/booked-slots` | autenticado | `?date=YYYY-MM-DD` → horarios ocupados de ese día |
| PUT | `/profile` | tutor | `{ bio, hourlyRate }` |
| POST | `/subjects` | tutor | `{ subjectId, level? }` |
| DELETE | `/subjects/:subjectId` | tutor | — |
| POST | `/availability` | tutor | `{ slots: [{ dayOfWeek, startTime, endTime }] }` — reemplaza todos los bloques existentes |

### Sesiones — `/sessions`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/` | autenticado | `?page&limit&status` — filtrado según quién consulta (el admin ve todo) |
| GET | `/:id` | participantes / admin | — |
| POST | `/` | student | `{ tutorId, subjectId, date, startTime, endTime, notes? }` |
| PUT | `/:id/confirm` | tutor | `pending` → `confirmed` |
| PUT | `/:id/cancel` | participantes / admin | Aplica la política de cancelación |
| PUT | `/:id/complete` | tutor | `confirmed` → `pending_confirmation` |
| PUT | `/:id/student-confirm` | student | Libera el escrow y completa la sesión |
| PUT | `/:id/dispute` | student | `{ reason }` — solo desde `pending_confirmation` |
| PUT | `/:id/resolve` | admin | `{ favorOf: "student" \| "tutor" }` |

### Wallet — `/wallet`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/` | autenticado | Wallet propia |
| GET | `/transactions` | autenticado | `?limit&offset&type` |
| POST | `/recharge` | admin | `{ userId, amount }` — recarga manual |
| POST | `/subsidy` | admin, university | `{ studentId, amount, reason?, universityId }` — debita el saldo de la universidad |

### PayPal — `/paypal`

| Método | Endpoint | Acceso | Body |
|---|---|---|---|
| POST | `/create-order` | autenticado | `{ amount }` — montos permitidos: 5, 10, 20, 50, 100 USD |
| POST | `/capture-order` | autenticado | `{ orderId }` — acredita la wallet de quien **creó** la orden, no de quien llama; los duplicados los rechaza la máquina de estados |
| POST | `/webhook` | público | Evento de PayPal; vuelve a capturar contra PayPal antes de acreditar, así que un evento falso no puede inventar dinero |

### Retiros — `/withdrawals`

| Método | Endpoint | Acceso | Body |
|---|---|---|---|
| GET | `/` | autenticado | Solicitudes propias; el admin ve todas |
| POST | `/` | tutor | `{ amount, paypalEmail }` — solo una solicitud pendiente a la vez |
| PUT | `/:id/approve` | admin | Confirma el pago y descuenta el monto congelado |
| PUT | `/:id/reject` | admin | `{ notes }` — devuelve el monto al balance |

### Reseñas — `/reviews`

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/tutor/:tutorId` | público | `?limit&offset` |
| POST | `/` | student | `{ sessionId, rating, comment? }` — solo sesiones completadas, una reseña por sesión |
| DELETE | `/:id` | admin | Elimina y recalcula el promedio |

### IA — `/ai`

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | `/recommendations` | autenticado | Los 3 mejores tutores para el estudiante, con una razón para cada uno |
| GET | `/review-summary/:tutorId` | autenticado | Resumen de las últimas reseñas del tutor, sujeto a la política de tutorías |

### Instituciones — `/institutions`

Todo endpoint que devuelve datos de tenant está acotado a la institución de quien llama. `platform_admin` es el único rol con vista global.

| Método | Endpoint | Acceso | Body / Query |
|---|---|---|---|
| GET | `/public` | público | Instituciones activas para el selector del registro — sin balance ni settings |
| GET | `/units` | público | `?institutionId&page&limit` — `institutionId` es **obligatorio**, para que el listado nunca cruce instituciones |
| GET | `/units/:id/subjects` | público | `?page&limit` |
| GET | `/me` | autenticado | Institución propia con `settings` resueltos, `labels`, `commissionRate` efectiva, moneda y suscripción |
| GET | `/currencies` | autenticado | Catálogo de monedas activas |
| GET | `/plans` | autenticado | Catálogo de planes activos |
| GET | `/subjects` | autenticado | `?search&unitId&page&limit` — acotado a la institución de quien llama |
| GET | `/` | platform_admin | `?search&status&type&page&limit` — listado paginado de instituciones |
| POST | `/` | platform_admin | Crea la institución, su dominio principal verificado y su suscripción |
| GET | `/:id` | platform_admin | Una institución con sus dominios, suscripción y conteos |
| PUT | `/:id` | platform_admin | Actualiza cualquier campo. `currencyCode` se rechaza si ya hay dinero emitido |
| PATCH | `/:id/status` | platform_admin | `{ status: active \| suspended, reason? }` |
| POST | `/:id/approve` | platform_admin | `{ planCode?, trialDays? }` — activa una solicitud pendiente e invita a su contacto |
| POST | `/:id/reject` | platform_admin | `{ reason }` |
| DELETE | `/:id` | platform_admin | Solo cuando la institución no tiene usuarios |
| PATCH | `/me` | institution_admin | Nombre, logo, color, zona horaria, idioma y `settings` — nunca moneda ni comisión |
| GET | `/platform-earnings` | platform_admin | Saldo de comisiones **leído del ledger**, con la proyección cacheada al lado |
| POST | `/recharge` | platform_admin | `{ institutionId, amount }` — recarga institucional manual |
| POST | `/subjects` | institution_admin | `{ name, code, termNumber?, credits?, isGeneral?, unitId? }` |
| PUT | `/subjects/:id` | institution_admin | Actualiza una materia |
| DELETE | `/subjects/:id` | institution_admin | Elimina una materia |
| POST | `/units` | institution_admin | `{ name, code, kind? }` — `kind` toma por defecto el tipo de la institución |
| PUT | `/units/:id` | institution_admin | `{ name, code, kind }` |
| DELETE | `/units/:id` | institution_admin | — |
| POST | `/units/:id/subjects` | institution_admin | `{ subjectId }` |
| DELETE | `/units/:id/subjects/:subjectId` | institution_admin | — |
| GET | `/analytics` | institution_admin, platform_admin | Resumen general, top de tutores, top de materias y sesiones recientes |
| GET | `/students` | institution_admin, platform_admin | `?search&page&limit` |
| GET | `/subsidies` | institution_admin, platform_admin | Historial de subsidios |
| POST | `/create-order` | institution_admin | `{ amount }` — montos permitidos: 100, 250, 500, 1000, 2000 |
| POST | `/capture-order` | institution_admin | `{ orderId }` — acredita el saldo institucional |
| GET | `/units/:id/grade-levels` | institution_admin | Grados de una unidad, ordenados |
| POST | `/units/:id/grade-levels` | institution_admin | `{ name, code, orderIndex? }` |
| PUT | `/grade-levels/:id` | institution_admin | Renombra o reordena un grado |
| DELETE | `/grade-levels/:id` | institution_admin | Se rechaza si hay estudiantes asignados |
| GET | `/templates` | institution_admin | Plantillas de estructura académica, marcando la que corresponde al tipo |
| POST | `/templates/:code/apply` | institution_admin | Crea las unidades y grados de una plantilla. Es idempotente |
| GET | `/domains` | institution_admin | Dominios de la institución — nunca el token de verificación |
| POST | `/domains` | institution_admin | `{ domain }` |
| POST | `/domains/:id/verification` | institution_admin | `{ method: dns \| email }` — devuelve el registro TXT, o envía correo a `postmaster@` |
| POST | `/domains/:id/verify` | institution_admin | `{ method, token? }` |
| POST | `/domains/:id/primary` | institution_admin | Exige un dominio verificado |
| DELETE | `/domains/:id` | institution_admin | Se rechaza sobre el dominio principal |
| GET | `/invitations` | institution_admin | `?status&page&limit` — nunca el token |
| POST | `/invitations` | institution_admin | `{ email, role, name? }` |
| POST | `/invitations/:id/resend` | institution_admin | Rota el token e invalida el anterior |
| DELETE | `/invitations/:id` | institution_admin | Revoca una invitación pendiente |
| POST | `/imports/students` | institution_admin | Cuerpo `text/csv`, `?dryRun` — columnas `name,email,unitCode?,gradeCode?,program?,termNumber?` |
| POST | `/imports/subjects` | institution_admin | Cuerpo `text/csv`, `?dryRun` — columnas `code,name,unitCode?,termNumber?,credits?,isGeneral?` |
| GET | `/subscription` | institution_admin | Ocupación del plan: estudiantes, máximo y cupos libres |
| POST | `/subscription` | platform_admin | `{ institutionId?, planCode, status?, renewsAt? }` |
| DELETE | `/subscription` | platform_admin | Cancela la suscripción |
| GET | `/admin/plans` | platform_admin | Catálogo de planes, incluidos los inactivos |
| POST | `/admin/plans` | platform_admin | `{ code, name, maxStudents?, priceMonthly?, currencyCode? }` |
| PUT | `/admin/plans/:id` | platform_admin | Actualiza un plan |
| DELETE | `/admin/plans/:id` | platform_admin | Se rechaza si hay instituciones suscritas |
| GET | `/exchange-rates` | platform_admin | `?fromCurrency&toCurrency&limit` |
| POST | `/exchange-rates` | platform_admin | `{ fromCurrency, toCurrency, rate, source?, validFrom? }` |
| GET | `/audit-logs` | institution_admin, platform_admin | `?entity&page&limit` — acotado a la institución de quien llama |

Los recursos de otra institución responden `404`, no `403`: confirmar que un id existe ya es una fuga.

### Público — `/public`

Sin autenticación. Son los endpoints que el registro y el alta necesitan antes de que exista una cuenta.

| Método | Endpoint | Cuerpo / Query |
|---|---|---|
| GET | `/institutions` | Instituciones activas para el selector del registro — sin balance ni configuración |
| GET | `/institutions/resolve` | `?email` o `?domain` — resuelve la institución de un dominio **verificado**, principal o secundario |
| POST | `/institutions/apply` | `{ name, domain, type, currencyCode?, contactName, contactEmail }` — crea una solicitud `pending` |

### Invitaciones — `/auth`

| Método | Endpoint | Acceso | Cuerpo / Query |
|---|---|---|---|
| GET | `/invitations/:token` | público | Describe una invitación pendiente: correo, rol e institución |
| POST | `/invitations/accept` | público | `{ token, name, password }` — crea o activa la cuenta y devuelve una sesión |

### Deprecado — `/universities`

Cada ruta antigua responde con `Deprecation: true`, una fecha `Sunset` y un `Link` a su sucesor, y cada llamada queda registrada. Lo que conservó su forma se reenvía a `/institutions`; `/faculties*` y `/list` cambiaron de forma y responden `410 Gone` con el sucesor en el cuerpo.

### Health

| Método | Endpoint | Acceso |
|---|---|---|
| GET | `/health` | público |

## Dinero y contabilidad

Todo movimiento de dinero pasa por una única función, `postEntry()`, que se niega a persistir un asiento que no cuadre, que mezcle monedas o cuyos montos no sean positivos. No hay otra forma de mover dinero en el código.

- **Los montos son `Decimal(14,2)`**, nunca floats, y cada uno lleva su moneda.
- **La API sigue devolviendo números, no cadenas.** Un serializador en `apiResponse` convierte los `Decimal` a la salida, así que el contrato con el cliente no cambia.
- **`Wallet.balance`, `Wallet.frozen` e `Institution.balance` son proyecciones cacheadas** del ledger. `reconcile()` las recalcula desde los asientos y reporta cualquier desviación; la suite comprueba que es cero tras miles de operaciones aleatorias.
- **Los saldos no pueden quedar en negativo**: lo impone un `CHECK` en la base de datos, no solo el código.
- **La tasa de comisión se congela en la sesión al reservar**, así que cambiar `PLATFORM_COMMISSION_RATE` nunca reescribe sesiones ya reservadas.

| Operación | Débito | Crédito |
|---|---|---|
| Recarga | `external_payments` | `wallet(usuario)` |
| Reserva | `wallet(estudiante)` | `escrow(estudiante)` |
| Liquidación | `escrow(estudiante)` | `wallet(tutor)` + comisión de plataforma |
| Reembolso | `escrow(estudiante)` | `wallet(estudiante)` |
| Subsidio | `institution_funds` | `wallet(estudiante)` |
| Retiro | `wallet(tutor)` | `external_payouts` |

## Reglas de negocio

### Validaciones al reservar

Cuando un estudiante reserva una sesión, la API valida en este orden:

1. Que el tutor exista y tenga disponibilidad ese día de la semana (1 = lunes … 7 = domingo).
2. Que el rango horario solicitado quepa **completo** dentro de un bloque de disponibilidad.
3. Que la fecha y hora sean futuras, evaluadas en `America/Tegucigalpa`.
4. Que el tutor no tenga otra sesión `pending` o `confirmed` que se traslape.
5. Que el estudiante no tenga otra sesión `pending` o `confirmed` que se traslape.
6. Que el saldo de la wallet del estudiante cubra el precio (la `hourlyRate` del tutor).

Si todo pasa, una sola transacción crea la sesión (`pending`), mueve el precio de `balance` a `frozen` y registra una transacción `frozen`. La sala de Jitsi (`https://meet.jit.si/macaw-<timestamp>-<aleatorio>`) se genera al momento de reservar.

### Flujo de pagos

```
1. El estudiante recarga su wallet con PayPal (5 / 10 / 20 / 50 / 100 USD)
2. Reserva una sesión       → los créditos se congelan (escrow)
3. El tutor confirma e imparte la tutoría
4. El tutor la marca como impartida → estado pending_confirmation
5. El estudiante confirma
   → 90% va al balance y al lifetimeEarned del tutor
   → 10% va a la wallet de la plataforma como comisión
   → se incrementa el contador totalSessions del tutor
6. El tutor solicita un retiro → un admin lo aprueba y paga por PayPal
```

Si el estudiante no hace nada, el paso 5 ocurre automáticamente 24 horas después (ver [Jobs programados](#jobs-programados)).

### Ciclo de vida de la sesión

```
              tutor confirma        tutor marca impartida       estudiante confirma
   pending ────────────────► confirmed ─────────────────► pending_confirmation ──────────────► completed
      │                          │                                │                              ▲
      │ cancelar                 │ cancelar                       │ reportar                     │
      ▼                          ▼                                ▼          el admin resuelve   │
  cancelled                 cancelled                         disputed ────────────────────────┘
 (reembolso total)        (aplica política)                             (a favor del tutor)
                                                                   └──► cancelled (a favor del estudiante)
```

### Política de cancelación

```
Cancelación con más de 24hrs        → reembolso del 100% al estudiante
Cancelación con menos de 24hrs      → reembolso del 50% al estudiante
(sesión ya confirmada)              → 50% al tutor como compensación
```

Las sesiones ya `completed`, `cancelled` o `disputed` no se pueden cancelar. Pueden cancelar ambos participantes y también el admin.

### Disputas

El estudiante solo puede reportar una sesión mientras está en `pending_confirmation`, opcionalmente con una razón (se guarda en `notes`). Se notifica a todos los admins. Un admin la resuelve con `favorOf`:

- `student` → la sesión queda `cancelled` y se reembolsa el precio completo.
- `tutor` → la sesión queda `completed`, el tutor recibe el 90% y se incrementa `totalSessions`.

### Retiros

Solicitar un retiro mueve el monto de `balance` a `frozen` de inmediato, para que no pueda gastarse dos veces. La aprobación descuenta el monto congelado y registra una transacción `withdrawal`; el rechazo devuelve el monto al `balance` como `refund` y guarda las notas del admin. Un tutor solo puede tener una solicitud `pending` a la vez.

### Subsidios

Las universidades recargan un saldo institucional (con PayPal o mediante una recarga del admin) y otorgan créditos a sus estudiantes. El subsidio se rechaza si el saldo institucional es insuficiente; si no, debita a la universidad, acredita la wallet del estudiante y registra tanto una transacción `subsidy` como un registro en `Subsidy`.

### Reseñas

Solo el estudiante que tomó una sesión `completed` puede reseñarla, una única vez, con una calificación de 1 a 5. Crear o eliminar una reseña recalcula el `averageRating` del tutor dentro de la misma transacción.

## Jobs programados

Los jobs corren en un **proceso aparte** (`npm run worker`), no dentro de la API. Con dos instancias de la API, ambas dispararían el mismo cron y liberarían el mismo pago dos veces.

Cada job toma un `pg_advisory_lock` antes de ejecutarse, así que solo una instancia del worker lo corre. Pero la garantía de verdad contra el doble pago no es el lock, sino la clave de idempotencia del ledger, que hace imposible liquidar dos veces una sesión a nivel de base de datos.

| Job | Frecuencia | Qué hace |
|---|---|---|
| `sessionReminders` | `0 8 * * *` (diario 08:00) | Encola un recordatorio para ambos participantes de cada sesión `confirmed` del día siguiente. Es idempotente: ejecutarlo dos veces no envía dos correos |
| `autoConfirm` | `0 * * * *` (cada hora) | Busca sesiones en `pending_confirmation` sin cambios por 24hrs, las completa y libera el escrow. Una sesión ya liquidada se omite, no se vuelve a pagar |
| `outboxDispatcher` | `* * * * *` (cada minuto) | Entrega los eventos pendientes del outbox con reintentos exponenciales (30s, 2m, 10m, 1h) antes de rendirse |
| `reconcileSubscriptions` | `30 3 * * *` (diario 03:30) | Recuenta los estudiantes activos de cada institución y corrige la deriva del contador cacheado |

## Notificaciones

Hay dos canales de notificación:

**Webhook de Make.com** — los eventos del ciclo de vida de la sesión se envían por POST a `MAKE_WEBHOOK_URL` con un campo `eventType` y los datos correspondientes. Los fallos se registran en consola y nunca rompen la petición. Eventos: `session_booked`, `session_confirmed`, `session_cancelled`, `session_pending_confirmation`, `session_completed`, `session_disputed`, `dispute_resolved`.

**Nodemailer (SMTP de Gmail)** — se usa directamente para los correos de retiros (`withdrawalRequested`, `withdrawalApproved`, `withdrawalRejected`) y para los recordatorios diarios de sesión, renderizados con las plantillas HTML de `src/utils/emailTemplates.js`.

## Funcionalidades de IA

Ambos endpoints usan OpenAI `gpt-4o-mini`:

- **Recomendación de tutores** — arma un prompt con la carrera, trimestre, GPA y las últimas 10 materias completadas del estudiante, más hasta 20 tutores activos, y pide los 3 mejores con una razón breve. La respuesta JSON se parsea y se enriquece con los registros reales de los tutores.
- **Resumen de reseñas** — resume las últimas 20 reseñas de un tutor en máximo tres oraciones, destacando fortalezas y áreas de mejora. Devuelve un mensaje amable cuando aún no hay reseñas o comentarios.

## Tiempo real

Socket.io volvió, y esta vez sí emite. Se había retirado en el sprint de hardening porque se inicializaba, no disparaba un solo evento y entraba a una sala sin autenticar.

**La conexión se autentica antes de entrar a ninguna sala.** El cliente manda su JWT en el handshake, el servidor lo verifica y lo mete en una única sala, `user:<id>`. En ningún punto se acepta un nombre de sala enviado por el cliente, así que nadie puede escuchar los eventos de otra persona.

**El socket es un extra, no el mecanismo.** Una notificación que solo vive en un socket se pierde para quien no estaba conectado, y el worker —que es otro proceso— no puede emitir al servidor de sockets de la API sin un adaptador de Redis. Por eso la fila de `Notification` se escribe primero, dentro de la misma transacción que el cambio que la provocó, y el `emit` va encima como mejor esfuerzo. Si el socket está caído, la campana se pone al día en la siguiente consulta o al volver a la pestaña.

Con más de una instancia de la API hace falta `@socket.io/redis-adapter`; si no, la entrega en vivo solo alcanza a quien esté conectado a la instancia que emitió (BL-68).

## Rutas del frontend

| Ruta | Acceso |
|---|---|
| `/` | público — landing |
| `/login`, `/register` | público — redirigen al dashboard del rol si ya hay sesión |
| `/dashboard` | autenticado — redirige al dashboard según el rol |
| `/student/dashboard`, `/tutors`, `/tutors/:id`, `/tutors/:id/book`, `/student/sessions`, `/student/wallet` | student |
| `/tutor/dashboard`, `/tutor/sessions`, `/tutor/wallet`, `/tutor/profile` | tutor |
| `/university/dashboard`, `/university/faculties`, `/university/subjects` | institution_admin |
| `/university/students`, `/university/subsidies` | institution_admin, platform_admin |
| `/admin/dashboard`, `/admin/users`, `/admin/sessions`, `/admin/withdrawals`, `/admin/universities` | platform_admin |
| `*` | página 404 |

Las rutas de página conservan los prefijos `/university` y `/admin/universities`; renombrarlas a `/institution` corresponde al sprint de frontend.

El token de sesión lo persiste Zustand en `localStorage` bajo la llave `macaw-auth`. El interceptor de axios lo agrega a cada petición y, ante cualquier `401` que no sea un intento de login, limpia la sesión y redirige a `/login`.

## Despliegue

**Frontend** — el `vercel.json` incluido reescribe todas las rutas a `/index.html` para que el ruteo del lado del cliente funcione en Vercel. Compila con `npm run build` y define `VITE_API_URL` y `VITE_PAYPAL_CLIENT_ID` en el proveedor de hosting.

**Backend** — usa `npm run start:prod`, que ejecuta `prisma migrate deploy` antes de arrancar el servidor, y levanta `npm run worker` como segundo proceso para los crons y el outbox. Define todas las variables del backend en el entorno, apunta `CLIENT_URL` al frontend desplegado (la lista blanca de CORS depende de eso) y cambia `PAYPAL_MODE` fuera de `sandbox` solo cuando estés listo para recibir pagos reales.

**Base de datos** — funciona cualquier PostgreSQL administrado; solo hay que cambiar `DATABASE_URL`. Corre el seed una vez si quieres el set de datos demo.

## Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| `Can't reach database server` | El contenedor no está corriendo (`docker-compose up -d`) o `DATABASE_URL` usa el puerto 5432 en lugar de **5433** |
| Errores de CORS en el navegador | `CLIENT_URL` no coincide exactamente con el origen del frontend |
| `Platform wallet not found` | No se corrió el seed — la cuenta `platform@macaw.app` es necesaria para cobrar las comisiones |
| 401 en todas las peticiones justo después de iniciar sesión | `JWT_SECRET` cambió después de emitir el token, o la cuenta fue desactivada |
| Errores `PayPal: ...` | Credenciales de sandbox incorrectas, o `PAYPAL_MODE` no corresponde a las credenciales que estás usando |
| La IA devuelve "respuesta inválida" | El modelo no respondió con JSON válido — reintenta; revisa también `OPENAI_API_KEY` y tu cuota |
| Los correos nunca llegan | Gmail requiere una **contraseña de aplicación** en `MAIL_PASS`; los fallos solo se registran, no rompen la petición |
| Los horarios se ven corridos | Toda la lógica de fechas asume `America/Tegucigalpa` (`src/utils/dateTime.js`) |

## Limitaciones conocidas

- El rate limiter está configurado (100 peticiones / 15 min) pero la línea `app.use("/api", limiter)` está comentada en `src/app.js`.
- La comisión del 10% está escrita directamente en la lógica de sesiones y jobs, aunque `University.commissionRate` existe en el esquema.
- El transporte de correo fija el SMTP de Gmail; `MAIL_HOST` y `MAIL_PORT` no se leen.
- La entrega en vivo solo llega a la instancia de la API que emitió; escalar en horizontal necesita un adaptador de Redis.
- No hay suite de pruebas automatizadas — `npm test` en el backend sigue siendo el placeholder por defecto.
