import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserById } from './repo';
import { SESSION_COOKIE, dashboardFor, verifySession } from './session';
import type { PublicUser, Role } from './types';

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** The logged-in user, looked up once per request (layout and page share the result). */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session.uid);
});

/** Ensures the visitor is logged in with the given role, otherwise redirects. */
export async function requireRole(role: Role): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect(dashboardFor(user.role));
  return user;
}
