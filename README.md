# MoneyFlow AI

Your AI-powered personal finance co-pilot. Built with Next.js 15, TypeScript,
Tailwind CSS, Shadcn/UI, Prisma, Supabase Auth, and a mocked OpenAI layer that
falls back to deterministic responses when no API key is configured.

## Features

- **Dashboard** — income/expense summary, savings rate, spending trends, financial health score
- **Transactions** — full CRUD, categories, tags, filters, bulk edit
- **Budgets** — overall and per-category budgets with progress tracking and alerts
- **Goals** — savings goals with contribution tracking and a what-if simulator
- **Recurring transactions** — bills, subscriptions, income that repeat on a schedule
- **Calendar** — month view of upcoming bills, loans, subscriptions, reminders
- **Receipts** — upload/scan receipts (AI extraction, mocked without an API key)
- **Insights & Financial Health Score** — AI-generated tips and a 0-100 health score
- **Cashflow Forecast** — baseline/optimistic/pessimistic projections
- **AI Assistant (Chat)** — ask questions about your finances
- **Salary Allocation Planner** — split monthly income across savings/investment/bills/spending
- **Emergency Mode** — survival budget and cash runway estimate
- **Monthly Wrapped** — shareable monthly recap
- **Family** — shared wallets and members
- **Admin** — feature flags and platform stats
- **Settings** — profile, preferences, mocked subscription/billing
- PWA-ready, i18n (English/Thai), dark/light/system theme

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + Shadcn/UI + Recharts
- Prisma ORM (SQLite for local dev, PostgreSQL/Supabase for production)
- Supabase Auth (Email, Google, LINE via generic OAuth)
- OpenAI (optional — mocked when `OPENAI_API_KEY` is empty)

## Getting started (local development)

```bash
npm install
cp .env.example .env        # defaults to SQLite, no external services needed
npx prisma generate
npx prisma db push           # creates dev.db and applies the schema
npm run db:seed              # seeds system categories + a rich demo dataset
npm run dev
```

Open http://localhost:3000. Without any Supabase env vars set, the app runs
in **demo mode** using a built-in demo user (`demo@moneyflow.ai`, role
`admin`), so every module is browsable immediately.

## Scripts

| Script              | Description                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`        | Start the dev server                          |
| `npm run build`      | Production build                              |
| `npm run start`      | Start the production server                   |
| `npm run lint`       | Run ESLint                                    |
| `npm run db:seed`    | Seed system categories + demo data (idempotent) |
| `npx prisma studio`  | Browse the database                           |

## Project structure

```
src/
  app/            # App Router pages (route groups: (auth), (app))
  components/     # UI components, grouped by module
  lib/            # auth, prisma client, utils, validations, i18n, AI mock layer
prisma/
  schema.prisma   # data model (24 models)
  seed.ts         # system categories + demo dataset (idempotent)
```

## Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to deploy
to Vercel with a Supabase Postgres database and Supabase Auth.
