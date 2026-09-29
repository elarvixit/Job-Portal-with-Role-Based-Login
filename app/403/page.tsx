import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { dashboardFor } from '@/lib/session';
import { ShieldIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Not authorized' };

export default async function ForbiddenPage() {
  const user = await getCurrentUser();
  return (
    <div className="error-page">
      <div className="fade-up">
        <div className="empty-icon" style={{ width: 64, height: 64, borderRadius: 20, color: 'var(--danger)' }}>
          <ShieldIcon size={26} />
        </div>
        <div className="error-code">403</div>
        <h1>Not authorized</h1>
        <p>You don’t have permission to view this page. If you think this is a mistake, try signing in with a different account.</p>
        <div className="error-actions">
          <Link href={user ? dashboardFor(user.role) : '/'} className="btn btn-primary">
            {user ? 'Go to my dashboard' : 'Back to jobs'}
          </Link>
          {!user && (
            <Link href="/login" className="btn btn-secondary">
              Log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
