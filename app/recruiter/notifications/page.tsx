import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import NotificationList from '@/components/NotificationList';

export const metadata: Metadata = { title: 'Notifications' };

export default async function RecruiterNotificationsPage() {
  const user = await requireRole('recruiter');
  return <NotificationList user={user} intro="A message for every new application to your jobs." />;
}
