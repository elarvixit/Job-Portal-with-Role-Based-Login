-- ════════════════════════════════════════════════════════════════════════════
--  Hireloom — Job Portal with Role-Based Login · Supabase schema
--
--  HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole
--  file → Run. Safe to run any number of times: it creates what is missing and
--  upgrades a database made with an earlier version of this file, keeping all data.
--
--  NAMING: every table starts with  Bhargavi_Job Portal with role-based login_
--    …_users                accounts (role = candidate | recruiter)
--    …_jobs                 jobs posted by recruiters (skills, deadline)
--    …_candidate_profiles   phone, skills, experience and resume of each candidate
--    …_applications         a candidate applying to a job (status, applied_on)
--    …_status_history       every status change, with who made it and when
--    …_notifications        email-style messages sent when something changes
--  The names contain spaces, so ALWAYS wrap them in double quotes in SQL.
--  Resumes are stored in the private Storage bucket  bhargavi-job-portal-resumes.
--  Table and bucket names must match lib/tables.ts in the app.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── Users ──────────────────────────────────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_users" (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,                 -- scrypt "salt:hash", never plain text
  role          text not null check (role in ('candidate', 'recruiter')),
  created_at    timestamptz not null default now()
);


-- ─── Jobs ───────────────────────────────────────────────────────────────────
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
  skills       text[] not null default '{}',   -- required skills (tags)
  deadline     date,                            -- last day to apply (inclusive)
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- Upgrade from an earlier version
alter table public."Bhargavi_Job Portal with role-based login_jobs" add column if not exists skills text[] not null default '{}';
alter table public."Bhargavi_Job Portal with role-based login_jobs" add column if not exists deadline date;

create index if not exists bhargavi_jp_jobs_recruiter_idx
  on public."Bhargavi_Job Portal with role-based login_jobs" (recruiter_id);
create index if not exists bhargavi_jp_jobs_status_created_idx
  on public."Bhargavi_Job Portal with role-based login_jobs" (status, created_at desc);


-- ─── Candidate profiles ─────────────────────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_candidate_profiles" (
  user_id          text primary key
                   references public."Bhargavi_Job Portal with role-based login_users" (id) on delete cascade,
  phone            text not null default '',
  skills           text[] not null default '{}',
  years_experience integer not null default 0 check (years_experience between 0 and 60),
  resume_path      text,                        -- PDF in the bhargavi-job-portal-resumes bucket
  resume_name      text,
  resume_size      integer check (resume_size is null or resume_size <= 2097152),  -- 2 MB
  updated_at       timestamptz not null default now()
);


-- ─── Applications ───────────────────────────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_applications" (
  id           text primary key,
  job_id       text not null
               references public."Bhargavi_Job Portal with role-based login_jobs" (id) on delete cascade,
  candidate_id text not null
               references public."Bhargavi_Job Portal with role-based login_users" (id) on delete cascade,
  cover_note   text not null,
  resume_path  text not null,                  -- copy of the profile resume taken at apply time
  resume_name  text not null,
  status       text not null default 'applied',
  applied_on   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)                -- a candidate can apply to a job only once
);

-- Upgrade from an earlier version: created_at → applied_on, and the new status names.
do $$
declare
  t constant regclass := 'public."Bhargavi_Job Portal with role-based login_applications"'::regclass;
  c record;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'Bhargavi_Job Portal with role-based login_applications'
               and column_name = 'created_at') then
    alter table public."Bhargavi_Job Portal with role-based login_applications" rename column created_at to applied_on;
  end if;

  -- Drop any older status check (its generated name is long and truncated), then map old values.
  for c in select conname from pg_constraint
           where conrelid = t and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
             and conname <> 'bhargavi_jp_applications_status_check' loop
    execute format('alter table %s drop constraint %I', t, c.conname);
  end loop;
  update public."Bhargavi_Job Portal with role-based login_applications" set status = 'shortlisted' where status = 'reviewing';
  update public."Bhargavi_Job Portal with role-based login_applications" set status = 'offered'     where status = 'hired';

  if not exists (select 1 from pg_constraint where conrelid = t and conname = 'bhargavi_jp_applications_status_check') then
    alter table public."Bhargavi_Job Portal with role-based login_applications"
      add constraint bhargavi_jp_applications_status_check
      check (status in ('applied', 'shortlisted', 'interview', 'offered', 'rejected'));
  end if;
end $$;

create index if not exists bhargavi_jp_applications_candidate_idx
  on public."Bhargavi_Job Portal with role-based login_applications" (candidate_id);
create index if not exists bhargavi_jp_applications_job_idx
  on public."Bhargavi_Job Portal with role-based login_applications" (job_id);


-- ─── Status history (every change, with a timestamp) ────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_status_history" (
  id             text primary key,
  application_id text not null
                 references public."Bhargavi_Job Portal with role-based login_applications" (id) on delete cascade,
  from_status    text,                          -- null for the first entry (the application itself)
  to_status      text not null check (to_status in ('applied', 'shortlisted', 'interview', 'offered', 'rejected')),
  changed_by     text references public."Bhargavi_Job Portal with role-based login_users" (id) on delete set null,
  changed_at     timestamptz not null default now()
);
create index if not exists bhargavi_jp_status_history_app_idx
  on public."Bhargavi_Job Portal with role-based login_status_history" (application_id, changed_at);

-- Give applications from an earlier version a starting history entry.
insert into public."Bhargavi_Job Portal with role-based login_status_history" (id, application_id, from_status, to_status, changed_by, changed_at)
select 'hist_' || a.id || '_0', a.id, null, 'applied', a.candidate_id, a.applied_on
from public."Bhargavi_Job Portal with role-based login_applications" a
where not exists (select 1 from public."Bhargavi_Job Portal with role-based login_status_history" h where h.application_id = a.id);

insert into public."Bhargavi_Job Portal with role-based login_status_history" (id, application_id, from_status, to_status, changed_by, changed_at)
select 'hist_' || a.id || '_1', a.id, 'applied', a.status, j.recruiter_id, a.updated_at
from public."Bhargavi_Job Portal with role-based login_applications" a
join public."Bhargavi_Job Portal with role-based login_jobs" j on j.id = a.job_id
where a.status <> 'applied'
  and not exists (select 1 from public."Bhargavi_Job Portal with role-based login_status_history" h
                  where h.application_id = a.id and h.to_status = a.status);


-- ─── Notifications (email-style log) ────────────────────────────────────────
create table if not exists public."Bhargavi_Job Portal with role-based login_notifications" (
  id             text primary key,
  user_id        text not null                  -- who receives it
                 references public."Bhargavi_Job Portal with role-based login_users" (id) on delete cascade,
  to_email       text not null,
  subject        text not null,
  body           text not null,
  application_id text
                 references public."Bhargavi_Job Portal with role-based login_applications" (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index if not exists bhargavi_jp_notifications_user_idx
  on public."Bhargavi_Job Portal with role-based login_notifications" (user_id, created_at desc);


-- ─── Security ───────────────────────────────────────────────────────────────
-- Row Level Security ON with no policies: the public anon key can read or write
-- nothing. Only the app's server, using the service_role key, can access data,
-- and it checks the user's role and ownership on every request.
alter table public."Bhargavi_Job Portal with role-based login_users"              enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_jobs"               enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_candidate_profiles" enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_applications"       enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_status_history"     enable row level security;
alter table public."Bhargavi_Job Portal with role-based login_notifications"      enable row level security;

grant select, insert, update, delete on table
  public."Bhargavi_Job Portal with role-based login_users",
  public."Bhargavi_Job Portal with role-based login_jobs",
  public."Bhargavi_Job Portal with role-based login_candidate_profiles",
  public."Bhargavi_Job Portal with role-based login_applications",
  public."Bhargavi_Job Portal with role-based login_status_history",
  public."Bhargavi_Job Portal with role-based login_notifications"
to service_role;


-- ─── Resume storage ─────────────────────────────────────────────────────────
-- Private bucket: PDF only, 2 MB max (enforced by Supabase Storage as well as the app).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bhargavi-job-portal-resumes', 'bhargavi-job-portal-resumes', false, 2097152, array['application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- Make the changes visible to the Supabase API immediately.
notify pgrst, 'reload schema';
