-- ════════════════════════════════════════════════════════════════════════════
--  Hireloom — Job Portal with Role-Based Login · Supabase schema
--
--  HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
--  file → Run. Safe to run more than once (every statement is idempotent).
--
--  NAMING: every table starts with  Bhargavi_Job Portal with role-based login_
--    • "Bhargavi_Job Portal with role-based login_users"
--    • "Bhargavi_Job Portal with role-based login_jobs"
--    • "Bhargavi_Job Portal with role-based login_applications"
--  Because the names contain spaces, capitals and a hyphen, ALWAYS wrap them in
--  double quotes in SQL, e.g.  select * from "Bhargavi_Job Portal with role-based login_jobs";
--
--  Resumes are stored in the private Storage bucket  bhargavi-job-portal-resumes
--  (bucket ids cannot contain spaces).
--
--  The table and bucket names must match lib/tables.ts in the app.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── Users (candidates and recruiters) ──────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_users" (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,                 -- scrypt "salt:hash", never plain text
  role          text not null check (role in ('candidate', 'recruiter')),
  created_at    timestamptz not null default now()
);


-- ─── Jobs (posted by recruiters) ────────────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_jobs" (
  id           text primary key,
  recruiter_id text not null
               references public."Bhargavi_Job Portal with role-based login_users" (id) on delete cascade,
  title        text not null,
  company      text not null,
  description  text not null,
  location     text not null,
  type         text not null check (type in ('Full-time', 'Part-time', 'Contract', 'Internship')),
  salary       text not null,
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists bhargavi_jp_jobs_recruiter_idx
  on public."Bhargavi_Job Portal with role-based login_jobs" (recruiter_id);
create index if not exists bhargavi_jp_jobs_status_created_idx
  on public."Bhargavi_Job Portal with role-based login_jobs" (status, created_at desc);


-- ─── Applications (a candidate applying to a job, with a PDF resume) ────────
create table if not exists public."Bhargavi_Job Portal with role-based login_applications" (
  id           text primary key,
  job_id       text not null
               references public."Bhargavi_Job Portal with role-based login_jobs" (id) on delete cascade,
  candidate_id text not null
               references public."Bhargavi_Job Portal with role-based login_users" (id) on delete cascade,
  cover_note   text not null,
  resume_path  text not null,                  -- path inside the bhargavi-job-portal-resumes bucket
  resume_name  text not null,                  -- original file name shown to the recruiter
  status       text not null default 'applied'
               check (status in ('applied', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)                -- a candidate can apply to a job only once
);

create index if not exists bhargavi_jp_applications_candidate_idx
  on public."Bhargavi_Job Portal with role-based login_applications" (candidate_id);


-- ─── Security ───────────────────────────────────────────────────────────────
-- Row Level Security ON with no policies: the public anon key can read or write
-- nothing. Only the app's server, using the service_role key, can access data.
alter table public."Bhargavi_Job Portal with role-based login_users"        enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_jobs"         enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_applications" enable row level security;

grant select, insert, update, delete on table
  public."Bhargavi_Job Portal with role-based login_users",
  public."Bhargavi_Job Portal with role-based login_jobs",
  public."Bhargavi_Job Portal with role-based login_applications"
to service_role;


-- ─── Resume storage ─────────────────────────────────────────────────────────
-- Private bucket: PDF only, 5 MB max (enforced by Supabase Storage itself).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bhargavi-job-portal-resumes', 'bhargavi-job-portal-resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- Make the new tables visible to the Supabase API immediately.
notify pgrst, 'reload schema';
