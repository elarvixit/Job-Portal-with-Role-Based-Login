import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { mutate, newId, readDb, saveUpload } from '@/lib/db';
import type { Application } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Please log in to apply.');
  if (user.role !== 'candidate') return fail(403, 'Recruiters cannot apply to jobs.');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'Could not read the submitted form.');
  }

  const jobId = String(form.get('jobId') ?? '');
  const coverNote = String(form.get('coverNote') ?? '').trim();
  const resume = form.get('resume');

  const db = await readDb();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return fail(404, 'This job no longer exists.');
  if (job.status !== 'open') return fail(400, 'This job is no longer accepting applications.');
  if (db.applications.some((a) => a.jobId === jobId && a.candidateId === user.id)) {
    return fail(409, 'You have already applied to this job.');
  }

  if (coverNote.length < 20) return fail(400, 'Please write a cover note of at least 20 characters.');
  if (coverNote.length > 2000) return fail(400, 'Cover note must be 2,000 characters or fewer.');

  if (!(resume instanceof File) || resume.size === 0) return fail(400, 'Please attach your resume as a PDF.');
  if (resume.size > MAX_BYTES) return fail(400, 'Resume must be 5 MB or smaller.');
  const looksPdf = resume.type === 'application/pdf' || resume.name.toLowerCase().endsWith('.pdf');
  if (!looksPdf) return fail(400, 'Only PDF files are accepted.');

  const bytes = Buffer.from(await resume.arrayBuffer());
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return fail(400, 'That file is not a valid PDF.');

  const id = newId('app');
  const fileName = `${id}.pdf`;
  await saveUpload(fileName, bytes);

  const now = new Date().toISOString();
  const created = await mutate((d) => {
    if (d.applications.some((a) => a.jobId === jobId && a.candidateId === user.id)) return null;
    const application: Application = {
      id,
      jobId,
      candidateId: user.id,
      coverNote,
      resumeFile: fileName,
      resumeName: resume.name.slice(0, 120),
      status: 'applied',
      createdAt: now,
      updatedAt: now,
    };
    d.applications.push(application);
    return application;
  });
  if (!created) return fail(409, 'You have already applied to this job.');

  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, id: created.id });
}
