import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getJob, listApplicationsForJobs, listStatusHistory } from '@/lib/repo';
import { formatDate, initials, timeAgo } from '@/lib/format';
import { matchScore, STATUS_LABEL } from '@/lib/rules';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/types';
import StatusSelect from '@/components/StatusSelect';
import { DeadlineChip, EmptyState, MatchScore, SkillTags, StatusBadge, statusLabel } from '@/components/ui';
import { ArrowLeft, BriefcaseIcon, BulbIcon, EditIcon, FileIcon, HistoryIcon, InboxIcon, PhoneIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Applicants' };

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const user = await requireRole('recruiter');
  const [{ id }, { status, sort }] = await Promise.all([params, searchParams]);
  const job = await getJob(id);
  if (!job) notFound();
  // A recruiter can only see applicants for their own jobs.
  if (job.recruiterId !== user.id) redirect('/403');

  const filter = APPLICATION_STATUSES.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : null;
  const byMatch = sort === 'match';
  const all = await listApplicationsForJobs([job.id]);
  const history = await listStatusHistory(all.map((r) => r.app.id));
  const scored = all.map((r) => ({ ...r, match: matchScore(job.skills, r.profile?.skills ?? []) }));
  const rows = (filter ? scored.filter((r) => r.app.status === filter) : scored).sort((a, b) =>
    byMatch ? (b.match?.percent ?? 0) - (a.match?.percent ?? 0) : 0,
  );
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { status: filter, sort: byMatch ? 'match' : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const str = p.toString();
    return `/recruiter/jobs/${job.id}/applications${str ? `?${str}` : ''}`;
  };

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
          <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              {all.length} {all.length === 1 ? 'applicant' : 'applicants'} · {job.location} · {job.type}
            </span>
            <DeadlineChip job={job} />
          </p>
          {job.skills.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <SkillTags skills={job.skills} />
            </div>
          )}
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
            <strong>Match</strong> compares each candidate’s skills with this job’s required skills. Open{' '}
            <strong>View resume</strong> to read their PDF, then change the <strong>Status</strong>. Every change is saved
            with a timestamp under <em>History</em>, and the candidate is notified.
          </span>
        </p>
      )}

      <div className="card table-card">
        {all.length > 0 && (
          <div className="toolbar" aria-label="Filter and sort applicants" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={qs({ status: null })} className={`tab${!filter ? ' active' : ''}`}>
                All <span className="count">{all.length}</span>
              </Link>
              {APPLICATION_STATUSES.map((s) => (
                <Link key={s} href={qs({ status: s })} className={`tab${filter === s ? ' active' : ''}`}>
                  {statusLabel(s)} <span className="count">{all.filter((r) => r.app.status === s).length}</span>
                </Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={qs({ sort: null })} className={`tab${!byMatch ? ' active' : ''}`}>
                Newest
              </Link>
              <Link href={qs({ sort: 'match' })} className={`tab${byMatch ? ' active' : ''}`}>
                Best match
              </Link>
            </div>
          </div>
        )}

        {rows.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Skills &amp; match</th>
                  <th>Applied</th>
                  <th>Cover note</th>
                  <th>Resume</th>
                  <th>Status &amp; history</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ app, candidate, profile, match }) => {
                  const log = history.get(app.id) ?? [];
                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="title-cell" style={{ minWidth: 210, alignItems: 'flex-start' }}>
                          <span className="avatar lg">{initials(candidate?.name ?? '?')}</span>
                          <div>
                            <div className="t">{candidate?.name ?? 'Deleted user'}</div>
                            <div className="s">{candidate?.email}</div>
                            <div className="cand-meta">
                              {profile?.phone && (
                                <span>
                                  <PhoneIcon size={13} /> {profile.phone}
                                </span>
                              )}
                              {profile && (
                                <span>
                                  <BriefcaseIcon size={13} /> {profile.yearsExperience}{' '}
                                  {profile.yearsExperience === 1 ? 'year' : 'years'} experience
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        {match ? (
                          <MatchScore
                            percent={match.percent}
                            title={`${match.matched.length} of ${job.skills.length} required skills${match.missing.length ? ` · missing ${match.missing.join(', ')}` : ''}`}
                          />
                        ) : (
                          <span className="s">No required skills set</span>
                        )}
                        {profile?.skills.length ? (
                          <div style={{ marginTop: 8 }}>
                            <SkillTags skills={profile.skills} have={job.skills} max={5} />
                          </div>
                        ) : null}
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
                      <td style={{ minWidth: 230 }}>
                        <StatusSelect applicationId={app.id} initial={app.status} candidateName={candidate?.name ?? 'candidate'} />
                        <details className="history">
                          <summary>
                            <HistoryIcon size={13} /> History ({log.length})
                          </summary>
                          <ol className="timeline">
                            {log.map((h) => (
                              <li key={h.id}>
                                {h.fromStatus ? (
                                  <>
                                    {STATUS_LABEL[h.fromStatus]} → <strong>{STATUS_LABEL[h.toStatus]}</strong>
                                  </>
                                ) : (
                                  <strong>Applied</strong>
                                )}
                                <time dateTime={h.changedAt}>
                                  {stamp(h.changedAt)}
                                  {h.changedBy === user.id ? ' · by you' : h.changedBy === app.candidateId ? ' · by candidate' : ''}
                                </time>
                              </li>
                            ))}
                          </ol>
                        </details>
                      </td>
                    </tr>
                  );
                })}
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
                  <Link href={qs({ status: null })} className="btn btn-secondary">
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
