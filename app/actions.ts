'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as repo from '@/lib/repo';
import { hashPassword, verifyPassword } from '@/lib/password';
import { SESSION_COOKIE, SESSION_MAX_AGE, dashboardFor, signSession } from '@/lib/session';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { APPLICATION_STATUSES, JOB_TYPES, type ApplicationStatus, type Job, type JobType, type Role } from '@/lib/types';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
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
    status: String(formData.get('status') ?? 'open'),
  };

  const fieldErrors: Record<string, string> = {};
  if (values.title.length < 3) fieldErrors.title = 'Title must be at least 3 characters.';
  if (values.title.length > 100) fieldErrors.title = 'Keep the title under 100 characters.';
  if (values.company.length < 2) fieldErrors.company = 'Enter the company name.';
  if (values.description.length < 30) fieldErrors.description = 'Description should be at least 30 characters.';
  if (values.description.length > 8000) fieldErrors.description = 'Description is too long (max 8,000 characters).';
  if (values.location.length < 2) fieldErrors.location = 'Enter a location, or "Remote".';
  if (!JOB_TYPES.includes(values.type as JobType)) fieldErrors.type = 'Choose a job type.';
  if (!values.salary) fieldErrors.salary = 'Enter a salary or range.';
  if (values.status !== 'open' && values.status !== 'closed') fieldErrors.status = 'Choose a status.';
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const input: repo.JobInput = { ...values, type: values.type as JobType, status: values.status as Job['status'] };

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

/* ───────────────────────── Applications ───────────────────────── */

export async function updateApplicationStatusAction(
  applicationId: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'recruiter') return { ok: false, error: 'Not authorized.' };
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) return { ok: false, error: 'Invalid status.' };

  const outcome = await repo.updateApplicationStatus(applicationId, user.id, status as ApplicationStatus);
  if (outcome !== 'ok') return { ok: false, error: outcome === 'missing' ? 'Application not found.' : 'Not authorized.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}
