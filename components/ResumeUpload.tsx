'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatBytes } from '@/lib/format';
import { RESUME_MAX_BYTES } from '@/lib/types';
import FieldError from './FieldError';
import { EyeIcon, UploadIcon, XIcon } from './icons';

function validate(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return `“${file.name}” isn’t a PDF. Please upload your resume as a PDF file.`;
  if (file.size > RESUME_MAX_BYTES) return `That file is ${formatBytes(file.size)}. The maximum size is 2 MB.`;
  if (file.size === 0) return 'That file appears to be empty.';
  return null;
}

/**
 * The candidate's resume on their profile. Drag-and-drop or browse; PDF only, 2 MB max.
 * Checked here for quick feedback, and again on the server (size, type and PDF signature).
 */
export default function ResumeUpload({ current }: { current: { name: string; size: number } | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (files && files.length > 1) return setError('Please upload a single PDF file.');
    const problem = validate(file);
    if (problem) return setError(problem);
    setError(null);
    setBusy('upload');
    try {
      const body = new FormData();
      body.set('resume', file);
      const res = await fetch('/api/profile/resume', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) return setError(data.error ?? 'Upload failed. Please try again.');
      router.refresh();
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy('remove');
    setError(null);
    try {
      await fetch('/api/profile/resume', { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files);
  }

  return (
    <div className="field">
      <span className="label" id="resume-label">
        Resume <span className="hint">PDF · max 2 MB</span>
      </span>

      {current && (
        <div className="file-pill">
          <span className="pdf">PDF</span>
          <div className="meta">
            <div className="name" title={current.name}>
              {current.name}
            </div>
            <div className="size">{formatBytes(current.size)} · Sent with every application</div>
          </div>
          <a href="/api/profile/resume" target="_blank" rel="noopener" className="icon-btn" aria-label="View resume" title="View">
            <EyeIcon size={17} />
          </a>
          <button type="button" className="icon-btn" onClick={remove} disabled={busy !== null} aria-label={`Remove ${current.name}`} title="Remove">
            {busy === 'remove' ? <span className="spinner" /> : <XIcon size={17} />}
          </button>
        </div>
      )}

      <div
        className={`dropzone${dragging ? ' dragging' : ''}${error ? ' invalid' : ''}`}
        role="button"
        tabIndex={0}
        aria-labelledby="resume-label"
        aria-describedby={error ? 'resume-error' : undefined}
        onClick={() => busy === null && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <div className="dz-icon">{busy === 'upload' ? <span className="spinner" /> : <UploadIcon size={20} />}</div>
        <strong>
          {busy === 'upload' ? (
            'Uploading…'
          ) : dragging ? (
            'Drop your resume here'
          ) : (
            <>
              {current ? 'Replace it: drag & drop or ' : 'Drag & drop or '}
              <span className="link">browse</span>
            </>
          )}
        </strong>
        <p>PDF only, up to 2 MB</p>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => upload(e.target.files)} />
      <FieldError id="resume-error" message={error ?? undefined} />
    </div>
  );
}
