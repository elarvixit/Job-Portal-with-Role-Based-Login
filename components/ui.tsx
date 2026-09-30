import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDate, hueFor, initials, timeAgo } from '@/lib/format';
import type { ApplicationStatus, Job, JobStatus } from '@/lib/types';
import { ArrowUpRight, BriefcaseIcon, ClockIcon, PinIcon } from './icons';

const STATUS_LABEL: Record<ApplicationStatus | JobStatus, string> = {
  applied: 'Applied',
  reviewing: 'In review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  hired: 'Hired',
  open: 'Open',
  closed: 'Closed',
};

/** Plain-English meaning of each status, shown as a tooltip and in the dashboard guides. */
export const STATUS_HELP: Record<ApplicationStatus | JobStatus, string> = {
  applied: 'Sent to the recruiter. They haven’t opened it yet.',
  reviewing: 'The recruiter is reading your cover note and resume.',
  shortlisted: 'You’re on the shortlist. Expect to hear about next steps.',
  rejected: 'The recruiter decided not to move forward this time.',
  hired: 'Congratulations — you got the job!',
  open: 'Visible on the job board and accepting applications.',
  closed: 'Hidden from the job board; no new applications.',
};

export function statusLabel(s: ApplicationStatus | JobStatus) {
  return STATUS_LABEL[s];
}

export function StatusBadge({ status }: { status: ApplicationStatus | JobStatus }) {
  return (
    <span className={`badge badge-${status}`} title={STATUS_HELP[status]}>
      <span className="dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CompanyLogo({ name, size }: { name: string; size?: 'lg' }) {
  return (
    <span className={`logo${size ? ` ${size}` : ''}`} style={{ ['--h' as string]: hueFor(name) }} aria-hidden>
      {initials(name)}
    </span>
  );
}

/** A number that counts up on first paint (pure CSS); screen readers get the real value. */
export function CountUp({ value }: { value: number }) {
  return (
    <>
      <span className="count-up" aria-hidden style={{ ['--target' as string]: value }} />
      <span className="sr-only">{value}</span>
    </>
  );
}

const TRACK = ['applied', 'reviewing', 'shortlisted', 'hired'] as const;

/** Where an application is in the hiring pipeline: Applied → In review → Shortlisted → Hired. */
export function StatusTracker({ status }: { status: ApplicationStatus }) {
  const steps =
    status === 'rejected'
      ? [
          { label: 'Applied', state: 'done' },
          { label: 'Reviewed', state: 'done' },
          { label: 'Not selected', state: 'current' },
        ]
      : TRACK.map((s, i) => {
          const at = TRACK.indexOf(status);
          return { label: STATUS_LABEL[s], state: i < at ? 'done' : i === at ? 'current done' : '' };
        });
  return (
    <div
      className={`tracker${status === 'rejected' ? ' rejected' : status === 'hired' ? ' hired' : ''}`}
      role="img"
      aria-label={`Progress: ${STATUS_LABEL[status]}. ${STATUS_HELP[status]}`}
      title={STATUS_HELP[status]}
    >
      {steps.map((st) => (
        <div key={st.label} className={`step ${st.state}`}>
          <span className="dot" />
          {st.label}
        </div>
      ))}
    </div>
  );
}

export function JobCard({ job, applicants, index = 0 }: { job: Job; applicants?: number; index?: number }) {
  return (
    <Link href={`/jobs/${job.id}`} className="job-card" style={{ ['--d' as string]: index }}>
      <div className="job-card-top">
        <CompanyLogo name={job.company} />
        <div style={{ minWidth: 0 }}>
          <h3>{job.title}</h3>
          <div className="company">{job.company}</div>
        </div>
        <span className="job-card-arrow">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="job-card-meta">
        <span className="chip">
          <PinIcon size={15} /> {job.location}
        </span>
        <span className="chip">
          <BriefcaseIcon size={15} /> {job.type}
        </span>
        <span className="chip" title={formatDate(job.createdAt)}>
          <ClockIcon size={15} /> {timeAgo(job.createdAt)}
        </span>
      </div>
      <div className="job-card-foot">
        <div className="salary">
          <small>Compensation</small>
          {job.salary}
        </div>
        {typeof applicants === 'number' ? (
          <span className="type-tag">{applicants} applicants</span>
        ) : (
          <span className="type-tag">View role</span>
        )}
      </div>
    </Link>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
