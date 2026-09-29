export type Role = 'candidate' | 'recruiter';

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type JobStatus = 'open' | 'closed';

export const APPLICATION_STATUSES = ['applied', 'reviewing', 'shortlisted', 'rejected', 'hired'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  coverNote: string;
  resumePath: string;
  resumeName: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;
