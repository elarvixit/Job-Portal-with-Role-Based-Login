import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { Application, Job } from '@/lib/types';
import { CompanyLogo, StatusBadge } from './ui';
import { FileIcon } from './icons';

export type Row = { app: Application; job: Job };

export default function ApplicationsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Job title</th>
            <th>Date applied</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Resume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ app, job }) => (
            <tr key={app.id}>
              <td>
                <div className="title-cell">
                  <CompanyLogo name={job.company} />
                  <div>
                    <Link href={`/jobs/${job.id}`} className="t">
                      {job.title}
                    </Link>
                    <div className="s">
                      {job.company} · {job.location}
                    </div>
                  </div>
                </div>
              </td>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>
                {formatDate(app.createdAt)}
              </td>
              <td>
                <StatusBadge status={app.status} />
              </td>
              <td>
                <div className="actions">
                  <a href={`/api/resumes/${app.id}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
                    <FileIcon size={15} /> View
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
