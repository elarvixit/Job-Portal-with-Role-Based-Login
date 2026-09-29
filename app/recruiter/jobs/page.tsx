import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listApplicationsForJobs, listJobsByRecruiter } from '@/lib/repo';
import { formatDate } from '@/lib/format';
import { toggleJobStatusAction } from '@/app/actions';
import { CompanyLogo, EmptyState, StatusBadge } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import Toast from '@/components/Toast';
import { BriefcaseIcon, EditIcon, PlusIcon, PowerIcon, UsersIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'My Jobs' };

export default async function MyJobsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireRole('recruiter');
  const { saved } = await searchParams;
  const mine = await listJobsByRecruiter(user.id);
  // Open jobs first, newest first within each group (the query already sorts by date).
  const jobs = [...mine.filter((j) => j.status === 'open'), ...mine.filter((j) => j.status === 'closed')];
  const apps = await listApplicationsForJobs(jobs.map((j) => j.id));
  const counts = new Map<string, { total: number; fresh: number }>();
  for (const { app: a } of apps) {
    const c = counts.get(a.jobId) ?? { total: 0, fresh: 0 };
    c.total++;
    if (a.status === 'applied') c.fresh++;
    counts.set(a.jobId, c);
  }

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Recruiter</div>
          <h1>My Jobs</h1>
          <p>
            {jobs.filter((j) => j.status === 'open').length} open · {jobs.filter((j) => j.status === 'closed').length}{' '}
            closed
          </p>
        </div>
        <Link href="/recruiter/jobs/new" className="btn btn-primary">
          <PlusIcon size={17} /> Post a job
        </Link>
      </div>

      {jobs.length ? (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Applicants</th>
                  <th>Posted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const c = counts.get(job.id) ?? { total: 0, fresh: 0 };
                  return (
                    <tr key={job.id}>
                      <td>
                        <div className="title-cell">
                          <CompanyLogo name={job.company} />
                          <div>
                            <Link href={`/jobs/${job.id}`} className="t">
                              {job.title}
                            </Link>
                            <div className="s">
                              {job.location} · {job.type} · {job.salary}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="num">
                        <strong>{c.total}</strong>
                        {c.fresh > 0 && <div className="s">{c.fresh} new</div>}
                      </td>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(job.createdAt)}
                      </td>
                      <td>
                        <div className="actions">
                          <Link href={`/recruiter/jobs/${job.id}/edit`} className="btn btn-ghost btn-sm">
                            <EditIcon size={15} /> Edit
                          </Link>
                          <form action={toggleJobStatusAction}>
                            <input type="hidden" name="id" value={job.id} />
                            <SubmitButton
                              className={`btn btn-sm ${job.status === 'open' ? 'btn-danger-ghost' : 'btn-success-ghost'}`}
                            >
                              <PowerIcon size={15} /> {job.status === 'open' ? 'Close' : 'Reopen'}
                            </SubmitButton>
                          </form>
                          <Link href={`/recruiter/jobs/${job.id}/applications`} className="btn btn-secondary btn-sm">
                            <UsersIcon size={15} /> View applicants
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<BriefcaseIcon size={22} />}
          title="You haven’t posted any jobs yet"
          action={
            <Link href="/recruiter/jobs/new" className="btn btn-primary">
              <PlusIcon size={17} /> Post your first job
            </Link>
          }
        >
          Create a listing and start receiving applications from qualified candidates.
        </EmptyState>
      )}

      {saved === 'created' && <Toast message="Job posted successfully" />}
      {saved === 'updated' && <Toast message="Job updated" />}
    </div>
  );
}
