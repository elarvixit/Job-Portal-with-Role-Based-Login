'use client';

import { useState } from 'react';
import { deleteJobAction } from '@/app/actions';
import SubmitButton from './SubmitButton';
import { TrashIcon } from './icons';

/** Two-step delete: the first click asks, the second deletes the job and its applications. */
export default function DeleteJobButton({ jobId, applicants }: { jobId: string; applicants: number }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setAsking(true)}>
        <TrashIcon size={15} /> Delete
      </button>
    );
  }
  return (
    <form action={deleteJobAction} className="confirm-delete">
      <input type="hidden" name="id" value={jobId} />
      <SubmitButton className="btn btn-sm btn-danger-ghost" pendingText="Deleting…">
        <TrashIcon size={15} /> {applicants ? `Delete with ${applicants} applicant${applicants === 1 ? '' : 's'}?` : 'Delete for good?'}
      </SubmitButton>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </form>
  );
}
