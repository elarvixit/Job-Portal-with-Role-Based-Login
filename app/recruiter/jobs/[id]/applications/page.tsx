import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getJob, listApplicationsForJobs } from '@/lib/repo';
import { formatDate, initials, timeAgo } from '@/lib/format';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/types';
import StatusSelect from '@/components/StatusSelect';
import { EmptyState, StatusBadge, statusLabel } from '@/components/ui';
import { ArrowLeft, BulbIcon, EditIcon, FileIcon, InboxIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Applicants' };

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole('recruiter');
  const [{ id }, { status }] = await Promise.all([params, searchParams]);
  const job = await getJob(id);
  if (!job) notFound();
  if (job.recruiterId !== user.id) redirect('/403');

  const filter = APPLICATION_STATUSES.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : null;
  const all = await listApplicationsForJobs([job.id]);
  const rows = filter ? all.filter((r) => r.app.status === filter) : all;

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <Link href="/recruiter/jobs" className="breadcrumb" style={{ marginBottom: 14 }}>
            <ArrowLeft size={15} /> My Jobs
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {job.title} <StatusBadge status={job.status} />
          </h1>
          <p>
            {all.length} {all.length === 1 ? 'applicant' : 'applicants'} · {job.location} · {job.type}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/jobs/${job.id}`} className="btn btn-ghost">
            View listing
          </Link>
          <Link href={`/recruiter/jobs/${job.id}/edit`} className="btn btn-secondary">
            <EditIcon size={16} /> Edit job
          </Link>
        </div>
      </div>

      {all.length > 0 && (
        <p className="hint">
          <BulbIcon size={17} />
          <span>
            Click <strong>View resume</strong> to open a candidate’s PDF, and click the cover note to read all of it.
            Then change the <strong>Status</strong> — it saves instantly and the candidate sees it in their{' '}
            <em>My Applications</em> page.
          </span>
        </p>
      )}

      <div className="card table-card">
        {all.length > 0 && (
          <div className="toolbar" aria-label="Filter by status">
            <Link href={`/recruiter/jobs/${job.id}/applications`} className={`tab${!filter ? ' active' : ''}`}>
              All <span className="count">{all.length}</span>
            </Link>
            {APPLICATION_STATUSES.map((s) => (
              <Link
                key={s}
                href={`/recruiter/jobs/${job.id}/applications?status=${s}`}
                className={`tab${filter === s ? ' active' : ''}`}
              >
                {statusLabel(s)} <span className="count">{all.filter((r) => r.app.status === s).length}</span>
              </Link>
            ))}
          </div>
        )}

        {rows.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Applied</th>
                  <th>Cover note</th>
                  <th>Resume</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ app, candidate }) => (
                  <tr key={app.id}>
                    <td>
                      <div className="title-cell" style={{ minWidth: 200 }}>
                        <span className="avatar lg">{initials(candidate?.name ?? '?')}</span>
                        <div>
                          <div className="t">{candidate?.name ?? 'Deleted user'}</div>
                          <div className="s">{candidate?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="num">{formatDate(app.createdAt)}</div>
                      <div className="s">{timeAgo(app.createdAt)}</div>
                    </td>
                    <td>
                      <details className="cover-note">
                        <summary>{app.coverNote}</summary>
                        {app.coverNote.length > 90 && <span className="more">Show less</span>}
                      </details>
                    </td>
                    <td>
                      <a
                        href={`/api/resumes/${app.id}`}
                        target="_blank"
                        rel="noopener"
                        className="btn btn-secondary btn-sm"
                        title={app.resumeName}
                      >
                        <FileIcon size={15} /> View resume
                      </a>
                    </td>
                    <td>
                      <StatusSelect
                        applicationId={app.id}
                        initial={app.status}
                        candidateName={candidate?.name ?? 'candidate'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<InboxIcon size={22} />}
              title={filter ? `No ${statusLabel(filter).toLowerCase()} applicants` : 'No applicants yet'}
              action={
                filter ? (
                  <Link href={`/recruiter/jobs/${job.id}/applications`} className="btn btn-secondary">
                    Show all applicants
                  </Link>
                ) : undefined
              }
            >
              {filter
                ? 'No one is in this stage right now.'
                : job.status === 'open'
                  ? 'Applications will appear here as candidates apply.'
                  : 'This job is closed. Reopen it from My Jobs to start receiving applications.'}
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
