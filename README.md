# Hireloom — Job Portal with Role-Based Login

A modern job portal built with **Next.js 15 (App Router)**, **React 19**, **TypeScript** and **Supabase**, with two roles:

- **Candidate** — browse & search jobs, view details, apply with a PDF resume, track applications.
- **Recruiter** — post, edit, close/reopen jobs, review applicants, open resumes, change application status.

All data (users, jobs, applications) is stored in **Supabase Postgres**, and resumes in a private **Supabase Storage** bucket.

## Quick start (local mode, no setup)

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase variables set, the app runs in **local mode**: data is saved in
`data/db.json` and resumes in `data/uploads/` on your computer, and demo data is created automatically. Delete the
`data/` folder to start over. Local mode is for trying the app on your own machine — it does not work on Vercel.

Once the Supabase variables below are set, the app uses Supabase automatically (restart `npm run dev`).

## Supabase setup

### 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   It creates these tables and a private resume bucket (PDF only, 5 MB max):

   | Object  | Name |
   | ------- | ---- |
   | Table   | `Bhargavi_Job Portal with role-based login_users` |
   | Table   | `Bhargavi_Job Portal with role-based login_jobs` |
   | Table   | `Bhargavi_Job Portal with role-based login_applications` |
   | Bucket  | `bhargavi-job-portal-resumes` |

   The names contain spaces, so wrap them in double quotes in SQL:
   `select * from "Bhargavi_Job Portal with role-based login_jobs";`. They are defined once in
   [`lib/tables.ts`](lib/tables.ts) and must match the SQL.
3. *(Optional)* Run [`supabase/seed.sql`](supabase/seed.sql) the same way to add demo users and jobs.
4. Open **Project Settings → API Keys** and copy the project URL, the public (anon / publishable) key and the
   secret (service_role / secret) key.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable                         | Where it's used | Value |
| -------------------------------- | --------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL`       | server + browser | Project URL, e.g. `https://abcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | browser (resume upload only) | anon / publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also accepted) |
| `SUPABASE_SERVICE_ROLE_KEY`      | server only | service_role / secret key — **never share or commit** (`SUPABASE_SECRET_KEY` also accepted) |
| `SESSION_SECRET` *(optional)*    | server only | long random string that signs login cookies; if unset, it is derived from the secret key |

On Vercel, the setup page lists any setting that is missing or looks wrong (for example the anon and secret keys
swapped) and the Supabase-related variable names the deployment can see — names only, never values.

### 3. Run it

```bash
npm install
npm run db:seed
npm run dev
```

Open http://localhost:3000. `npm run db:seed` loads the full demo data (including sample applications with
resumes) if the database is empty; `npm run db:reset` **deletes everything** and re-seeds. After editing
`lib/seed.ts`, run `npm run db:seed-sql` to regenerate `supabase/seed.sql`.

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
2. Add the four environment variables above under **Settings → Environment Variables** (all environments).
3. Redeploy. `NEXT_PUBLIC_*` values are built into the site, so changing them always needs a redeploy.
   Every push to `main` redeploys automatically.

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
  2. The browser uploads the file to the private `bhargavi-job-portal-resumes` bucket (the bucket itself enforces PDF + 5 MB).
  3. `POST /api/applications` downloads and verifies the file (size and `%PDF-` signature), then saves the application.

  `GET /api/resumes/[id]` lets only the applicant or the job's recruiter open a resume, via a 60-second signed link.
