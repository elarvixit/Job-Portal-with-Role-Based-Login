// Business rules shared by the server (enforcement) and the UI (display).
import type { ApplicationStatus, CandidateProfile, Job } from './types';

/** Dates are compared in India Standard Time, where the portal's users are. */
export const APP_TIMEZONE = 'Asia/Kolkata';

/** Today's date as YYYY-MM-DD in the portal's time zone. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** True once the deadline day has ended. The deadline day itself still accepts applications. */
export function isPastDeadline(job: Pick<Job, 'deadline'>, now = new Date()): boolean {
  return Boolean(job.deadline && job.deadline < todayISO(now));
}

/** Whether a candidate may apply to this job right now, and why not if they can't. */
export function applyBlocker(job: Pick<Job, 'status' | 'deadline'>, now = new Date()): string | null {
  if (job.status !== 'open') return 'This job is closed and no longer accepts applications.';
  if (isPastDeadline(job, now)) return 'The application deadline for this job has passed.';
  return null;
}

export function normaliseSkill(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Clean, de-duplicated (case-insensitive) list of skill tags. */
export function cleanSkills(input: string[] | string): string[] {
  const list = Array.isArray(input) ? input : input.split(',');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = normaliseSkill(raw).slice(0, 40);
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out.slice(0, 20);
}

/** Share of the job's required skills the candidate has, 0–100 (null if the job lists none). */
export function matchScore(jobSkills: string[], candidateSkills: string[]): { percent: number; matched: string[]; missing: string[] } | null {
  if (!jobSkills.length) return null;
  const have = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => have.has(s.toLowerCase()));
  const missing = jobSkills.filter((s) => !have.has(s.toLowerCase()));
  return { percent: Math.round((matched.length / jobSkills.length) * 100), matched, missing };
}

/** What a candidate still has to fill in before they can apply. */
export function profileChecklist(p: Pick<CandidateProfile, 'phone' | 'skills' | 'yearsExperience' | 'resumePath'> | null) {
  const items = [
    { key: 'phone', label: 'Phone number', done: Boolean(p?.phone) },
    { key: 'skills', label: 'At least one skill', done: Boolean(p?.skills.length) },
    { key: 'experience', label: 'Years of experience', done: p != null && p.yearsExperience >= 0 && Boolean(p.phone) },
    { key: 'resume', label: 'Resume (PDF, max 2 MB)', done: Boolean(p?.resumePath) },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, percent: Math.round((done / items.length) * 100), complete: done === items.length };
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  rejected: 'Rejected',
};

/** Email-style message sent to the candidate when the recruiter changes the status. */
export function statusEmail(status: ApplicationStatus, candidateName: string, jobTitle: string, company: string) {
  const first = candidateName.split(' ')[0];
  const lines: Record<ApplicationStatus, [string, string]> = {
    applied: [`We received your application for ${jobTitle}`, `the ${company} team has received your application and will review it soon.`],
    shortlisted: [`You've been shortlisted for ${jobTitle}`, `good news — ${company} has shortlisted your application. They will be in touch about next steps.`],
    interview: [`Interview stage: ${jobTitle}`, `${company} would like to interview you. Expect a message from the recruiter to arrange a time.`],
    offered: [`Offer for ${jobTitle}`, `congratulations! ${company} has decided to offer you the ${jobTitle} role.`],
    rejected: [`Update on your application for ${jobTitle}`, `thank you for applying. ${company} has decided not to move forward with your application this time.`],
  };
  const [subject, body] = lines[status];
  return { subject, body: `Hi ${first},\n\n${body.charAt(0).toUpperCase()}${body.slice(1)}\n\nYou can follow every update in My Applications on Hireloom.` };
}
