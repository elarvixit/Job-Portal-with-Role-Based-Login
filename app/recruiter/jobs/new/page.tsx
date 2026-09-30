import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listJobsByRecruiter } from '@/lib/repo';
import JobForm from '@/components/JobForm';
import { ArrowLeft } from '@/components/icons';

export const metadata: Metadata = { title: 'Post a Job' };

export default async function NewJobPage() {
  const user = await requireRole('recruiter');
  const [last] = await listJobsByRecruiter(user.id);

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
          skills: [],
          deadline: '',
          status: 'open',
        }}
      />
    </div>
  );
}
