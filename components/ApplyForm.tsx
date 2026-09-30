'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatBytes } from '@/lib/format';
import FieldError from './FieldError';
import { AlertIcon, ArrowRight, EyeIcon } from './icons';

const MIN_NOTE = 20;
const MAX_NOTE = 2000;

/** Cover note + the resume from the candidate's profile. The server re-checks every rule. */
export default function ApplyForm({ jobId, resume }: { jobId: string; resume: { name: string; size: number } }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const trimmed = note.trim();
    if (trimmed.length < MIN_NOTE) {
      setNoteError(`Tell the recruiter a little more — at least ${MIN_NOTE} characters.`);
      return;
    }
    setNoteError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, coverNote: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) return setServerError(data.error ?? 'Something went wrong. Please try again.');
      router.refresh();
    } catch {
      setServerError('Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-grid" noValidate>
      {serverError && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} /> {serverError}
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="coverNote">
          Cover note
          <span className="hint">
            {note.length}/{MAX_NOTE}
          </span>
        </label>
        <textarea
          id="coverNote"
          className={`textarea${noteError ? ' invalid' : ''}`}
          placeholder="Why are you a great fit for this role?"
          value={note}
          maxLength={MAX_NOTE}
          onChange={(e) => {
            setNote(e.target.value);
            if (noteError && e.target.value.trim().length >= MIN_NOTE) setNoteError(null);
          }}
          aria-invalid={Boolean(noteError) || undefined}
          aria-describedby={noteError ? 'note-error' : undefined}
        />
        <FieldError id="note-error" message={noteError ?? undefined} />
      </div>

      <div className="field">
        <span className="label">
          Resume <span className="hint">from your profile</span>
        </span>
        <div className="file-pill">
          <span className="pdf">PDF</span>
          <div className="meta">
            <div className="name" title={resume.name}>
              {resume.name}
            </div>
            <div className="size">
              {formatBytes(resume.size)} ·{' '}
              <Link href="/candidate/profile" className="link">
                Change
              </Link>
            </div>
          </div>
          <a href="/api/profile/resume" target="_blank" rel="noopener" className="icon-btn" aria-label="View resume" title="View">
            <EyeIcon size={17} />
          </a>
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
        {submitting ? <span className="spinner" /> : null}
        {submitting ? 'Submitting application…' : 'Submit application'}
        {!submitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
