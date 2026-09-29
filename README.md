# Hireloom — Job Portal with Role-Based Login

A modern job portal built with **Next.js 15 (App Router)**, **React 19**, **TypeScript** and **Supabase**, with two roles:

- **Candidate** — browse & search jobs, view details, apply with a PDF resume, track applications.
- **Recruiter** — post, edit, close/reopen jobs, review applicants, open resumes, change application status.

All data (users, jobs, applications) is stored in **Supabase Postgres**, and resumes in a private **Supabase Storage** bucket.

## Setup

### 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the `users`, `jobs` and `applications` tables and the private `resumes` bucket (PDF only, 5 MB max).
3. Open **Project Settings → API Keys** and copy the project URL, the public (anon / publishable) key and the
   secret (service_role / secret) key.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                         | Where it's used | Value |
| -------------------------------- | --------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL`       | server + browser | Project URL, e.g. `https://abcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | browser (resume upload only) | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY`      | server only | service_role / secret key — **never share or commit** |
| `SESSION_SECRET`                 | server only | long random string that signs login cookies |

### 3. Run it

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000. `npm run db:seed` loads the demo data if the database is empty;
`npm run db:reset` **deletes everything** and re-seeds.

### Demo accounts

All demo accounts use the password `password123`.

| Role      | Email                  |
| --------- | ---------------------- |
| Candidate | `priya@example.test`   |
| Candidate | `daniel@example.test`  |
| Recruiter | `maya@northwind.test`  |
| Recruiter | `arjun@lumen.test`     |

## Deploying to Vercel

1. Import this GitHub repo at [vercel.com/new](https://vercel.com/new) (framework: Next.js, no build settings needed).
2. Add the four environment variables above under **Settings → Environment Variables**.
3. Deploy. Every push to `main` redeploys automatically.

## Routes

| Route                                  | Access     |
| -------------------------------------- | ---------- |
| `/`                                    | Everyone — hero search, type/location filters, job grid |
| `/login`, `/signup`                    | Logged out (logged-in users are redirected to their dashboard) |
| `/jobs/[id]`                           | Everyone — apply form (candidate), "Recruiters cannot apply", or "Log in to apply" |
| `/candidate`, `/candidate/applications`| Candidates |
| `/recruiter`, `/recruiter/jobs`        | Recruiters |
| `/recruiter/jobs/new`, `/recruiter/jobs/[id]/edit` | Recruiters (own jobs only) |
| `/recruiter/jobs/[id]/applications`    | Recruiters (own jobs only) |
| `/403`, 404                            | Error pages |

## How it works

- **Auth** — the app runs its own auth: passwords hashed with `scrypt` and stored in `users`; sessions are
  HMAC-SHA256 signed, httpOnly cookies (`lib/session.ts`).
- **Role guard** — `middleware.ts` protects `/candidate/*` and `/recruiter/*`. Logged-out visitors go to `/login`;
  a user who opens the other role's pages is redirected to their own dashboard. Pages re-check the role server-side,
  and recruiters touching another recruiter's job get the `/403` page.
- **Data** — all queries run on the server with the service-role key (`lib/repo.ts`). Row Level Security is enabled
  on every table with no policies, so the public anon key cannot read or write any data.
- **Resumes** — to stay under Vercel's 4.5 MB request limit, the browser uploads the PDF directly to Storage:
  1. `POST /api/applications/upload-url` checks the candidate may apply and returns a one-time signed upload URL.
  2. The browser uploads the file to the private `resumes` bucket (the bucket itself enforces PDF + 5 MB).
  3. `POST /api/applications` downloads and verifies the file (size and `%PDF-` signature), then saves the application.

  `GET /api/resumes/[id]` lets only the applicant or the job's recruiter open a resume, via a 60-second signed link.
