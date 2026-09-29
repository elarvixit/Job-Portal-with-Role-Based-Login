'use client';

import { useState, useTransition } from 'react';
import { updateApplicationStatusAction } from '@/app/actions';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/types';
import { CheckIcon } from './icons';
import { statusLabel } from './ui';

const TONE: Record<ApplicationStatus, { bg: string; fg: string }> = {
  applied: { bg: 'var(--info-soft)', fg: 'var(--info)' },
  reviewing: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  shortlisted: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
  rejected: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  hired: { bg: 'var(--success-soft)', fg: 'var(--success)' },
};

export default function StatusSelect({
  applicationId,
  initial,
  candidateName,
}: {
  applicationId: string;
  initial: ApplicationStatus;
  candidateName: string;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function onChange(next: ApplicationStatus) {
    const prev = status;
    setStatus(next);
    setError(null);
    start(async () => {
      const res = await updateApplicationStatusAction(applicationId, next);
      if (!res.ok) {
        setStatus(prev);
        setError(res.error ?? 'Could not update');
      } else {
        setSaved((n) => n + 1);
      }
    });
  }

  return (
    <div className="status-select">
      <select
        aria-label={`Application status for ${candidateName}`}
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
        style={{ background: TONE[status].bg, color: TONE[status].fg }}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      {pending && <span className="spinner" style={{ width: 14, height: 14, color: 'var(--muted)' }} />}
      {!pending && saved > 0 && (
        <span key={saved} className="saved">
          <CheckIcon size={13} strokeWidth={2.6} /> Saved
        </span>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
