// Supabase object names. Every table starts with this prefix so the app can share a Supabase
// project with others. Must match supabase/schema.sql.
export const TABLE_PREFIX = 'Bhargavi_Job Portal with role-based login_';

export const TABLES = {
  users: `${TABLE_PREFIX}users`,
  jobs: `${TABLE_PREFIX}jobs`,
  candidateProfiles: `${TABLE_PREFIX}candidate_profiles`,
  applications: `${TABLE_PREFIX}applications`,
  statusHistory: `${TABLE_PREFIX}status_history`,
  notifications: `${TABLE_PREFIX}notifications`,
} as const;

// Storage bucket for resumes (bucket ids can't contain spaces, so it uses a URL-safe form of the prefix).
export const RESUME_BUCKET = 'bhargavi-job-portal-resumes';
