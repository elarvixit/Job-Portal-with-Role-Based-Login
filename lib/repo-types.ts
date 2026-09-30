import type { Application, ApplicationStatus, CandidateProfile, Job, PublicUser } from './types';

export type JobInput = Pick<Job, 'title' | 'company' | 'description' | 'location' | 'type' | 'salary' | 'skills' | 'deadline' | 'status'>;
export type ProfileInput = Pick<CandidateProfile, 'phone' | 'skills' | 'yearsExperience'>;
export type ResumeFile = { path: string; name: string; size: number };
export type OwnedResult = 'ok' | 'missing' | 'forbidden';
export type ApplicationWithJob = { app: Application; job: Job };
export type ApplicationWithCandidate = { app: Application; candidate: PublicUser | null; profile: CandidateProfile | null };
export type StatusUpdateResult = OwnedResult | 'unchanged';

/** How to serve a resume: redirect to a signed URL (Supabase) or stream the bytes (local mode). */
export type ResumeSource = { redirect: string } | { data: Buffer };

export type NewApplication = { app: Application; candidate: PublicUser; job: Job };
export type StatusTarget = { applicationId: string; recruiterId: string; status: ApplicationStatus };
