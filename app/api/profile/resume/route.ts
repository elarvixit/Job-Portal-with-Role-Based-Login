import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';
import { RESUME_MAX_BYTES } from '@/lib/types';

export const runtime = 'nodejs';

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function requireCandidate() {
  const user = await getCurrentUser();
  if (!user) return { error: fail(401, 'Please log in first.') };
  if (user.role !== 'candidate') return { error: fail(403, 'Only candidates have a resume.') };
  return { user };
}

/** Upload or replace the candidate's resume: PDF only, 2 MB max, checked on the server. */
export async function POST(req: Request) {
  const { user, error } = await requireCandidate();
  if (error) return error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, 'Could not read the upload. Please try again.');
  }
  const file = form.get('resume');
  if (!(file instanceof File) || file.size === 0) return fail(400, 'Choose a PDF file to upload.');
  if (file.size > RESUME_MAX_BYTES) return fail(413, 'Your resume must be 2 MB or smaller.');
  const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksPdf) return fail(415, 'Only PDF files are accepted.');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return fail(415, 'That file is not a valid PDF.');

  // A new file name for every upload, so an old signed link never shows the new file.
  const path = `${user.id}/profile_${randomBytes(4).toString('hex')}.pdf`;
  const name = file.name.replace(/[^\w.\- ()]+/g, '_').slice(0, 120) || 'resume.pdf';
  await repo.uploadResume(path, bytes);
  const previous = await repo.setProfileResume(user.id, { path, name, size: bytes.length });
  if (previous) await repo.removeResumes([previous]);

  revalidatePath('/candidate', 'layout');
  return NextResponse.json({ ok: true, name, size: bytes.length });
}

/** Remove the resume from the profile. Applications already sent keep their own copy. */
export async function DELETE() {
  const { user, error } = await requireCandidate();
  if (error) return error;
  const previous = await repo.setProfileResume(user.id, null);
  if (previous) await repo.removeResumes([previous]);
  revalidatePath('/candidate', 'layout');
  return NextResponse.json({ ok: true });
}

/** Open your own profile resume. */
export async function GET(req: Request) {
  const { user, error } = await requireCandidate();
  if (error) return NextResponse.redirect(new URL('/403', req.url));
  const profile = await repo.getProfile(user.id);
  if (!profile?.resumePath) return NextResponse.redirect(new URL('/candidate/profile', req.url));
  const source = await repo.openResume(profile.resumePath);
  if (!source) return NextResponse.redirect(new URL('/candidate/profile', req.url));
  if ('redirect' in source) return NextResponse.redirect(source.redirect, { headers: { 'Cache-Control': 'private, no-store' } });
  return new NextResponse(new Uint8Array(source.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${(profile.resumeName ?? 'resume.pdf').replace(/[^\w.\- ]+/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
