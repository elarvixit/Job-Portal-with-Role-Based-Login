import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listApplicationsForJobs, listJobsByRecruiter } from '@/lib/repo';
import { initials, timeAgo } from '@/lib/format';
import ApplicationsChart from '@/components/ApplicationsChart';
import { CountUp, EmptyState, StatusBadge } from '@/components/ui';
import { BriefcaseIcon, EditIcon, EyeIcon, FileIcon, InboxIcon, PlusIcon, StarIcon, UsersIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Recruiter dashboard' };

export default async function RecruiterDashboard() {
  const user = await requireRole('recruiter');
  const myJobs = await listJobsByRecruiter(user.id);
  const withCandidates = await listApplicationsForJobs(myJobs.map((j) => j.id));
  const apps = withCandidates.map((r) => r.app);

  const openJobs = myJobs.filter((j) => j.status === 'open').length;
  const shortlisted = apps.filter((a) => a.status === 'shortlisted').length;
  const newThisWeek = apps.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 86400000).length;

  const recent = withCandidates.slice(0, 6).map(({ app, candidate }) => ({
    app,
    job: myJobs.find((j) => j.id === app.jobId)!,
    candidate,
  }));

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Recruiter dashboard</div>
          <h1>
            Welcome back, <span className="serif">{user.name.split(' ')[0]}</span>
          </h1>
          <p>Your hiring pipeline at a glance.</p>
        </div>
        <Link href="/recruiter/jobs/new" className="btn btn-primary">
          <PlusIcon size={17} /> Post a job
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat featured">
          <div className="top">
            <span className="k">Open jobs</span>
            <span className="ico ico-glass">
              <BriefcaseIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={openJobs} />
          </div>
          <div className="foot">
            {myJobs.length - openJobs} closed · {myJobs.length} total
          </div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="k">Total applicants</span>
            <span className="ico ico-accent">
              <UsersIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={apps.length} />
          </div>
          <div className="foot">+{newThisWeek} in the last 7 days</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="k">Shortlisted</span>
            <span className="ico ico-violet">
              <StarIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={shortlisted} />
          </div>
          <div className="foot">
            {apps.length ? Math.round((shortlisted / apps.length) * 100) : 0}% of all applicants
          </div>
        </div>
      </div>

      <ApplicationsChart jobs={myJobs} apps={apps} />

      <div className="split">
        <div className="card">
          <div className="card-head">
            <h2>Latest applicants</h2>
            <Link href="/recruiter/jobs" className="btn btn-ghost btn-sm">
              All jobs
            </Link>
          </div>
          {recent.length ? (
            recent.map(({ app, job, candidate }) => (
              <Link key={app.id} href={`/recruiter/jobs/${job.id}/applications`} className="list-item">
                <span className="avatar lg">{initials(candidate?.name ?? '?')}</span>
                <div className="grow">
                  <div className="t">{candidate?.name ?? 'Unknown candidate'}</div>
                  <div className="s">
                    {job.title} · {timeAgo(app.createdAt)}
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </Link>
            ))
          ) : (
            <div style={{ padding: 20 }}>
              <EmptyState icon={<InboxIcon size={22} />} title="No applicants yet">
                Applications to your jobs will show up here as they arrive.
              </EmptyState>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Quick actions</h2>
          </div>
          <div className="quick-actions">
            <Link href="/recruiter/jobs/new" className="quick-action">
              <span className="ico ico-accent">
                <PlusIcon size={18} />
              </span>
              <span>
                <strong>Post a new job</strong>
                <span>Reach candidates in minutes</span>
              </span>
            </Link>
            <Link href="/recruiter/jobs" className="quick-action">
              <span className="ico ico-success">
                <EditIcon size={18} />
              </span>
              <span>
                <strong>Manage my jobs</strong>
                <span>Edit, close or reopen listings</span>
              </span>
            </Link>
            {myJobs[0] && (
              <Link href={`/recruiter/jobs/${myJobs[0].id}/applications`} className="quick-action">
                <span className="ico ico-violet">
                  <UsersIcon size={18} />
                </span>
                <span>
                  <strong>Review applicants</strong>
                  <span>Latest: {myJobs[0].title}</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="card guide" data-reveal aria-labelledby="workflow">
        <div className="card-head">
          <h2 id="workflow">How hiring works on Hireloom</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Four steps from posting a job to making a hire.
          </span>
        </div>
        <div className="guide-grid">
          <Link href="/recruiter/jobs/new" className="guide-card">
            <span className="n">STEP 1</span>
            <strong>
              <PlusIcon size={16} /> Post a job
            </strong>
            <p>Add the details and publish. The job appears on the job board right away.</p>
          </Link>
          <Link href="/recruiter/jobs" className="guide-card">
            <span className="n">STEP 2</span>
            <strong>
              <UsersIcon size={16} /> Open “View applicants”
            </strong>
            <p>From My Jobs, see everyone who applied, with the date and their cover note.</p>
          </Link>
          <div className="guide-card">
            <span className="n">STEP 3</span>
            <strong>
              <FileIcon size={16} /> Read the resume
            </strong>
            <p>“View resume” opens the candidate’s PDF in a new tab. Only you can see it.</p>
          </div>
          <div className="guide-card">
            <span className="n">STEP 4</span>
            <strong>
              <EyeIcon size={16} /> Set the status
            </strong>
            <p>Move them to Shortlisted, Interview, Offered or Rejected. Each change is logged and the candidate is notified.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
