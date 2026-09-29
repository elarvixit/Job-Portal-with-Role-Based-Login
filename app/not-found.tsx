import Link from 'next/link';
import { CompassIcon } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="fade-up">
        <div className="empty-icon" style={{ width: 64, height: 64, borderRadius: 20, color: 'var(--accent)' }}>
          <CompassIcon size={26} />
        </div>
        <div className="error-code">404</div>
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist, or the job may have been removed.</p>
        <div className="error-actions">
          <Link href="/" className="btn btn-primary">
            Browse jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
