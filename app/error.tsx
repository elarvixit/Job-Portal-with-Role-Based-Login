'use client';

import Link from 'next/link';
import { AlertIcon } from '@/components/icons';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-page">
      <div className="fade-up">
        <div className="empty-icon" style={{ width: 64, height: 64, borderRadius: 20, color: 'var(--danger)' }}>
          <AlertIcon size={26} />
        </div>
        <h1>Something went wrong</h1>
        <p>
          We couldn’t load this page. Please try again in a moment.
          {error.digest && (
            <>
              <br />
              <span style={{ fontSize: 12.5 }}>Reference: {error.digest}</span>
            </>
          )}
        </p>
        <div className="error-actions">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
