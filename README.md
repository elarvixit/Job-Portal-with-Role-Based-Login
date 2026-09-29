# Hireloom — Job Portal with Role-Based Login

A modern job portal built with **Next.js 15 (App Router)**, **React 19** and **TypeScript**, with two roles:

- **Candidate** — browse & search jobs, view details, apply with a PDF resume, track applications.
- **Recruiter** — post, edit, close/reopen jobs, review applicants, open resumes, change application status.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Demo data is seeded automatically on the first request.

### Demo accounts

All demo accounts use the password `password123`.

| Role      | Email                  |
| --------- | ---------------------- |
| Candidate | `priya@example.test`   |
| Candidate | `daniel@example.test`  |
| Recruiter | `maya@northwind.test`  |
| Recruiter | `arjun@lumen.test`     |

Reset all data back to the demo seed with `npm run reset`.

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

- **Auth** — passwords hashed with `scrypt`; sessions are HMAC-SHA256 signed, httpOnly cookies (`lib/session.ts`).
  Set `SESSION_SECRET` in production.
- **Role guard** — `middleware.ts` protects `/candidate/*` and `/recruiter/*`. Logged-out visitors go to `/login`;
  a user who opens the other role's pages is redirected to their own dashboard. Pages re-check the role server-side,
  and recruiters touching another recruiter's job get the `/403` page.
- **Data** — a JSON file at `data/db.json` (`lib/db.ts`) with serialised writes. Swap for a real database in production.
- **Resumes** — uploaded via `POST /api/applications` (PDF only, ≤ 5 MB, validated client- and server-side including
  the `%PDF-` magic bytes), stored privately in `data/uploads/`, and served by `GET /api/resumes/[id]` only to the
  applicant or the recruiter who owns the job.
