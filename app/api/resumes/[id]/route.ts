import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readDb, readUpload } from '@/lib/db';

export const runtime = 'nodejs';

// Streams a resume PDF. Only the recruiter who owns the job, or the candidate who applied, may view it.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', _req.url));

  const db = await readDb();
  const app = db.applications.find((a) => a.id === id);
  if (!app) return NextResponse.redirect(new URL('/not-found', _req.url));

  const job = db.jobs.find((j) => j.id === app.jobId);
  const allowed =
    (user.role === 'candidate' && app.candidateId === user.id) ||
    (user.role === 'recruiter' && job?.recruiterId === user.id);
  if (!allowed) return NextResponse.redirect(new URL('/403', _req.url));

  const file = await readUpload(app.resumeFile);
  if (!file) return NextResponse.redirect(new URL('/not-found', _req.url));

  const safeName = app.resumeName.replace(/[^\w.\- ]+/g, '_');
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
