import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { readDb } from '@/lib/db';
import JobForm from '@/components/JobForm';
import { ArrowLeft } from '@/components/icons';

export const metadata: Metadata = { title: 'Post a Job' };

export default async function NewJobPage() {
  const user = await requireRole('recruiter');
  const db = await readDb();
  const last = db.jobs.filter((j) => j.recruiterId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <Link href="/recruiter/jobs" className="breadcrumb" style={{ marginBottom: 14 }}>
            <ArrowLeft size={15} /> My Jobs
          </Link>
          <h1>Post a new job</h1>
          <p>Fill in the details below. You can edit or close the listing at any time.</p>
        </div>
      </div>
      <JobForm
        defaults={{
          title: '',
          company: last?.company ?? '',
          description: '',
          location: '',
          type: 'Full-time',
          salary: '',
          status: 'open',
        }}
      />
    </div>
  );
}
