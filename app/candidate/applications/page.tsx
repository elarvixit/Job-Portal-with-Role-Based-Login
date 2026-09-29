import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listApplicationsByCandidate } from '@/lib/repo';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/types';
import ApplicationsTable, { type Row } from '@/components/ApplicationsTable';
import { EmptyState, statusLabel } from '@/components/ui';
import { InboxIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'My Applications' };

export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireRole('candidate');
  const { status } = await searchParams;
  const filter = APPLICATION_STATUSES.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : null;
  const all: Row[] = await listApplicationsByCandidate(user.id);
  const rows = filter ? all.filter((r) => r.app.status === filter) : all;

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Candidate</div>
          <h1>My Applications</h1>
          <p>Track every role you’ve applied to and where it stands.</p>
        </div>
        <Link href="/" className="btn btn-primary">
          Browse jobs
        </Link>
      </div>

      <div className="card table-card">
        {all.length > 0 && (
          <div className="toolbar" aria-label="Filter by status">
            <Link href="/candidate/applications" className={`tab${!filter ? ' active' : ''}`}>
              All <span className="count">{all.length}</span>
            </Link>
            {APPLICATION_STATUSES.map((s) => {
              const n = all.filter((r) => r.app.status === s).length;
              return (
                <Link key={s} href={`/candidate/applications?status=${s}`} className={`tab${filter === s ? ' active' : ''}`}>
                  {statusLabel(s)} <span className="count">{n}</span>
                </Link>
              );
            })}
          </div>
        )}

        {rows.length ? (
          <ApplicationsTable rows={rows} />
        ) : (
          <div style={{ padding: 20 }}>
            <EmptyState
              icon={<InboxIcon size={22} />}
              title={filter ? `No ${statusLabel(filter).toLowerCase()} applications` : 'No applications yet'}
              action={
                <Link href={filter ? '/candidate/applications' : '/'} className="btn btn-primary">
                  {filter ? 'Show all applications' : 'Find a job'}
                </Link>
              }
            >
              {filter
                ? 'Nothing in this stage right now.'
                : 'Start applying to roles and you’ll be able to follow their progress here.'}
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
