// Loads the demo data into Supabase.
//   npm run db:seed    → seeds only if the database is empty
//   npm run db:reset   → deletes ALL users, jobs, applications and resumes, then re-seeds
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local (or the environment).
import { createClient } from '@supabase/supabase-js';
import { buildSeed } from '../lib/seed';
import { RESUME_BUCKET, TABLES } from '../lib/tables';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* fall back to the existing environment */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local first.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = RESUME_BUCKET;
const reset = process.argv.includes('--reset');

function check(label: string, error: { message: string } | null) {
  if (error) {
    console.error(`✗ ${label}: ${error.message}`);
    if (/relation .* does not exist|schema cache/i.test(error.message)) {
      console.error('  → Run supabase/schema.sql in the Supabase SQL Editor first.');
    }
    process.exit(1);
  }
}

async function emptyBucket() {
  const { data: folders, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  check('list resumes', error);
  for (const folder of folders ?? []) {
    const { data: files } = await supabase.storage.from(BUCKET).list(folder.name, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${folder.name}/${f.name}`);
    if (paths.length) check('remove resumes', (await supabase.storage.from(BUCKET).remove(paths)).error);
  }
}

async function main() {
  const { count, error } = await supabase.from(TABLES.users).select('id', { count: 'exact', head: true });
  check('read users', error);

  if (count && !reset) {
    console.log(`Database already has ${count} users — nothing to do. Use "npm run db:reset" to start over.`);
    return;
  }

  if (reset) {
    console.log('Resetting: deleting all data…');
    // Deleting users cascades to their jobs and applications.
    check('delete users', (await supabase.from(TABLES.users).delete().neq('id', '')).error);
    await emptyBucket();
  }

  const { users, jobs, applications, files } = buildSeed();

  check(
    'insert users',
    (
      await supabase.from(TABLES.users).insert(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: u.passwordHash,
          role: u.role,
          created_at: u.createdAt,
        })),
      )
    ).error,
  );

  check(
    'insert jobs',
    (
      await supabase.from(TABLES.jobs).insert(
        jobs.map((j) => ({
          id: j.id,
          recruiter_id: j.recruiterId,
          title: j.title,
          company: j.company,
          description: j.description,
          location: j.location,
          type: j.type,
          salary: j.salary,
          status: j.status,
          created_at: j.createdAt,
          updated_at: j.updatedAt,
        })),
      )
    ).error,
  );

  for (const f of files) {
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(f.path, f.data, { contentType: 'application/pdf', upsert: true });
    check(`upload ${f.path}`, upErr);
  }

  check(
    'insert applications',
    (
      await supabase.from(TABLES.applications).insert(
        applications.map((a) => ({
          id: a.id,
          job_id: a.jobId,
          candidate_id: a.candidateId,
          cover_note: a.coverNote,
          resume_path: a.resumePath,
          resume_name: a.resumeName,
          status: a.status,
          created_at: a.createdAt,
          updated_at: a.updatedAt,
        })),
      )
    ).error,
  );

  console.log(
    `✓ Seeded ${users.length} users, ${jobs.length} jobs, ${applications.length} applications and ${files.length} resumes.`,
  );
  console.log('  Demo password for every account: password123');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
