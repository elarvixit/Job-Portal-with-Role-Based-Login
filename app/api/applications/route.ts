import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ID_RE = /^app_[a-f0-9]{12}$/;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Step 2 of applying: the resume is already in Storage; verify it and record the application.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Please log in to apply.');
  if (user.role !== 'candidate') return fail(403, 'Recruiters cannot apply to jobs.');

  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    applicationId?: string;
    coverNote?: string;
    resumeName?: string;
  };
  const jobId = String(body.jobId ?? '');
  const applicationId = String(body.applicationId ?? '');
  const coverNote = String(body.coverNote ?? '').trim();
  const resumeName = String(body.resumeName ?? 'resume.pdf').slice(0, 120) || 'resume.pdf';

  if (!ID_RE.test(applicationId)) return fail(400, 'Invalid upload. Please try again.');
  // The path is derived server-side, so a candidate can only ever attach a file from their own folder.
  const path = `${user.id}/${applicationId}.pdf`;

  const reject = async (status: number, error: string) => {
    await repo.removeResume(path);
    return fail(status, error);
  };

  const job = await repo.getJob(jobId);
  if (!job) return reject(404, 'This job no longer exists.');
  if (job.status !== 'open') return reject(400, 'This job is no longer accepting applications.');
  if (coverNote.length < 20) return reject(400, 'Please write a cover note of at least 20 characters.');
  if (coverNote.length > 2000) return reject(400, 'Cover note must be 2,000 characters or fewer.');

  const file = await repo.downloadResume(path);
  if (!file) return fail(400, 'Your resume did not finish uploading. Please try again.');
  if (file.length > MAX_BYTES) return reject(400, 'Resume must be 5 MB or smaller.');
  if (file.subarray(0, 5).toString('latin1') !== '%PDF-') return reject(400, 'That file is not a valid PDF.');

  const outcome = await repo.createApplication({
    id: applicationId,
    jobId: job.id,
    candidateId: user.id,
    coverNote,
    resumePath: path,
    resumeName,
    status: 'applied',
    createdAt: '',
    updatedAt: '',
  });
  if (outcome === 'duplicate') return reject(409, 'You have already applied to this job.');

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, id: applicationId });
}
