import { listNotifications } from '@/lib/repo';
import type { PublicUser } from '@/lib/types';
import { EmptyState } from './ui';
import { BellIcon, MailIcon } from './icons';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** Email-style log of messages sent to this user. Real email delivery can plug in where these are created. */
export default async function NotificationList({ user, intro }: { user: PublicUser; intro: string }) {
  const items = await listNotifications(user.id);
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{user.role === 'candidate' ? 'Candidate' : 'Recruiter'}</div>
          <h1>Notifications</h1>
          <p>{intro}</p>
        </div>
      </div>
      <div className="card">
        {items.length ? (
          <div className="mail-list">
            {items.map((n) => (
              <article key={n.id} className="mail">
                <span className="ico">
                  <MailIcon size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="head">
                    <span className="subject">{n.subject}</span>
                    <time className="when" dateTime={n.createdAt}>
                      {when(n.createdAt)}
                    </time>
                  </div>
                  <div className="to">To: {n.toEmail}</div>
                  <p className="body">{n.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <EmptyState icon={<BellIcon size={22} />} title="No notifications yet">
              {user.role === 'candidate'
                ? 'You’ll get a message here each time a recruiter updates one of your applications.'
                : 'You’ll get a message here each time a candidate applies to one of your jobs.'}
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
