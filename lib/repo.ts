import 'server-only';
import * as local from './repo-local';
import * as supabase from './repo-supabase';
import { isSupabaseConfigured } from './supabase';

// Picks the storage backend: Supabase when its environment variables are set, otherwise local files.
export type { ApplicationWithCandidate, ApplicationWithJob, JobInput, OwnedResult } from './repo-types';

type Repo = typeof supabase;

// Compile-time check that local mode implements every Supabase function with the same signature.
const localRepo: Repo = local;

export const storageMode: 'supabase' | 'local' = isSupabaseConfigured() ? 'supabase' : 'local';
const impl: Repo = storageMode === 'supabase' ? supabase : localRepo;

export const {
  newId,
  getUserById,
  getUserByEmail,
  createUser,
  listOpenJobs,
  listJobsByRecruiter,
  getJob,
  createJob,
  updateJob,
  toggleJobStatus,
  listApplicationsByCandidate,
  listApplicationsForJobs,
  countApplicationsForJob,
  findApplication,
  getApplicationWithOwner,
  createApplication,
  updateApplicationStatus,
  createResumeUploadUrl,
  downloadResume,
  removeResume,
  openResume,
} = impl;

/** Local mode only: store an uploaded resume on disk. */
export const saveLocalResume = local.saveResume;
