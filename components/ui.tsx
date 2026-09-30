import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDate, hueFor, initials, timeAgo } from '@/lib/format';
import { isPastDeadline, STATUS_LABEL as APP_STATUS_LABEL } from '@/lib/rules';
import type { ApplicationStatus, Job, JobStatus } from '@/lib/types';
import { ArrowUpRight, BriefcaseIcon, CalendarIcon, ClockIcon, PinIcon } from './icons';

const STATUS_LABEL: Record<ApplicationStatus | JobStatus, string> = {
  ...APP_STATUS_LABEL,
  open: 'Open',
  closed: 'Closed',
};

/** Plain-English meaning of each status, shown as a tooltip and in the dashboard guides. */
export const STATUS_HELP: Record<ApplicationStatus | JobStatus, string> = {
  applied: 'Sent to the recruiter, who hasn’t made a decision yet.',
  shortlisted: 'The recruiter liked your application and put you on the shortlist.',
  interview: 'The recruiter wants to interview you. Expect a message to arrange a time.',
  offered: 'Congratulations — the company is offering you the job.',
  rejected: 'The recruiter decided not to move forward this time.',
  open: 'Visible on the job board and accepting applications until the deadline.',
  closed: 'Hidden from candidates; existing applications stay visible.',
};

/** Skill tags. Matched skills (the viewer has them) are highlighted. */
export function SkillTags({ skills, have, max }: { skills: string[]; have?: string[]; max?: number }) {
  const mine = new Set((have ?? []).map((x) => x.toLowerCase()));
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <span className="skills">
      {shown.map((sk) => (
        <span key={sk} className={`skill${mine.has(sk.toLowerCase()) ? ' have' : ''}`}>
          {sk}
        </span>
      ))}
      {max && skills.length > max && <span className="skill more">+{skills.length - max}</span>}
    </span>
  );
}

/** Skill match as a percentage with a small meter. */
export function MatchScore({ percent, title }: { percent: number; title?: string }) {
  const tone = percent >= 75 ? 'high' : percent >= 40 ? 'mid' : 'low';
  return (
    <span className={`match ${tone}`} title={title}>
      <span className="meter" aria-hidden>
        <span style={{ width: `${percent}%` }} />
      </span>
      <strong>{percent}%</strong> match
    </span>
  );
}

/** "Apply by 12 Oct", or a warning once the deadline has passed. */
export function DeadlineChip({ job }: { job: Pick<Job, 'deadline'> }) {
  if (!job.deadline) return null;
  const past = isPastDeadline(job);
  const label = new Date(`${job.deadline}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <span className={`chip deadline${past ? ' past' : ''}`}>
      <CalendarIcon size={15} /> {past ? `Closed ${label}` : `Apply by ${label}`}
    </span>
  );
}

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

const TRACK = ['applied', 'shortlisted', 'interview', 'offered'] as const;

/** Where an application is in the hiring pipeline: Applied → Shortlisted → Interview → Offered. */
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
      className={`tracker${status === 'rejected' ? ' rejected' : status === 'offered' ? ' hired' : ''}`}
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
        {job.deadline ? (
          <DeadlineChip job={job} />
        ) : (
          <span className="chip" title={formatDate(job.createdAt)}>
            <ClockIcon size={15} /> {timeAgo(job.createdAt)}
          </span>
        )}
      </div>
      {job.skills.length > 0 && <SkillTags skills={job.skills} max={4} />}
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
