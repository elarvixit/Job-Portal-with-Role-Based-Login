import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
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
import { buildSeed, demoResume } from './seed';
import type { Application, CandidateProfile, Job, Notification, PublicUser, StatusChange, User } from './types';

// Local mode: used when Supabase isn't configured. Data lives in data/db.json and resumes in
// data/uploads/ on this computer. Not for Vercel (its filesystem doesn't persist).

interface LocalDb {
  users: User[];
  jobs: Job[];
  profiles: CandidateProfile[];
  applications: Application[];
  history: StatusChange[];
  notifications: Notification[];
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
      const { files, ...data } = buildSeed();
      for (const f of files) await writeResume(f.path, f.data);
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    })().finally(() => {
      g.__hlSeeding = undefined;
    });
  }
  await g.__hlSeeding;
}

/** Reads db.json, filling in collections added after the file was created. */
async function load(): Promise<LocalDb> {
  const raw = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Partial<LocalDb>;
  return {
    users: raw.users ?? [],
    jobs: (raw.jobs ?? []).map((j) => ({ ...j, skills: j.skills ?? [], deadline: j.deadline ?? null })),
    profiles: raw.profiles ?? [],
    applications: raw.applications ?? [],
    history: raw.history ?? [],
    notifications: raw.notifications ?? [],
  };
}

async function read(): Promise<LocalDb> {
  await ensureSeeded();
  if (g.__hlQueue) await g.__hlQueue.catch(() => {});
  return load();
}

/** Serialises writes so concurrent requests can't clobber each other. */
function mutate<T>(fn: (db: LocalDb) => T): Promise<T> {
  const run = (g.__hlQueue ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await ensureSeeded();
      const db = await load();
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

export async function renameUser(id: string, name: string): Promise<void> {
  await mutate((db) => {
    const u = db.users.find((x) => x.id === id);
    if (u) u.name = name;
  });
}

/* ─────────────────────────── Profiles ─────────────────────────── */

export async function getProfile(userId: string): Promise<CandidateProfile | null> {
  return (await read()).profiles.find((p) => p.userId === userId) ?? null;
}

function upsertProfile(db: LocalDb, userId: string, patch: Partial<CandidateProfile>): CandidateProfile {
  let p = db.profiles.find((x) => x.userId === userId);
  if (!p) {
    p = { userId, phone: '', skills: [], yearsExperience: 0, resumePath: null, resumeName: null, resumeSize: null, updatedAt: '' };
    db.profiles.push(p);
  }
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
  return p;
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<void> {
  await mutate((db) => upsertProfile(db, userId, input));
}

export async function setProfileResume(userId: string, file: ResumeFile | null): Promise<string | null> {
  return mutate((db) => {
    const previous = db.profiles.find((p) => p.userId === userId)?.resumePath ?? null;
    upsertProfile(db, userId, { resumePath: file?.path ?? null, resumeName: file?.name ?? null, resumeSize: file?.size ?? null });
    return previous && previous !== file?.path ? previous : null;
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

export async function deleteJob(id: string, recruiterId: string): Promise<OwnedResult> {
  const outcome = await mutate((db) => {
    const job = db.jobs.find((j) => j.id === id);
    if (!job) return { result: 'missing' as const, files: [] };
    if (job.recruiterId !== recruiterId) return { result: 'forbidden' as const, files: [] };
    const appIds = new Set(db.applications.filter((a) => a.jobId === id).map((a) => a.id));
    const files = db.applications.filter((a) => appIds.has(a.id)).map((a) => a.resumePath);
    db.jobs = db.jobs.filter((j) => j.id !== id);
    db.applications = db.applications.filter((a) => !appIds.has(a.id));
    db.history = db.history.filter((h) => !appIds.has(h.applicationId));
    db.notifications = db.notifications.filter((n) => !n.applicationId || !appIds.has(n.applicationId));
    return { result: 'ok' as const, files };
  });
  await removeResumes(outcome.files);
  return outcome.result;
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
      return {
        app,
        candidate: u ? toPublic(u) : null,
        profile: db.profiles.find((p) => p.userId === app.candidateId) ?? null,
      };
    });
}

export async function countApplicationsForJob(jobId: string): Promise<number> {
  return (await read()).applications.filter((a) => a.jobId === jobId).length;
}

export async function findApplication(jobId: string, candidateId: string): Promise<Application | null> {
  return (await read()).applications.find((a) => a.jobId === jobId && a.candidateId === candidateId) ?? null;
}

export async function getApplicationWithOwner(id: string): Promise<{ app: Application; recruiterId: string | null } | null> {
  const db = await read();
  const app = db.applications.find((a) => a.id === id);
  if (!app) return null;
  return { app, recruiterId: db.jobs.find((j) => j.id === app.jobId)?.recruiterId ?? null };
}

export async function createApplication({ app, candidate, job }: NewApplication): Promise<'ok' | 'duplicate'> {
  const now = new Date().toISOString();
  return mutate((db) => {
    if (db.applications.some((a) => a.jobId === app.jobId && a.candidateId === app.candidateId)) {
      return 'duplicate' as const;
    }
    db.applications.push({ ...app, status: 'applied', createdAt: now, updatedAt: now });
    db.history.push({ id: newId('hist'), applicationId: app.id, fromStatus: null, toStatus: 'applied', changedBy: candidate.id, changedAt: now });
    const recruiter = db.users.find((u) => u.id === job.recruiterId);
    if (recruiter) {
      db.notifications.push({
        id: newId('ntf'),
        userId: recruiter.id,
        toEmail: recruiter.email,
        applicationId: app.id,
        createdAt: now,
        subject: `New application: ${candidate.name} for ${job.title}`,
        body: `Hi ${recruiter.name.split(' ')[0]},\n\n${candidate.name} applied for ${job.title}. Open My Jobs → View applicants to read their cover note and resume.`,
      });
    }
    return 'ok' as const;
  });
}

export async function updateApplicationStatus({ applicationId, recruiterId, status }: StatusTarget): Promise<StatusUpdateResult> {
  return mutate((db) => {
    const app = db.applications.find((a) => a.id === applicationId);
    if (!app) return 'missing' as const;
    const job = db.jobs.find((j) => j.id === app.jobId);
    if (!job || job.recruiterId !== recruiterId) return 'forbidden' as const;
    if (app.status === status) return 'unchanged' as const;
    const now = new Date().toISOString();
    db.history.push({ id: newId('hist'), applicationId, fromStatus: app.status, toStatus: status, changedBy: recruiterId, changedAt: now });
    app.status = status;
    app.updatedAt = now;
    const cand = db.users.find((u) => u.id === app.candidateId);
    if (cand) {
      db.notifications.push({
        id: newId('ntf'),
        userId: cand.id,
        toEmail: cand.email,
        applicationId,
        createdAt: now,
        ...statusEmail(status, cand.name, job.title, job.company),
      });
    }
    return 'ok' as const;
  });
}

/* ───────────────────── History & notifications ───────────────────── */

export async function listStatusHistory(applicationIds: string[]): Promise<Map<string, StatusChange[]>> {
  const ids = new Set(applicationIds);
  const map = new Map<string, StatusChange[]>();
  for (const h of (await read()).history.filter((x) => ids.has(x.applicationId)).sort((a, b) => a.changedAt.localeCompare(b.changedAt))) {
    const list = map.get(h.applicationId) ?? [];
    list.push(h);
    map.set(h.applicationId, list);
  }
  return map;
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  return (await read()).notifications
    .filter((n) => n.userId === userId)
    .sort(byNewest)
    .slice(0, 100);
}

/* ─────────────────────────── Resumes ─────────────────────────── */

// Paths look like "<userId>/<file>.pdf"; reject anything else to prevent path traversal.
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

export async function uploadResume(p: string, data: Buffer): Promise<void> {
  await ensureSeeded();
  await writeResume(p, data);
}

export async function copyResume(from: string, to: string): Promise<void> {
  const data = (await downloadResume(from)) ?? demoResume(from);
  if (!data) throw new Error('copyResume: source resume not found');
  await writeResume(to, data);
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

export async function removeResumes(paths: string[]): Promise<void> {
  for (const p of paths) {
    const file = resumeFile(p);
    if (file) await fs.rm(file, { force: true });
  }
}

export async function openResume(p: string): Promise<ResumeSource | null> {
  const data = (await downloadResume(p)) ?? demoResume(p);
  return data ? { data } : null;
}

export { newId };
