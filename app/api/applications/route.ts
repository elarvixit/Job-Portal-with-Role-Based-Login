import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';
import { applyBlocker } from '@/lib/rules';

export const runtime = 'nodejs';

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Apply to a job. Every rule is enforced here on the server, whatever the page shows:
// candidates only, open job, before the deadline, completed profile with a resume, once per job.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Please log in to apply.');
  if (user.role !== 'candidate') return fail(403, 'Recruiters cannot apply to jobs.');

  const body = (await req.json().catch(() => ({}))) as { jobId?: string; coverNote?: string };
  const jobId = String(body.jobId ?? '');
  const coverNote = String(body.coverNote ?? '').trim();

  const [job, profile, existing] = await Promise.all([
    repo.getJob(jobId),
    repo.getProfile(user.id),
    repo.findApplication(jobId, user.id),
  ]);
  if (!job) return fail(404, 'This job no longer exists.');
  const blocked = applyBlocker(job);
  if (blocked) return fail(400, blocked);
  if (existing) return fail(409, 'You have already applied to this job.');
  if (!profile?.resumePath) return fail(400, 'Upload your resume on your profile before applying.');
  if (!profile.phone || !profile.skills.length) return fail(400, 'Complete your profile (phone and skills) before applying.');
  if (coverNote.length < 20) return fail(400, 'Please write a cover note of at least 20 characters.');
  if (coverNote.length > 2000) return fail(400, 'Cover note must be 2,000 characters or fewer.');

  // The application keeps its own copy of the resume, so later profile changes don't alter it.
  const applicationId = repo.newId('app');
  const resumePath = `${user.id}/${applicationId}.pdf`;
  await repo.copyResume(profile.resumePath, resumePath);

  const outcome = await repo.createApplication({
    app: {
      id: applicationId,
      jobId: job.id,
      candidateId: user.id,
      coverNote,
      resumePath,
      resumeName: profile.resumeName ?? 'resume.pdf',
      status: 'applied',
      createdAt: '',
      updatedAt: '',
    },
    candidate: user,
    job,
  });
  if (outcome === 'duplicate') {
    await repo.removeResumes([resumePath]);
    return fail(409, 'You have already applied to this job.');
  }

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, id: applicationId });
}
