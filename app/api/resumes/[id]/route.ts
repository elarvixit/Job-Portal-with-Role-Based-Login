import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';

export const runtime = 'nodejs';

// Opens a resume. Only the recruiter who owns the job, or the candidate who applied, may view it.
// With Supabase, authorised viewers are redirected to a 60-second signed link to the private bucket;
// in local mode the file is streamed from disk.
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

  const source = await repo.openResume(found.app.resumePath);
  if (!source) return NextResponse.redirect(new URL('/not-found', req.url));

  if ('redirect' in source) {
    return NextResponse.redirect(source.redirect, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const safeName = found.app.resumeName.replace(/[^\w.\- ]+/g, '_');
  return new NextResponse(new Uint8Array(source.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
