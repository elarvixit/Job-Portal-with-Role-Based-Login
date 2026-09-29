import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { newId } from './ids';
import type {
  ApplicationWithCandidate,
  ApplicationWithJob,
  JobInput,
  OwnedResult,
  ResumeSource,
} from './repo-types';
import { buildSeed } from './seed';
import type { Application, ApplicationStatus, Job, PublicUser, User } from './types';

// Local mode: used when Supabase isn't configured. Data lives in data/db.json and resumes in
// data/uploads/ on this computer. Not for Vercel (its filesystem doesn't persist).

interface LocalDb {
  users: User[];
  jobs: Job[];
  applications: Application[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const g = globalThis as unknown as { __hlSeeding?: Promise<void>; __hlQueue?: Promise<unknown> };

async function ensureSeeded(): Promise<void> {
  if (process.env.VERCEL) {
    throw new Error('Supabase is not configured. Add the Supabase environment variables in Vercel (see README).');
  }
  try {
    await fs.access(DB_FILE);
    return;
  } catch {
    /* not found: seed */
  }
  if (!g.__hlSeeding) {
    g.__hlSeeding = (async () => {
      const { users, jobs, applications, files } = buildSeed();
      for (const f of files) await writeResume(f.path, f.data);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify({ users, jobs, applications }, null, 2));
    })().finally(() => {
      g.__hlSeeding = undefined;
    });
  }
  await g.__hlSeeding;
}

async function read(): Promise<LocalDb> {
  await ensureSeeded();
  if (g.__hlQueue) await g.__hlQueue.catch(() => {});
  return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as LocalDb;
}

/** Serialises writes so concurrent requests can't clobber each other. */
function mutate<T>(fn: (db: LocalDb) => T): Promise<T> {
  const run = (g.__hlQueue ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await ensureSeeded();
      const db = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as LocalDb;
      const result = fn(db);
      const tmp = `${DB_FILE}.${randomBytes(4).toString('hex')}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2));
      await fs.rename(tmp, DB_FILE);
      return result;
    });
  g.__hlQueue = run.catch(() => {});
  return run;
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
const toPublic = ({ passwordHash: _omit, ...u }: User): PublicUser => u;

/* ───────────────────────────── Users ───────────────────────────── */

export async function getUserById(id: string): Promise<PublicUser | null> {
  const u = (await read()).users.find((x) => x.id === id);
  return u ? toPublic(u) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return (await read()).users.find((u) => u.email === email) ?? null;
}

export async function createUser(user: User): Promise<'ok' | 'duplicate'> {
  return mutate((db) => {
    if (db.users.some((u) => u.email === user.email)) return 'duplicate' as const;
    db.users.push(user);
    return 'ok' as const;
  });
}

/* ───────────────────────────── Jobs ───────────────────────────── */

export async function listOpenJobs(): Promise<Job[]> {
  return (await read()).jobs.filter((j) => j.status === 'open').sort(byNewest);
}

export async function listJobsByRecruiter(recruiterId: string): Promise<Job[]> {
  return (await read()).jobs.filter((j) => j.recruiterId === recruiterId).sort(byNewest);
}

export async function getJob(id: string): Promise<Job | null> {
  return (await read()).jobs.find((j) => j.id === id) ?? null;
}

export async function createJob(recruiterId: string, input: JobInput): Promise<Job> {
  const now = new Date().toISOString();
  const job: Job = { id: newId('job'), recruiterId, ...input, createdAt: now, updatedAt: now };
  await mutate((db) => db.jobs.push(job));
  return job;
}

function editOwnedJob(id: string, recruiterId: string, edit: (job: Job) => void): Promise<OwnedResult> {
  return mutate((db) => {
    const job = db.jobs.find((j) => j.id === id);
    if (!job) return 'missing' as const;
    if (job.recruiterId !== recruiterId) return 'forbidden' as const;
    edit(job);
    job.updatedAt = new Date().toISOString();
    return 'ok' as const;
  });
}

export async function updateJob(id: string, recruiterId: string, input: JobInput): Promise<OwnedResult> {
  return editOwnedJob(id, recruiterId, (job) => Object.assign(job, input));
}

export async function toggleJobStatus(id: string, recruiterId: string): Promise<OwnedResult> {
  return editOwnedJob(id, recruiterId, (job) => {
    job.status = job.status === 'open' ? 'closed' : 'open';
  });
}

/* ───────────────────────── Applications ───────────────────────── */

export async function listApplicationsByCandidate(candidateId: string): Promise<ApplicationWithJob[]> {
  const db = await read();
  return db.applications
    .filter((a) => a.candidateId === candidateId)
    .sort(byNewest)
    .flatMap((app) => {
      const job = db.jobs.find((j) => j.id === app.jobId);
      return job ? [{ app, job }] : [];
    });
}

export async function listApplicationsForJobs(jobIds: string[]): Promise<ApplicationWithCandidate[]> {
  const db = await read();
  const ids = new Set(jobIds);
  return db.applications
    .filter((a) => ids.has(a.jobId))
    .sort(byNewest)
    .map((app) => {
      const u = db.users.find((x) => x.id === app.candidateId);
      return { app, candidate: u ? toPublic(u) : null };
    });
}

export async function countApplicationsForJob(jobId: string): Promise<number> {
  return (await read()).applications.filter((a) => a.jobId === jobId).length;
}

export async function findApplication(jobId: string, candidateId: string): Promise<Application | null> {
  return (await read()).applications.find((a) => a.jobId === jobId && a.candidateId === candidateId) ?? null;
}

export async function getApplicationWithOwner(
  id: string,
): Promise<{ app: Application; recruiterId: string | null } | null> {
  const db = await read();
  const app = db.applications.find((a) => a.id === id);
  if (!app) return null;
  return { app, recruiterId: db.jobs.find((j) => j.id === app.jobId)?.recruiterId ?? null };
}

export async function createApplication(app: Application): Promise<'ok' | 'duplicate'> {
  const now = new Date().toISOString();
  return mutate((db) => {
    if (db.applications.some((a) => a.jobId === app.jobId && a.candidateId === app.candidateId)) {
      return 'duplicate' as const;
    }
    db.applications.push({ ...app, createdAt: now, updatedAt: now });
    return 'ok' as const;
  });
}

export async function updateApplicationStatus(
  id: string,
  recruiterId: string,
  status: ApplicationStatus,
): Promise<OwnedResult> {
  return mutate((db) => {
    const app = db.applications.find((a) => a.id === id);
    if (!app) return 'missing' as const;
    if (db.jobs.find((j) => j.id === app.jobId)?.recruiterId !== recruiterId) return 'forbidden' as const;
    app.status = status;
    app.updatedAt = new Date().toISOString();
    return 'ok' as const;
  });
}

/* ─────────────────────────── Resumes ─────────────────────────── */

// Paths look like "<userId>/<applicationId>.pdf"; reject anything else to prevent path traversal.
const RESUME_PATH_RE = /^[a-z0-9_]+\/[a-z0-9_]+\.pdf$/i;

function resumeFile(p: string): string | null {
  return RESUME_PATH_RE.test(p) ? path.join(UPLOAD_DIR, ...p.split('/')) : null;
}

async function writeResume(p: string, data: Buffer): Promise<void> {
  const file = resumeFile(p);
  if (!file) throw new Error('Invalid resume path');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

/** Local mode has no signed URLs; the browser uploads to /api/applications/local-upload instead. */
export async function createResumeUploadUrl(_path: string): Promise<{ token: string }> {
  return { token: '' };
}

export async function saveResume(p: string, data: Buffer): Promise<void> {
  await ensureSeeded();
  await writeResume(p, data);
}

export async function downloadResume(p: string): Promise<Buffer | null> {
  const file = resumeFile(p);
  if (!file) return null;
  try {
    return await fs.readFile(file);
  } catch {
    return null;
  }
}

export async function removeResume(p: string): Promise<void> {
  const file = resumeFile(p);
  if (file) await fs.rm(file, { force: true });
}

export async function openResume(p: string): Promise<ResumeSource | null> {
  const data = await downloadResume(p);
  return data ? { data } : null;
}

export { newId };
