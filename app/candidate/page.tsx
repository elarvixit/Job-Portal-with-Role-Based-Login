import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getProfile, listApplicationsByCandidate, listOpenJobs } from '@/lib/repo';
import { applyBlocker, matchScore, profileChecklist } from '@/lib/rules';
import ApplicationsTable from '@/components/ApplicationsTable';
import { CountUp, EmptyState, JobCard, STATUS_HELP, StatusBadge } from '@/components/ui';
import { ArrowRight, CompassIcon, InboxIcon, StarIcon, UserIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function CandidateDashboard() {
  const user = await requireRole('candidate');
  const [rows, openJobs, profile] = await Promise.all([
    listApplicationsByCandidate(user.id),
    listOpenJobs(),
    getProfile(user.id),
  ]);

  const inProgress = rows.filter((r) => r.app.status === 'shortlisted' || r.app.status === 'interview').length;
  const offers = rows.filter((r) => r.app.status === 'offered').length;
  const checklist = profileChecklist(profile);

  // Recommend open jobs you haven't applied to, best skill match first.
  const appliedIds = new Set(rows.map((r) => r.job.id));
  const suggestions = openJobs
    .filter((j) => !appliedIds.has(j.id) && !applyBlocker(j))
    .map((j) => ({ job: j, score: matchScore(j.skills, profile?.skills ?? [])?.percent ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

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

      {!checklist.complete && (
        <div className="hint" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <UserIcon size={17} />
            <span>
              <strong>Your profile is {checklist.percent}% complete.</strong> Add{' '}
              {checklist.items
                .filter((i) => !i.done)
                .map((i) => i.label.toLowerCase())
                .join(', ')}{' '}
              before you apply.
            </span>
          </span>
          <Link href="/candidate/profile" className="btn btn-primary btn-sm">
            Complete profile
          </Link>
        </div>
      )}

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
            <span className="k">Shortlisted or interviewing</span>
            <span className="ico ico-violet">
              <StarIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={inProgress} />
          </div>
          <div className="foot">Recruiters want to know more</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="k">Offers</span>
            <span className="ico ico-success">
              <StarIcon size={18} />
            </span>
          </div>
          <div className="v">
            <CountUp value={offers} />
          </div>
          <div className="foot">{offers ? 'Congratulations!' : 'Keep going — it’s coming'}</div>
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
            Recruiters update this, and you get a notification each time.
          </span>
        </div>
        <div className="guide-grid">
          {(['applied', 'shortlisted', 'interview', 'offered', 'rejected'] as const).map((s, i) => (
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
              <p>Open jobs that match your skills best, that you haven’t applied to yet.</p>
            </div>
            <Link href="/" className="btn btn-ghost btn-sm">
              See all jobs <ArrowRight size={15} />
            </Link>
          </div>
          <div className="job-grid">
            {suggestions.map(({ job }, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
