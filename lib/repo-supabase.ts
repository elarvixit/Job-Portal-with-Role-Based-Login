import 'server-only';
import { newId } from './ids';
import type {
  ApplicationWithCandidate,
  ApplicationWithJob,
  JobInput,
  OwnedResult,
  ResumeSource,
} from './repo-types';
import { supabaseAdmin } from './supabase';
import { RESUME_BUCKET, TABLES } from './tables';
import type { Application, ApplicationStatus, Job, JobStatus, JobType, PublicUser, Role, User } from './types';

// Data access for Supabase. Tables use snake_case; the app uses camelCase.

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
  status: JobStatus;
  created_at: string;
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
  created_at: string;
  updated_at: string;
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
  status: r.status,
  createdAt: r.created_at,
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
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const PUBLIC_USER_COLS = 'id, name, email, role, created_at';
const UNIQUE_VIOLATION = '23505';

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

/* ───────────────────────────── Users ───────────────────────────── */

export async function getUserById(id: string): Promise<PublicUser | null> {
  const { data, error } = await supabaseAdmin().from(TABLES.users).select(PUBLIC_USER_COLS).eq('id', id).maybeSingle();
  if (error) fail('getUserById', error);
  return data ? toPublicUser(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin().from(TABLES.users).select('*').eq('email', email).maybeSingle<UserRow>();
  if (error) fail('getUserByEmail', error);
  return data ? toUser(data) : null;
}

export async function createUser(user: User): Promise<'ok' | 'duplicate'> {
  const { error } = await supabaseAdmin().from(TABLES.users).insert({
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

/* ───────────────────────────── Jobs ───────────────────────────── */

export async function listOpenJobs(): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLES.jobs)
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();
  if (error) fail('listOpenJobs', error);
  return data.map(toJob);
}

export async function listJobsByRecruiter(recruiterId: string): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLES.jobs)
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false })
    .returns<JobRow[]>();
  if (error) fail('listJobsByRecruiter', error);
  return data.map(toJob);
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin().from(TABLES.jobs).select('*').eq('id', id).maybeSingle<JobRow>();
  if (error) fail('getJob', error);
  return data ? toJob(data) : null;
}

export async function createJob(recruiterId: string, input: JobInput): Promise<Job> {
  const { data, error } = await supabaseAdmin()
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
  const { error } = await supabaseAdmin()
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
  const { error } = await supabaseAdmin()
    .from(TABLES.jobs)
    .update({ status: owned.status === 'open' ? 'closed' : 'open', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recruiter_id', recruiterId);
  if (error) fail('toggleJobStatus', error);
  return 'ok';
}

/* ───────────────────────── Applications ───────────────────────── */

// Related rows are fetched with a second query rather than PostgREST embedding, because embedding
// references tables by name inside the select string and the prefixed names contain spaces.

async function jobsByIds(ids: string[]): Promise<Map<string, Job>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabaseAdmin()
    .from(TABLES.jobs)
    .select('*')
    .in('id', [...new Set(ids)])
    .returns<JobRow[]>();
  if (error) fail('jobsByIds', error);
  return new Map(data.map((r) => [r.id, toJob(r)]));
}

async function usersByIds(ids: string[]): Promise<Map<string, PublicUser>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabaseAdmin()
    .from(TABLES.users)
    .select(PUBLIC_USER_COLS)
    .in('id', [...new Set(ids)])
    .returns<UserRow[]>();
  if (error) fail('usersByIds', error);
  return new Map(data.map((r) => [r.id, toPublicUser(r)]));
}

export async function listApplicationsByCandidate(candidateId: string): Promise<ApplicationWithJob[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLES.applications)
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
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
  const { data, error } = await supabaseAdmin()
    .from(TABLES.applications)
    .select('*')
    .in('job_id', jobIds)
    .order('created_at', { ascending: false })
    .returns<ApplicationRow[]>();
  if (error) fail('listApplicationsForJobs', error);
  const users = await usersByIds(data.map((r) => r.candidate_id));
  return data.map((r) => ({ app: toApplication(r), candidate: users.get(r.candidate_id) ?? null }));
}

export async function countApplicationsForJob(jobId: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from(TABLES.applications)
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);
  if (error) fail('countApplicationsForJob', error);
  return count ?? 0;
}

export async function findApplication(jobId: string, candidateId: string): Promise<Application | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLES.applications)
    .select('*')
    .eq('job_id', jobId)
    .eq('candidate_id', candidateId)
    .maybeSingle<ApplicationRow>();
  if (error) fail('findApplication', error);
  return data ? toApplication(data) : null;
}

/** An application plus the owning recruiter of its job, for access checks. */
export async function getApplicationWithOwner(
  id: string,
): Promise<{ app: Application; recruiterId: string | null } | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLES.applications)
    .select('*')
    .eq('id', id)
    .maybeSingle<ApplicationRow>();
  if (error) fail('getApplicationWithOwner', error);
  if (!data) return null;
  const job = await getJob(data.job_id);
  return { app: toApplication(data), recruiterId: job?.recruiterId ?? null };
}

export async function createApplication(app: Application): Promise<'ok' | 'duplicate'> {
  const { error } = await supabaseAdmin().from(TABLES.applications).insert({
    id: app.id,
    job_id: app.jobId,
    candidate_id: app.candidateId,
    cover_note: app.coverNote,
    resume_path: app.resumePath,
    resume_name: app.resumeName,
    status: app.status,
  });
  if (error?.code === UNIQUE_VIOLATION) return 'duplicate';
  if (error) fail('createApplication', error);
  return 'ok';
}

export async function updateApplicationStatus(
  id: string,
  recruiterId: string,
  status: ApplicationStatus,
): Promise<OwnedResult> {
  const found = await getApplicationWithOwner(id);
  if (!found) return 'missing';
  if (found.recruiterId !== recruiterId) return 'forbidden';
  const { error } = await supabaseAdmin()
    .from(TABLES.applications)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) fail('updateApplicationStatus', error);
  return 'ok';
}

/* ─────────────────────────── Resumes ─────────────────────────── */

export async function createResumeUploadUrl(path: string): Promise<{ token: string }> {
  const { data, error } = await supabaseAdmin().storage.from(RESUME_BUCKET).createSignedUploadUrl(path);
  if (error) fail('createResumeUploadUrl', error);
  return { token: data.token };
}

export async function downloadResume(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin().storage.from(RESUME_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeResume(path: string): Promise<void> {
  await supabaseAdmin().storage.from(RESUME_BUCKET).remove([path]);
}

/** A short-lived signed link to view a private resume. */
export async function openResume(path: string): Promise<ResumeSource | null> {
  const { data, error } = await supabaseAdmin().storage.from(RESUME_BUCKET).createSignedUrl(path, 60);
  if (error || !data) return null;
  return { redirect: data.signedUrl };
}

export { newId };
