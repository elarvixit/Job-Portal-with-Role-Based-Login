import 'server-only';
import { newId } from './ids';
import type {
  ApplicationWithCandidate,
  ApplicationWithJob,
  JobInput,
  NewApplication,
  OwnedResult,
  ProfileInput,
  ResumeFile,
  ResumeSource,
  StatusTarget,
  StatusUpdateResult,
} from './repo-types';
import { statusEmail } from './rules';
import { demoResume } from './seed';
import { supabaseAdmin } from './supabase';
import { RESUME_BUCKET, TABLES } from './tables';
import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  Job,
  JobStatus,
  JobType,
  Notification,
  PublicUser,
  Role,
  StatusChange,
  User,
} from './types';

// Data access for Supabase. Tables use snake_case; the app uses camelCase.
// Related rows are fetched with a second query rather than PostgREST embedding, because embedding
// references tables by name inside the select string and the prefixed names contain spaces.

/* ───────────────────────── Row mapping ───────────────────────── */

type UserRow = { id: string; name: string; email: string; password_hash: string; role: Role; created_at: string };
type JobRow = {
  id: string;
  recruiter_id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  type: JobType;
  salary: string;
  skills: string[] | null;
  deadline: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
};
type ProfileRow = {
  user_id: string;
  phone: string;
  skills: string[] | null;
  years_experience: number;
  resume_path: string | null;
  resume_name: string | null;
  resume_size: number | null;
  updated_at: string;
};
type ApplicationRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  cover_note: string;
  resume_path: string;
  resume_name: string;
  status: ApplicationStatus;
  applied_on: string;
  updated_at: string;
};
type HistoryRow = {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by: string | null;
  changed_at: string;
};
type NotificationRow = {
  id: string;
  user_id: string;
  to_email: string;
  subject: string;
  body: string;
  application_id: string | null;
  created_at: string;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role,
  createdAt: r.created_at,
});
const toPublicUser = (r: Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'created_at'>): PublicUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  createdAt: r.created_at,
});
const toJob = (r: JobRow): Job => ({
  id: r.id,
  recruiterId: r.recruiter_id,
  title: r.title,
  company: r.company,
  description: r.description,
  location: r.location,
  type: r.type,
  salary: r.salary,
  skills: r.skills ?? [],
  deadline: r.deadline,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toProfile = (r: ProfileRow): CandidateProfile => ({
  userId: r.user_id,
  phone: r.phone,
  skills: r.skills ?? [],
  yearsExperience: r.years_experience,
  resumePath: r.resume_path,
  resumeName: r.resume_name,
  resumeSize: r.resume_size,
  updatedAt: r.updated_at,
});
const toApplication = (r: ApplicationRow): Application => ({
  id: r.id,
  jobId: r.job_id,
  candidateId: r.candidate_id,
  coverNote: r.cover_note,
  resumePath: r.resume_path,
  resumeName: r.resume_name,
  status: r.status,
  createdAt: r.applied_on,
  updatedAt: r.updated_at,
});
const toChange = (r: HistoryRow): StatusChange => ({
  id: r.id,
  applicationId: r.application_id,
  fromStatus: r.from_status,
  toStatus: r.to_status,
  changedBy: r.changed_by,
  changedAt: r.changed_at,
});
const toNotification = (r: NotificationRow): Notification => ({
  id: r.id,
  userId: r.user_id,
  toEmail: r.to_email,
  subject: r.subject,
  body: r.body,
  applicationId: r.application_id,
  createdAt: r.created_at,
});

const PUBLIC_USER_COLS = 'id, name, email, role, created_at';
const UNIQUE_VIOLATION = '23505';
const db = () => supabaseAdmin();

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

/* ───────────────────────────── Users ───────────────────────────── */

export async function getUserById(id: string): Promise<PublicUser | null> {
  const { data, error } = await db().from(TABLES.users).select(PUBLIC_USER_COLS).eq('id', id).maybeSingle();
  if (error) fail('getUserById', error);
  return data ? toPublicUser(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await db().from(TABLES.users).select('*').eq('email', email).maybeSingle<UserRow>();
  if (error) fail('getUserByEmail', error);
  return data ? toUser(data) : null;
}

export async function createUser(user: User): Promise<'ok' | 'duplicate'> {
  const { error } = await db().from(TABLES.users).insert({
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    created_at: user.createdAt,
  });
  if (error?.code === UNIQUE_VIOLATION) return 'duplicate';
  if (error) fail('createUser', error);
  return 'ok';
}

export async function renameUser(id: string, name: string): Promise<void> {
  const { error } = await db().from(TABLES.users).update({ name }).eq('id', id);
  if (error) fail('renameUser', error);
}

async function usersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  if (!ids.length) return new Map();
  const { data, error } = await db()
    .from(TABLES.users)
    .select(PUBLIC_USER_COLS)
    .in('id', [...new Set(ids)])
    .returns<UserRow[]>();
  if (error) fail('usersByIds', error);
  return new Map(data.map((r) => [r.id, toPublicUser(r)]));
}

/* ─────────────────────────── Profiles ─────────────────────────── */

export async function getProfile(userId: string): Promise<CandidateProfile | null> {
  const { data, error } = await db().from(TABLES.candidateProfiles).select('*').eq('user_id', userId).maybeSingle<ProfileRow>();
  if (error) fail('getProfile', error);
  return data ? toProfile(data) : null;
}

async function profilesByIds(ids: string[]): Promise<Map<string, CandidateProfile>> {
  if (!ids.length) return new Map();
  const { data, error } = await db()
    .from(TABLES.candidateProfiles)
    .select('*')
    .in('user_id', [...new Set(ids)])
    .returns<ProfileRow[]>();
  if (error) fail('profilesByIds', error);
  return new Map(data.map((r) => [r.user_id, toProfile(r)]));
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<void> {
  const { error } = await db()
    .from(TABLES.candidateProfiles)
    .upsert(
      { user_id: userId, phone: input.phone, skills: input.skills, years_experience: input.yearsExperience, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) fail('saveProfile', error);
}

/** Points the profile at a newly uploaded resume; returns the previous file's path (to delete). */
export async function setProfileResume(userId: string, file: ResumeFile | null): Promise<string | null> {
  const previous = (await getProfile(userId))?.resumePath ?? null;
  const { error } = await db()
    .from(TABLES.candidateProfiles)
    .upsert(
      { user_id: userId, resume_path: file?.path ?? null, resume_name: file?.name ?? null, resume_size: file?.size ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) fail('setProfileResume', error);
  return previous && previous !== file?.path ? previous : null;
}

/* ───────────────────────────── Jobs ───────────────────────────── */

export async function listOpenJobs(): Promise<Job[]> {
  const { data, error } = await db()
    .from(TABLES.jobs)
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();
  if (error) fail('listOpenJobs', error);
  return data.map(toJob);
}

export async function listJobsByRecruiter(recruiterId: string): Promise<Job[]> {
  const { data, error } = await db()
    .from(TABLES.jobs)
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();
  if (error) fail('listJobsByRecruiter', error);
  return data.map(toJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await db().from(TABLES.jobs).select('*').eq('id', id).maybeSingle<JobRow>();
  if (error) fail('getJob', error);
  return data ? toJob(data) : null;
}

async function jobsByIds(ids: string[]): Promise<Map<string, Job>> {
  if (!ids.length) return new Map();
  const { data, error } = await db()
    .from(TABLES.jobs)
    .select('*')
    .in('id', [...new Set(ids)])
    .returns<JobRow[]>();
  if (error) fail('jobsByIds', error);
  return new Map(data.map((r) => [r.id, toJob(r)]));
}

export async function createJob(recruiterId: string, input: JobInput): Promise<Job> {
  const { data, error } = await db()
    .from(TABLES.jobs)
    .insert({ id: newId('job'), recruiter_id: recruiterId, ...input })
    .select('*')
    .single<JobRow>();
  if (error) fail('createJob', error);
  return toJob(data);
}

async function ownedJob(id: string, recruiterId: string): Promise<Job | OwnedResult> {
  const job = await getJob(id);
  if (!job) return 'missing';
  if (job.recruiterId !== recruiterId) return 'forbidden';
  return job;
}

export async function updateJob(id: string, recruiterId: string, input: JobInput): Promise<OwnedResult> {
  const owned = await ownedJob(id, recruiterId);
  if (typeof owned === 'string') return owned;
  const { error } = await db()
    .from(TABLES.jobs)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recruiter_id', recruiterId);
  if (error) fail('updateJob', error);
  return 'ok';
}

export async function toggleJobStatus(id: string, recruiterId: string): Promise<OwnedResult> {
  const owned = await ownedJob(id, recruiterId);
  if (typeof owned === 'string') return owned;
  const { error } = await db()
    .from(TABLES.jobs)
    .update({ status: owned.status === 'open' ? 'closed' : 'open', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recruiter_id', recruiterId);
  if (error) fail('toggleJobStatus', error);
  return 'ok';
}

/** Deletes a job with its applications, history and notifications (cascade), and their resume copies. */
export async function deleteJob(id: string, recruiterId: string): Promise<OwnedResult> {
  const owned = await ownedJob(id, recruiterId);
  if (typeof owned === 'string') return owned;
  const { data: apps, error: appsError } = await db()
    .from(TABLES.applications)
    .select('resume_path')
    .eq('job_id', id)
    .returns<{ resume_path: string }[]>();
  if (appsError) fail('deleteJob', appsError);
  const { error } = await db().from(TABLES.jobs).delete().eq('id', id).eq('recruiter_id', recruiterId);
  if (error) fail('deleteJob', error);
  await removeResumes(apps.map((a) => a.resume_path));
  return 'ok';
}

/* ───────────────────────── Applications ───────────────────────── */

export async function listApplicationsByCandidate(candidateId: string): Promise<ApplicationWithJob[]> {
  const { data, error } = await db()
    .from(TABLES.applications)
    .select('*')
    .eq('candidate_id', candidateId)
    .order('applied_on', { ascending: false })
    .returns<ApplicationRow[]>();
  if (error) fail('listApplicationsByCandidate', error);
  const jobs = await jobsByIds(data.map((r) => r.job_id));
  return data.flatMap((r) => {
    const job = jobs.get(r.job_id);
    return job ? [{ app: toApplication(r), job }] : [];
  });
}

export async function listApplicationsForJobs(jobIds: string[]): Promise<ApplicationWithCandidate[]> {
  if (!jobIds.length) return [];
  const { data, error } = await db()
    .from(TABLES.applications)
    .select('*')
    .in('job_id', jobIds)
    .order('applied_on', { ascending: false })
    .returns<ApplicationRow[]>();
  if (error) fail('listApplicationsForJobs', error);
  const ids = data.map((r) => r.candidate_id);
  const [users, profiles] = await Promise.all([usersByIds(ids), profilesByIds(ids)]);
  return data.map((r) => ({
    app: toApplication(r),
    candidate: users.get(r.candidate_id) ?? null,
    profile: profiles.get(r.candidate_id) ?? null,
  }));
}

export async function countApplicationsForJob(jobId: string): Promise<number> {
  const { count, error } = await db()
    .from(TABLES.applications)
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);
  if (error) fail('countApplicationsForJob', error);
  return count ?? 0;
}

export async function findApplication(jobId: string, candidateId: string): Promise<Application | null> {
  const { data, error } = await db()
    .from(TABLES.applications)
    .select('*')
    .eq('job_id', jobId)
    .eq('candidate_id', candidateId)
    .maybeSingle<ApplicationRow>();
  if (error) fail('findApplication', error);
  return data ? toApplication(data) : null;
}

/** An application plus the owning recruiter of its job, for access checks. */
export async function getApplicationWithOwner(id: string): Promise<{ app: Application; recruiterId: string | null } | null> {
  const { data, error } = await db().from(TABLES.applications).select('*').eq('id', id).maybeSingle<ApplicationRow>();
  if (error) fail('getApplicationWithOwner', error);
  if (!data) return null;
  const job = await getJob(data.job_id);
  return { app: toApplication(data), recruiterId: job?.recruiterId ?? null };
}

async function insertHistory(entry: Omit<StatusChange, 'id'>) {
  const { error } = await db().from(TABLES.statusHistory).insert({
    id: newId('hist'),
    application_id: entry.applicationId,
    from_status: entry.fromStatus,
    to_status: entry.toStatus,
    changed_by: entry.changedBy,
    changed_at: entry.changedAt,
  });
  if (error) fail('insertHistory', error);
}

async function insertNotification(n: Omit<Notification, 'id'>) {
  const { error } = await db().from(TABLES.notifications).insert({
    id: newId('ntf'),
    user_id: n.userId,
    to_email: n.toEmail,
    subject: n.subject,
    body: n.body,
    application_id: n.applicationId,
    created_at: n.createdAt,
  });
  if (error) fail('insertNotification', error);
}

/** Saves an application with its first history entry and a notification to the recruiter. */
export async function createApplication({ app, candidate, job }: NewApplication): Promise<'ok' | 'duplicate'> {
  const now = new Date().toISOString();
  const { error } = await db().from(TABLES.applications).insert({
    id: app.id,
    job_id: app.jobId,
    candidate_id: app.candidateId,
    cover_note: app.coverNote,
    resume_path: app.resumePath,
    resume_name: app.resumeName,
    status: 'applied',
    applied_on: now,
    updated_at: now,
  });
  if (error?.code === UNIQUE_VIOLATION) return 'duplicate';
  if (error) fail('createApplication', error);

  const recruiter = await getUserById(job.recruiterId);
  await Promise.all([
    insertHistory({ applicationId: app.id, fromStatus: null, toStatus: 'applied', changedBy: candidate.id, changedAt: now }),
    recruiter &&
      insertNotification({
        userId: recruiter.id,
        toEmail: recruiter.email,
        applicationId: app.id,
        createdAt: now,
        subject: `New application: ${candidate.name} for ${job.title}`,
        body: `Hi ${recruiter.name.split(' ')[0]},\n\n${candidate.name} applied for ${job.title}. Open My Jobs → View applicants to read their cover note and resume.`,
      }),
  ]);
  return 'ok';
}

/** Changes the status (owner only), logs it with a timestamp and notifies the candidate. */
export async function updateApplicationStatus({ applicationId, recruiterId, status }: StatusTarget): Promise<StatusUpdateResult> {
  const found = await getApplicationWithOwner(applicationId);
  if (!found) return 'missing';
  if (found.recruiterId !== recruiterId) return 'forbidden';
  if (found.app.status === status) return 'unchanged';

  const now = new Date().toISOString();
  const { error } = await db()
    .from(TABLES.applications)
    .update({ status, updated_at: now })
    .eq('id', applicationId);
  if (error) fail('updateApplicationStatus', error);

  const [job, candidate] = await Promise.all([getJob(found.app.jobId), getUserById(found.app.candidateId)]);
  await Promise.all([
    insertHistory({ applicationId, fromStatus: found.app.status, toStatus: status, changedBy: recruiterId, changedAt: now }),
    job &&
      candidate &&
      insertNotification({
        userId: candidate.id,
        toEmail: candidate.email,
        applicationId,
        createdAt: now,
        ...statusEmail(status, candidate.name, job.title, job.company),
      }),
  ]);
  return 'ok';
}

/* ───────────────────── History & notifications ───────────────────── */

export async function listStatusHistory(applicationIds: string[]): Promise<Map<string, StatusChange[]>> {
  const map = new Map<string, StatusChange[]>();
  if (!applicationIds.length) return map;
  const { data, error } = await db()
    .from(TABLES.statusHistory)
    .select('*')
    .in('application_id', applicationIds)
    .order('changed_at', { ascending: true })
    .returns<HistoryRow[]>();
  if (error) fail('listStatusHistory', error);
  for (const r of data) {
    const list = map.get(r.application_id) ?? [];
    list.push(toChange(r));
    map.set(r.application_id, list);
  }
  return map;
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await db()
    .from(TABLES.notifications)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<NotificationRow[]>();
  if (error) fail('listNotifications', error);
  return data.map(toNotification);
}

/* ─────────────────────────── Resumes ─────────────────────────── */

const bucket = () => db().storage.from(RESUME_BUCKET);

export async function uploadResume(path: string, data: Buffer): Promise<void> {
  const { error } = await bucket().upload(path, data, { contentType: 'application/pdf', upsert: true });
  if (error) fail('uploadResume', error);
}

/** Copies a stored resume (the profile resume becomes the application's own copy). */
export async function copyResume(from: string, to: string): Promise<void> {
  const { error } = await bucket().copy(from, to);
  if (!error) return;
  // Demo profiles loaded with seed.sql have no file yet: create it, then copy.
  const demo = demoResume(from);
  if (!demo) fail('copyResume', error);
  await uploadResume(to, demo);
}

export async function downloadResume(path: string): Promise<Buffer | null> {
  const { data, error } = await bucket().download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeResumes(paths: string[]): Promise<void> {
  if (paths.length) await bucket().remove(paths);
}

/** A short-lived signed link to view a private resume. */
export async function openResume(path: string): Promise<ResumeSource | null> {
  let { data, error } = await bucket().createSignedUrl(path, 60);
  // Demo data loaded with supabase/seed.sql has no files yet: create each one on first view.
  if (error || !data) {
    const demo = demoResume(path);
    if (!demo) return null;
    const { error: uploadError } = await bucket().upload(path, demo, { contentType: 'application/pdf', upsert: true });
    if (uploadError) return null;
    ({ data, error } = await bucket().createSignedUrl(path, 60));
    if (error || !data) return null;
  }
  return { redirect: data.signedUrl };
}

export { newId };
