export type Role = 'candidate' | 'recruiter';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type JobStatus = 'open' | 'closed';

/** The hiring pipeline: Applied → Shortlisted → Interview → Offered, or Rejected at any point. */
export const APPLICATION_STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Resume uploads (candidate profile). */
export const RESUME_MAX_BYTES = 2 * 1024 * 1024;

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  type: JobType;
  salary: string;
  /** Required skills, shown as tags. */
  skills: string[];
  /** Last day to apply (YYYY-MM-DD, inclusive), or null for no deadline. */
  deadline: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfile {
  userId: string;
  phone: string;
  skills: string[];
  yearsExperience: number;
  resumePath: string | null;
  resumeName: string | null;
  resumeSize: number | null;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  coverNote: string;
  /** A copy of the candidate's profile resume, taken when they applied. */
  resumePath: string;
  resumeName: string;
  status: ApplicationStatus;
  /** When the candidate applied (the `applied_on` column). */
  createdAt: string;
  updatedAt: string;
}

/** One row per status change, shown to the recruiter as a timeline. */
export interface StatusChange {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedBy: string | null;
  changedAt: string;
}

/** Email-style message recorded when something happens to an application. */
export interface Notification {
  id: string;
  userId: string;
  toEmail: string;
  subject: string;
  body: string;
  applicationId: string | null;
  createdAt: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;
