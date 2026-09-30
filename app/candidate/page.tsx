import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listApplicationsByCandidate, listOpenJobs } from '@/lib/repo';
import type { Job } from '@/lib/types';
import ApplicationsTable, { type Row } from '@/components/ApplicationsTable';
import { CountUp, EmptyState, JobCard, STATUS_HELP, StatusBadge } from '@/components/ui';
import { ArrowRight, ClockIcon, CompassIcon, InboxIcon, StarIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function CandidateDashboard() {
  const user = await requireRole('candidate');
  const [rows, openJobs]: [Row[], Job[]] = await Promise.all([listApplicationsByCandidate(user.id), listOpenJobs()]);

  const inReview = rows.filter((r) => r.app.status === 'reviewing').length;
  const shortlisted = rows.filter((r) => r.app.status === 'shortlisted' || r.app.status === 'hired').length;
  const appliedIds = new Set(rows.map((r) => r.job.id));
  const suggestions = openJobs.filter((j) => !appliedIds.has(j.id)).slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Candidate dashboard</div>
          <h1>
            {greeting}, <span className="serif">{user.name.split(' ')[0]}</span>
          </h1>
          <p>Here’s how your job search is going.</p>
        </div>
        <Link href="/" className="btn btn-primary">
          <CompassIcon size={17} /> Browse jobs
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat featured">
          <div className="top">
            <span className="k">Applications sent</span>
            <span className="ico ico-glass">
              <InboxIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={rows.length} />
          </div>
          <div className="foot">Across {new Set(rows.map((r) => r.job.company)).size} companies</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="k">In review</span>
            <span className="ico ico-warning">
              <ClockIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={inReview} />
          </div>
          <div className="foot">Recruiters are looking</div>
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
          <div className="foot">Nice work — keep going</div>
        </div>
      </div>

      <div className="card table-card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <h2>Recent applications</h2>
          {rows.length > 0 && (
            <Link href="/candidate/applications" className="btn btn-ghost btn-sm">
              View all <ArrowRight size={15} />
            </Link>
          )}
        </div>
        {rows.length ? (
          <ApplicationsTable rows={rows.slice(0, 5)} />
        ) : (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<InboxIcon size={22} />}
              title="No applications yet"
              action={
                <Link href="/" className="btn btn-primary">
                  Find your first role
                </Link>
              }
            >
              When you apply for a job, it will show up here so you can track its progress.
            </EmptyState>
          </div>
        )}
      </div>

      <section className="card guide" data-reveal aria-labelledby="status-guide">
        <div className="card-head">
          <h2 id="status-guide">What your application status means</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Recruiters update this — you’ll see changes here and in My Applications.
          </span>
        </div>
        <div className="guide-grid">
          {(['applied', 'reviewing', 'shortlisted', 'hired', 'rejected'] as const).map((s, i) => (
            <div key={s} className="guide-card">
              <span className="n">{s === 'rejected' ? 'OR' : `STEP ${i + 1}`}</span>
              <strong>
                <StatusBadge status={s} />
              </strong>
              <p>{STATUS_HELP[s]}</p>
            </div>
          ))}
        </div>
      </section>

      {suggestions.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: 22 }}>Recommended for you</h2>
              <p>Fresh openings you haven’t applied to yet.</p>
            </div>
            <Link href="/" className="btn btn-ghost btn-sm">
              See all jobs <ArrowRight size={15} />
            </Link>
          </div>
          <div className="job-grid">
            {suggestions.map((j, i) => (
              <JobCard key={j.id} job={j} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
