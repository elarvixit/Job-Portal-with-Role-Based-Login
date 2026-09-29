import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readDb } from './db';
import { SESSION_COOKIE, dashboardFor, verifySession } from './session';
import type { PublicUser, Role } from './types';

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getSession();
  if (!session) return null;
  const db = await readDb();
  const user = db.users.find((u) => u.id === session.uid);
  if (!user) return null;
  const { passwordHash: _omit, ...pub } = user;
  return pub;
}

/** Ensures the visitor is logged in with the given role, otherwise redirects. */
export async function requireRole(role: Role): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect(dashboardFor(user.role));
  return user;
}
