import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getJob } from '@/lib/repo';
import JobForm from '@/components/JobForm';
import { StatusBadge } from '@/components/ui';
import { ArrowLeft } from '@/components/icons';

export const metadata: Metadata = { title: 'Edit job' };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole('recruiter');
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  if (job.recruiterId !== user.id) redirect('/403');

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <Link href="/recruiter/jobs" className="breadcrumb" style={{ marginBottom: 14 }}>
            <ArrowLeft size={15} /> My Jobs
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            Edit job <StatusBadge status={job.status} />
          </h1>
          <p>{job.title}</p>
        </div>
        <Link href={`/recruiter/jobs/${job.id}/applications`} className="btn btn-secondary">
          View applicants
        </Link>
      </div>
      <JobForm
        job={job}
        defaults={{
          title: job.title,
          company: job.company,
          description: job.description,
          location: job.location,
          type: job.type,
          salary: job.salary,
          skills: job.skills,
          deadline: job.deadline ?? '',
          status: job.status,
        }}
      />
    </div>
  );
}
