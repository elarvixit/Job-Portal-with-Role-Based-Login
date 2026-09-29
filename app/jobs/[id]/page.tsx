import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countApplicationsForJob, findApplication, getJob } from '@/lib/repo';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, timeAgo } from '@/lib/format';
import ApplyForm from '@/components/ApplyForm';
import { CompanyLogo, StatusBadge, statusLabel } from '@/components/ui';
import { ArrowLeft, BriefcaseIcon, CheckIcon, LockIcon, ShieldIcon, UsersIcon } from '@/components/icons';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? `${job.title} at ${job.company}` : 'Job not found' };
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;
  const [job, user] = await Promise.all([getJob(id), getCurrentUser()]);
  if (!job) notFound();

  const isOwner = user?.role === 'recruiter' && job.recruiterId === user.id;
  const [applicantCount, myApplication] = await Promise.all([
    countApplicationsForJob(job.id),
    user?.role === 'candidate' ? findApplication(job.id, user.id) : null,
  ]);

  // Closed jobs are only visible to the recruiter who owns them and candidates who applied.
  if (job.status === 'closed' && !isOwner && !myApplication) notFound();

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
          <Link href="/signup" className="btn btn-secondary btn-block">
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
        <h3>Application submitted</h3>
        <p>
          You applied on {formatDate(myApplication.createdAt)}. Current status:{' '}
          <strong style={{ color: 'var(--ink)' }}>{statusLabel(myApplication.status)}</strong>
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
  } else if (job.status === 'closed') {
    panel = (
      <div className="apply-state">
        <div className="icon-circle">
          <LockIcon size={22} />
        </div>
        <h3>Applications closed</h3>
        <p>This role is no longer accepting applications.</p>
      </div>
    );
  } else {
    panel = (
      <div className="card-pad">
        <h2>Apply for this role</h2>
        <p className="muted" style={{ fontSize: 14, margin: '6px 0 22px' }}>
          Applying as <strong style={{ color: 'var(--ink)' }}>{user.name}</strong>
        </p>
        <ApplyForm jobId={job.id} />
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
          </div>
          <div className="detail-meta">
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
              <div className="k">Applicants</div>
              <div className="v">{applicantCount}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container detail-body">
        <article className="card card-pad">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <BriefcaseIcon size={18} /> About the role
          </h2>
          <div className="prose">{job.description}</div>
        </article>
        <aside className="card sticky">{panel}</aside>
      </div>
    </>
  );
}
