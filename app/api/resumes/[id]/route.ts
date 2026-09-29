import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';

export const runtime = 'nodejs';

// Opens a resume. Only the recruiter who owns the job, or the candidate who applied, may view it.
// Resumes live in a private bucket; authorised viewers are redirected to a 60-second signed link.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const found = await repo.getApplicationWithOwner(id);
  if (!found) return NextResponse.redirect(new URL('/not-found', req.url));

  const allowed =
    (user.role === 'candidate' && found.app.candidateId === user.id) ||
    (user.role === 'recruiter' && found.recruiterId === user.id);
  if (!allowed) return NextResponse.redirect(new URL('/403', req.url));

  const url = await repo.resumeSignedUrl(found.app.resumePath);
  if (!url) return NextResponse.redirect(new URL('/not-found', req.url));

  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'private, no-store' } });
}
