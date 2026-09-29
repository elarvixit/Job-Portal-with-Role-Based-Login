import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';

export const runtime = 'nodejs';

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Step 1 of applying: check eligibility, then hand the browser a one-time signed URL so the
// resume uploads straight to Supabase Storage (this avoids Vercel's 4.5 MB request limit).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Please log in to apply.');
  if (user.role !== 'candidate') return fail(403, 'Recruiters cannot apply to jobs.');

  const { jobId } = (await req.json().catch(() => ({}))) as { jobId?: string };
  const job = jobId ? await repo.getJob(jobId) : null;
  if (!job) return fail(404, 'This job no longer exists.');
  if (job.status !== 'open') return fail(400, 'This job is no longer accepting applications.');
  if (await repo.findApplication(job.id, user.id)) return fail(409, 'You have already applied to this job.');

  const applicationId = repo.newId('app');
  const path = `${user.id}/${applicationId}.pdf`;
  const { token } = await repo.createResumeUploadUrl(path);

  return NextResponse.json({ ok: true, applicationId, path, token, local: repo.storageMode === 'local' });
}
