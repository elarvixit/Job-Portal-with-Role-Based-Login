import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { countApplicationsForJob, findApplication, getJob, getProfile } from '@/lib/repo';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, timeAgo } from '@/lib/format';
import { applyBlocker, isPastDeadline, matchScore, profileChecklist } from '@/lib/rules';
import ApplyForm from '@/components/ApplyForm';
import { CompanyLogo, MatchScore, SkillTags, StatusBadge, statusLabel } from '@/components/ui';
import { ArrowLeft, BriefcaseIcon, BulbIcon, CheckIcon, LockIcon, ShieldIcon, SparkIcon, UserIcon, UsersIcon } from '@/components/icons';

type Props = { params: Promise<{ id: string }> };

// The tab title and the page share one lookup per request.
const loadJob = cache(getJob);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await loadJob(id);
  return { title: job ? `${job.title} at ${job.company}` : 'Job not found' };
}

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;
  // Everything this page needs, fetched at once.
  const [job, applicantCount, [user, myApplication, profile]] = await Promise.all([
    loadJob(id),
    countApplicationsForJob(id),
    getCurrentUser().then(async (u) =>
      u?.role === 'candidate'
        ? ([u, ...(await Promise.all([findApplication(id, u.id), getProfile(u.id)]))] as const)
        : ([u, null, null] as const),
    ),
  ]);
  if (!job) notFound();

  const isOwner = user?.role === 'recruiter' && job.recruiterId === user.id;

  // Closed jobs are hidden from candidates, except those who already applied (they keep seeing it).
  if (job.status === 'closed' && !isOwner && !myApplication) notFound();

  const blocked = applyBlocker(job);
  const pastDeadline = isPastDeadline(job);
  const match = user?.role === 'candidate' ? matchScore(job.skills, profile?.skills ?? []) : null;
  const checklist = profileChecklist(profile);

  let panel: React.ReactNode;
  if (!user) {
    panel = (
      <div className="apply-state">
        <div className="icon-circle accent">
          <LockIcon size={22} />
        </div>
        <h3>Log in to apply</h3>
        <p>Create a free candidate account or log in to send your application in under two minutes.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link href={`/login?next=/jobs/${job.id}`} className="btn btn-primary btn-block">
            Log in to apply
          </Link>
          <Link href="/signup?role=candidate" className="btn btn-secondary btn-block">
            Create an account
          </Link>
        </div>
      </div>
    );
  } else if (user.role === 'recruiter') {
    panel = (
      <div className="apply-state">
        <div className="icon-circle">
          <ShieldIcon size={22} />
        </div>
        <h3>Recruiters cannot apply</h3>
        <p>
          {isOwner
            ? 'This is one of your listings. Manage it or review applicants from your dashboard.'
            : 'You are signed in as a recruiter. Switch to a candidate account to apply for roles.'}
        </p>
        {isOwner && (
          <div style={{ display: 'grid', gap: 10 }}>
            <Link href={`/recruiter/jobs/${job.id}/applications`} className="btn btn-primary btn-block">
              <UsersIcon size={17} /> View {applicantCount} applicants
            </Link>
            <Link href={`/recruiter/jobs/${job.id}/edit`} className="btn btn-secondary btn-block">
              Edit job
            </Link>
          </div>
        )}
      </div>
    );
  } else if (myApplication) {
    panel = (
      <div className="apply-state">
        <div className="icon-circle success">
          <CheckIcon size={24} strokeWidth={2.4} />
        </div>
        <h3>You’ve applied</h3>
        <p>
          You applied on {formatDate(myApplication.createdAt)}. Current status:{' '}
          <strong style={{ color: 'var(--ink)' }}>{statusLabel(myApplication.status)}</strong>. You can apply to each
          job only once.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link href="/candidate/applications" className="btn btn-dark btn-block">
            Track my applications
          </Link>
          <Link href="/" className="btn btn-secondary btn-block">
            Browse more jobs
          </Link>
        </div>
      </div>
    );
  } else if (blocked) {
    panel = (
      <div className="apply-state">
        <div className="icon-circle">
          <LockIcon size={22} />
        </div>
        <h3>{pastDeadline ? 'Deadline passed' : 'Applications closed'}</h3>
        <p>
          {pastDeadline && job.deadline
            ? `Applications for this role closed on ${longDate(job.deadline)}.`
            : 'This role is no longer accepting applications.'}
        </p>
        <Link href="/" className="btn btn-secondary btn-block">
          Browse open jobs
        </Link>
      </div>
    );
  } else if (!checklist.complete || !profile?.resumePath) {
    panel = (
      <div className="apply-state">
        <div className="icon-circle accent">
          <UserIcon size={22} />
        </div>
        <h3>Complete your profile to apply</h3>
        <p>
          Your profile is {checklist.percent}% complete. Recruiters see your phone, skills, experience and resume with every
          application.
        </p>
        <Link href="/candidate/profile" className="btn btn-primary btn-block">
          Complete my profile
        </Link>
      </div>
    );
  } else {
    panel = (
      <div className="card-pad">
        <h2>Apply for this role</h2>
        <p className="muted" style={{ fontSize: 14, margin: '6px 0 16px' }}>
          Applying as <strong style={{ color: 'var(--ink)' }}>{user.name}</strong>
          {job.deadline && <> · closes {longDate(job.deadline)}</>}
        </p>
        <p className="hint" style={{ fontSize: 13 }}>
          <BulbIcon size={16} />
          <span>
            The recruiter sees your cover note, profile and resume. Follow your progress any time in{' '}
            <Link href="/candidate/applications" className="link">
              My Applications
            </Link>
            .
          </span>
        </p>
        <ApplyForm jobId={job.id} resume={{ name: profile.resumeName ?? 'resume.pdf', size: profile.resumeSize ?? 0 }} />
      </div>
    );
  }

  return (
    <>
      <section className="detail-head">
        <div className="container">
          <Link href="/" className="breadcrumb">
            <ArrowLeft size={15} /> All jobs
          </Link>
          <div className="detail-title">
            <CompanyLogo name={job.company} size="lg" />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1>{job.title}</h1>
              <div className="company">
                {job.company} · Posted {timeAgo(job.createdAt)}
              </div>
            </div>
            {job.status === 'closed' && <StatusBadge status="closed" />}
            {job.status === 'open' && pastDeadline && <span className="badge badge-rejected">Deadline passed</span>}
          </div>
          <div className="detail-meta" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <div className="meta-tile">
              <div className="k">Location</div>
              <div className="v">{job.location}</div>
            </div>
            <div className="meta-tile">
              <div className="k">Job type</div>
              <div className="v">{job.type}</div>
            </div>
            <div className="meta-tile">
              <div className="k">Salary</div>
              <div className="v">{job.salary}</div>
            </div>
            <div className="meta-tile">
              <div className="k">Apply by</div>
              <div className="v" style={pastDeadline ? { color: 'var(--danger)' } : undefined}>
                {job.deadline ? longDate(job.deadline) : 'No deadline'}
              </div>
            </div>
            <div className="meta-tile">
              <div className="k">Applicants</div>
              <div className="v">{applicantCount}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-body">
        <article className="card card-pad" style={{ display: 'grid', gap: 22 }}>
          {job.skills.length > 0 && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SparkIcon size={18} /> Skills required
                </h2>
                {match && (
                  <MatchScore
                    percent={match.percent}
                    title={`You have ${match.matched.length} of ${job.skills.length} required skills`}
                  />
                )}
              </div>
              <SkillTags skills={job.skills} have={user?.role === 'candidate' ? profile?.skills : undefined} />
              {match && match.missing.length > 0 && (
                <p className="muted" style={{ fontSize: 13 }}>
                  Skills you haven’t listed yet: {match.missing.join(', ')}.
                </p>
              )}
            </div>
          )}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <BriefcaseIcon size={18} /> About the role
            </h2>
            <div className="prose">{job.description}</div>
          </div>
        </article>
        <aside className="card sticky">{panel}</aside>
      </div>
    </>
  );
}
