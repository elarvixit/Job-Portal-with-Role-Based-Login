import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import * as repo from '@/lib/repo';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ID_RE = /^app_[a-f0-9]{12}$/;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Local mode stand-in for the Supabase signed upload: the browser PUTs the raw PDF here.
export async function PUT(req: Request) {
  if (repo.storageMode !== 'local') return fail(404, 'Not found.');

  const user = await getCurrentUser();
  if (!user) return fail(401, 'Please log in to apply.');
  if (user.role !== 'candidate') return fail(403, 'Recruiters cannot apply to jobs.');

  const applicationId = new URL(req.url).searchParams.get('applicationId') ?? '';
  if (!ID_RE.test(applicationId)) return fail(400, 'Invalid upload.');

  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) return fail(400, 'Please attach your resume as a PDF.');
  if (data.length > MAX_BYTES) return fail(400, 'Resume must be 5 MB or smaller.');

  await repo.saveLocalResume(`${user.id}/${applicationId}.pdf`, data);
  return NextResponse.json({ ok: true });
}
