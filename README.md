# Hireloom — Job Portal with Role-Based Login

A modern job portal built with **Next.js 15 (App Router)**, **React 19**, **TypeScript** and **Supabase**, with two roles:

- **Candidate** — completes a profile (phone, skills, experience, PDF resume), searches and filters jobs, applies once
  per job before the deadline, and follows every status change.
- **Recruiter** — posts jobs (skills, deadline), edits / closes / deletes their own jobs, reviews applicants with a
  skill-match score, opens resumes and moves candidates through Applied → Shortlisted → Interview → Offered / Rejected.

All data is stored in **Supabase Postgres**, and resumes in a private **Supabase Storage** bucket.

## Requirements checklist

| Requirement | Where it lives |
| --- | --- |
| Sign up / log in as either role; hashed passwords; signed session cookie | `app/actions.ts`, `lib/password.ts` (scrypt), `lib/session.ts` (HMAC-SHA256, httpOnly) |
| Wrong role can't reach the other role's pages (typed URL) | `middleware.ts` redirects; every page calls `requireRole()`; every API checks the role |
| Recruiter posts a job: title, company, location, salary, skills (tags), description, deadline | `/recruiter/jobs/new`, `components/JobForm.tsx`, `saveJobAction` |
| Edit, close or delete **own** jobs only | `updateJob` / `toggleJobStatus` / `deleteJob` check `recruiter_id` → 403 otherwise |
| Candidate profile: name, phone, skills, years of experience, resume (PDF, max 2 MB) | `/candidate/profile`, `POST /api/profile/resume` (size, type and `%PDF-` signature checked on the server; bucket also limited to 2 MB) |
| Browse open jobs, filter by location and skill, search by title | Home page (`app/page.tsx`) |
| Apply once per job; a second apply is refused | `POST /api/applications` → 409, plus a `unique (job_id, candidate_id)` constraint |
| Applications after the deadline are blocked | `applyBlocker()` in `lib/rules.ts`, enforced in `POST /api/applications` |
| Recruiter sees applicants per job, opens the resume, changes status | `/recruiter/jobs/[id]/applications`, `GET /api/resumes/[id]` |
| Statuses Applied → Shortlisted → Interview → Offered / Rejected | `APPLICATION_STATUSES` in `lib/types.ts`; DB check constraint |
| Candidate sees all applications with current status | `/candidate/applications` (with a progress tracker) |
| A recruiter only sees applicants for their own jobs | ownership checked in the page, the status action and the resume route |
| Status changes logged with a timestamp, visible to the recruiter | `…_status_history` table; *History* timeline on the applicants page |
| Closing a job hides it from candidates but keeps its applications | closed jobs leave the job board; applicants and the candidate's own application stay visible |
| Stretch: match score | `matchScore()` — % of the job's skills the candidate has, on the applicants list and job page |
| Stretch: email-style notification log | `…_notifications` table; `/candidate/notifications` and `/recruiter/notifications` |
| Stretch: applications-per-job bar chart | `components/ApplicationsChart.tsx` on the recruiter dashboard |

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
   It creates these tables and a private resume bucket (PDF only, 2 MB max). It is safe to run again, and it upgrades
   a database made with an earlier version without losing data:

   | Object  | Name |
   | ------- | ---- |
   | Table   | `Bhargavi_Job Portal with role-based login_users` |
   | Table   | `Bhargavi_Job Portal with role-based login_jobs` |
   | Table   | `Bhargavi_Job Portal with role-based login_candidate_profiles` |
   | Table   | `Bhargavi_Job Portal with role-based login_applications` |
   | Table   | `Bhargavi_Job Portal with role-based login_status_history` |
   | Table   | `Bhargavi_Job Portal with role-based login_notifications` |
   | Bucket  | `bhargavi-job-portal-resumes` |

   The names contain spaces, so wrap them in double quotes in SQL:
   `select * from "Bhargavi_Job Portal with role-based login_jobs";`. They are defined once in
   [`lib/tables.ts`](lib/tables.ts) and must match the SQL.
3. *(Optional)* Run [`supabase/seed.sql`](supabase/seed.sql) the same way to add the demo data: 8 users, 8 jobs,
   6 candidate profiles, 17 applications with their status history, and notifications.
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
- **Resumes** — the candidate uploads one resume to their profile through `POST /api/profile/resume`, which accepts
  only a PDF of at most 2 MB and checks the `%PDF-` file signature (the Storage bucket also enforces PDF + 2 MB).
  When they apply, the server copies that file for the application, so later profile changes never alter what a
  recruiter received. `GET /api/resumes/[id]` lets only the applicant or the job's recruiter open it, via a
  60-second signed link.
- **Applying** — `POST /api/applications` enforces every rule on the server: candidates only, open job, deadline not
  passed, complete profile, cover note length, and once per job (also a unique constraint in the database). It writes
  the first status-history entry and notifies the recruiter.
- **Status changes** — `updateApplicationStatusAction` checks the recruiter owns the job, then updates the status,
  appends a timestamped `status_history` row and records an email-style notification for the candidate.
