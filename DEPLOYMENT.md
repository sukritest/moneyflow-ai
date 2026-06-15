# Deployment Guide — Vercel + Supabase

This guide deploys MoneyFlow AI to Vercel with a Supabase Postgres database
and Supabase Auth (Email + Google + LINE).

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project (or reuse an
   existing one).
2. In **Project Settings → Database**, copy the connection strings:
   - **Connection pooling** URL → use for `DATABASE_URL` (port 6543, `pgbouncer=true`)
   - **Direct connection** URL → use for `DIRECT_URL` (port 5432)
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-only)

## 2. Switch Prisma to PostgreSQL

The schema's models use only `String`, `Float`, `Boolean`, `Int`, and
`DateTime` — all valid on Postgres, so **no field types need to change**.
Only the `datasource` block changes. In `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Then push the schema to Supabase (run locally with the Supabase
`DATABASE_URL`/`DIRECT_URL` set in `.env`):

```bash
npx prisma generate
npx prisma db push
npm run db:seed     # idempotent: seeds system categories + demo data
```

## 3. Configure Supabase Auth providers

- **Email**: enabled by default. Optionally disable "Confirm email" for
  faster demo sign-ups under Authentication → Providers → Email.
- **Google**: Authentication → Providers → Google. Create OAuth credentials in
  Google Cloud Console, set the redirect URL shown by Supabase, and paste the
  Client ID/Secret into Supabase (and `.env` as `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` if needed by app code).
- **LINE**: Supabase has no native LINE provider — add it under
  Authentication → Providers → "Custom/OIDC" (or "Generic OAuth") using the
  LINE Login channel ID/secret from the LINE Developers Console. Set
  `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` accordingly.
- Add your Vercel deployment URL (and `http://localhost:3000` for dev) to
  **Authentication → URL Configuration → Redirect URLs**.

If Supabase env vars are left unset, the app runs in demo mode (no login
required) — useful for a first deploy/preview before wiring up auth.

## 4. Deploy to Vercel

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. In Vercel, **Add New → Project** and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. Add the environment variables below (Project Settings → Environment
   Variables), for Production (and Preview if desired):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase pooled connection string |
   | `DIRECT_URL` | Supabase direct connection string |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `OPENAI_API_KEY` | (optional — leave empty to use mocked AI) |
   | `OPENAI_MODEL` | `gpt-4o-mini` |
   | `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://your-app.vercel.app` |
   | `NEXT_PUBLIC_APP_NAME` | `MoneyFlow AI` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | (optional, for Google login) |
   | `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | (optional, for LINE login) |

5. Because `prisma generate` must run against the committed schema, ensure
   the build command runs it — either add a `postinstall` script
   (`"postinstall": "prisma generate"`) or set the Vercel build command to
   `prisma generate && next build`.
6. Click **Deploy**.

## 5. After the first deploy

- Run `npx prisma db push` (or `prisma migrate deploy` if you switch to
  migrations) and `npm run db:seed` once against the production database —
  either from your local machine with the production `DATABASE_URL`/`DIRECT_URL`
  in `.env`, or via a one-off Vercel deployment/CLI command.
- Visit the deployed URL and confirm the dashboard, transactions, and other
  modules load with seeded demo data.
- If Supabase Auth is configured, create a real account and sign in; the demo
  user (`demo@moneyflow.ai`, role `admin`) remains available for `/admin`
  access in demo mode.

## Notes

- All AI features (Insights, Forecast, Chat, Receipts OCR) work without
  `OPENAI_API_KEY` — they fall back to deterministic mock responses so the
  app is fully functional and demoable out of the box.
- The seed script (`prisma/seed.ts`) is idempotent: it only seeds system
  categories once, and only seeds the demo transaction/budget/goal dataset if
  the demo user has no transactions yet — safe to re-run on redeploys.
