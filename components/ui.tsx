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

export function statusLabel(s: ApplicationStatus | JobStatus) {
  return STATUS_LABEL[s];
}

export function StatusBadge({ status }: { status: ApplicationStatus | JobStatus }) {
  return (
    <span className={`badge badge-${status}`}>
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

export function JobCard({ job, applicants }: { job: Job; applicants?: number }) {
  return (
    <Link href={`/jobs/${job.id}`} className="job-card">
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
