-- Hireloom schema. Run this once in the Supabase dashboard → SQL Editor.
-- Safe to re-run: every statement is idempotent.

create table if not exists public.users (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('candidate', 'recruiter')),
  created_at    timestamptz not null default now()
);

create table if not exists public.jobs (
  id           text primary key,
  recruiter_id text not null references public.users (id) on delete cascade,
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

create index if not exists jobs_recruiter_idx on public.jobs (recruiter_id);
create index if not exists jobs_status_created_idx on public.jobs (status, created_at desc);

create table if not exists public.applications (
  id           text primary key,
  job_id       text not null references public.jobs (id) on delete cascade,
  candidate_id text not null references public.users (id) on delete cascade,
  cover_note   text not null,
  resume_path  text not null,
  resume_name  text not null,
  status       text not null default 'applied'
               check (status in ('applied', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index if not exists applications_candidate_idx on public.applications (candidate_id);

-- Row Level Security on, with no policies: the public (anon) key can read or write nothing.
-- Only the server, using the secret/service-role key, can access these tables.
alter table public.users enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- Private bucket for resumes: PDF only, max 5 MB (enforced by Supabase Storage itself).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
