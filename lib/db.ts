import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import type { Database } from './types';
import { buildSeed } from './seed';

// A tiny JSON-file database. Good enough for a demo / single-instance deployment;
// swap for Postgres/Prisma in production.
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const g = globalThis as unknown as { __hlSeeding?: Promise<void>; __hlQueue?: Promise<unknown> };

async function ensureSeeded(): Promise<void> {
  try {
    await fs.access(DB_FILE);
    return;
  } catch {
    /* not found: seed */
  }
  if (!g.__hlSeeding) {
    g.__hlSeeding = (async () => {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      const { db, files } = buildSeed();
      for (const f of files) await fs.writeFile(path.join(UPLOAD_DIR, f.name), f.data);
      await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    })().finally(() => {
      g.__hlSeeding = undefined;
    });
  }
  await g.__hlSeeding;
}

export async function readDb(): Promise<Database> {
  await ensureSeeded();
  if (g.__hlQueue) await g.__hlQueue.catch(() => {});
  return JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Database;
}

/** Serialises writes so concurrent requests can't clobber each other. */
export function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const prev = g.__hlQueue ?? Promise.resolve();
  const run = prev
    .catch(() => {})
    .then(async () => {
      await ensureSeeded();
      const db = JSON.parse(await fs.readFile(DB_FILE, 'utf8')) as Database;
      const result = await fn(db);
      const tmp = `${DB_FILE}.${randomBytes(4).toString('hex')}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2));
      await fs.rename(tmp, DB_FILE);
      return result;
    });
  g.__hlQueue = run.catch(() => {});
  return run;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

export async function saveUpload(name: string, data: Buffer): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
}

export async function readUpload(name: string): Promise<Buffer | null> {
  // Guard against path traversal: only allow simple file names.
  if (!/^[a-z0-9_]+\.pdf$/i.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
