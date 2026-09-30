'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as repo from '@/lib/repo';
import { hashPassword, verifyPassword } from '@/lib/password';
import { cleanSkills, todayISO } from '@/lib/rules';
import { SESSION_COOKIE, SESSION_MAX_AGE, dashboardFor, signSession } from '@/lib/session';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { APPLICATION_STATUSES, JOB_TYPES, type ApplicationStatus, type Job, type JobType, type Role } from '@/lib/types';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  saved?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function startSession(uid: string, role: Role) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(uid, role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

function safeNext(next: string, role: Role): string {
  // Only allow same-site relative paths that belong to this role (or public pages).
  if (!next.startsWith('/') || next.startsWith('//')) return dashboardFor(role);
  const other = role === 'candidate' ? '/recruiter' : '/candidate';
  if (next.startsWith(other)) return dashboardFor(role);
  return next;
}

/* ───────────────────────────── Auth ───────────────────────────── */

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');
  const values = { email };

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (!password) fieldErrors.password = 'Enter your password.';
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const user = await repo.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: 'Incorrect email or password.', values };
  }

  await startSession(user.id, user.role);
  redirect(next ? safeNext(next, user.role) : dashboardFor(user.role));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '') as Role;
  const values = { name, email, role };

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Please enter your full name.';
  if (!EMAIL_RE.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (password.length < 8) fieldErrors.password = 'Password must be at least 8 characters.';
  if (role !== 'candidate' && role !== 'recruiter') fieldErrors.role = 'Choose how you will use Hireloom.';
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const user = {
    id: repo.newId('usr'),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  if ((await repo.createUser(user)) === 'duplicate') {
    return { fieldErrors: { email: 'An account with this email already exists.' }, values };
  }

  await startSession(user.id, user.role);
  redirect(dashboardFor(user.role));
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/');
}

/* ───────────────────────────── Jobs ───────────────────────────── */

export async function saveJobAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const recruiter = await requireRole('recruiter');
  const id = String(formData.get('id') ?? '');
  const values = {
    title: String(formData.get('title') ?? '').trim(),
    company: String(formData.get('company') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    location: String(formData.get('location') ?? '').trim(),
    type: String(formData.get('type') ?? ''),
    salary: String(formData.get('salary') ?? '').trim(),
    skills: String(formData.get('skills') ?? ''),
    deadline: String(formData.get('deadline') ?? '').trim(),
    status: String(formData.get('status') ?? 'open'),
  };
  const skills = cleanSkills(values.skills);

  const fieldErrors: Record<string, string> = {};
  if (values.title.length < 3) fieldErrors.title = 'Title must be at least 3 characters.';
  if (values.title.length > 100) fieldErrors.title = 'Keep the title under 100 characters.';
  if (values.company.length < 2) fieldErrors.company = 'Enter the company name.';
  if (values.description.length < 30) fieldErrors.description = 'Description should be at least 30 characters.';
  if (values.description.length > 8000) fieldErrors.description = 'Description is too long (max 8,000 characters).';
  if (values.location.length < 2) fieldErrors.location = 'Enter a location, or "Remote".';
  if (!JOB_TYPES.includes(values.type as JobType)) fieldErrors.type = 'Choose a job type.';
  if (!values.salary) fieldErrors.salary = 'Enter a salary or range.';
  if (!skills.length) fieldErrors.skills = 'Add at least one required skill.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline)) fieldErrors.deadline = 'Choose the last day to apply.';
  else if (!id && values.deadline < todayISO()) fieldErrors.deadline = 'The deadline can’t be in the past.';
  if (values.status !== 'open' && values.status !== 'closed') fieldErrors.status = 'Choose a status.';
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const input: repo.JobInput = {
    ...values,
    skills,
    deadline: values.deadline,
    type: values.type as JobType,
    status: values.status as Job['status'],
  };

  if (id) {
    const outcome = await repo.updateJob(id, recruiter.id, input);
    if (outcome === 'forbidden') redirect('/403');
    if (outcome === 'missing') return { error: 'This job no longer exists.', values };
  } else {
    await repo.createJob(recruiter.id, input);
  }

  revalidatePath('/', 'layout');
  redirect(`/recruiter/jobs?saved=${id ? 'updated' : 'created'}`);
}

export async function toggleJobStatusAction(formData: FormData) {
  const recruiter = await requireRole('recruiter');
  const outcome = await repo.toggleJobStatus(String(formData.get('id') ?? ''), recruiter.id);
  if (outcome === 'forbidden') redirect('/403');
  revalidatePath('/', 'layout');
}

/** Permanently deletes one of the recruiter's own jobs, with its applications. */
export async function deleteJobAction(formData: FormData) {
  const recruiter = await requireRole('recruiter');
  const outcome = await repo.deleteJob(String(formData.get('id') ?? ''), recruiter.id);
  if (outcome === 'forbidden') redirect('/403');
  revalidatePath('/', 'layout');
  redirect('/recruiter/jobs?saved=deleted');
}

/* ─────────────────────────── Profile ─────────────────────────── */

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole('candidate');
  const values = {
    name: String(formData.get('name') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    skills: String(formData.get('skills') ?? ''),
    yearsExperience: String(formData.get('yearsExperience') ?? '').trim(),
  };
  const skills = cleanSkills(values.skills);
  const years = Number(values.yearsExperience);

  const fieldErrors: Record<string, string> = {};
  if (values.name.length < 2) fieldErrors.name = 'Please enter your full name.';
  if (!/^\+?[0-9][0-9 ()-]{6,19}$/.test(values.phone)) fieldErrors.phone = 'Enter a phone number, e.g. +91 98765 43210.';
  if (!skills.length) fieldErrors.skills = 'Add at least one skill.';
  if (!values.yearsExperience || !Number.isInteger(years) || years < 0 || years > 60) {
    fieldErrors.yearsExperience = 'Enter whole years between 0 and 60.';
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  await Promise.all([
    repo.saveProfile(user.id, { phone: values.phone, skills, yearsExperience: years }),
    values.name !== user.name ? repo.renameUser(user.id, values.name) : null,
  ]);
  revalidatePath('/', 'layout');
  return { values: { ...values, skills: skills.join(', ') }, saved: true };
}

/* ───────────────────────── Applications ───────────────────────── */

export async function updateApplicationStatusAction(
  applicationId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'recruiter') return { ok: false, error: 'Not authorized.' };
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) return { ok: false, error: 'Invalid status.' };

  // Ownership is checked in the repository: a recruiter can only change applications to their own jobs.
  const outcome = await repo.updateApplicationStatus({
    applicationId,
    recruiterId: user.id,
    status: status as ApplicationStatus,
  });
  if (outcome === 'missing') return { ok: false, error: 'Application not found.' };
  if (outcome === 'forbidden') return { ok: false, error: 'Not authorized.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}
