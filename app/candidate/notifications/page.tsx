import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import NotificationList from '@/components/NotificationList';

export const metadata: Metadata = { title: 'Notifications' };

export default async function CandidateNotificationsPage() {
  const user = await requireRole('candidate');
  return <NotificationList user={user} intro="Every update on your applications, like the emails you’d receive." />;
}
