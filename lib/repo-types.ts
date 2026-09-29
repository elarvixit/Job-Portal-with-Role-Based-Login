import type { Application, Job, PublicUser } from './types';

export type JobInput = Pick<Job, 'title' | 'company' | 'description' | 'location' | 'type' | 'salary' | 'status'>;
export type OwnedResult = 'ok' | 'missing' | 'forbidden';
export type ApplicationWithJob = { app: Application; job: Job };
export type ApplicationWithCandidate = { app: Application; candidate: PublicUser | null };

/** How to serve a resume: redirect to a signed URL (Supabase) or stream the bytes (local mode). */
export type ResumeSource = { redirect: string } | { data: Buffer };
