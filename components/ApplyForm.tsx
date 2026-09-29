'use client';

import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatBytes } from '@/lib/format';import FieldError from './FieldError';
import { AlertIcon, ArrowRight, UploadIcon, XIcon } from './icons';

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_NOTE = 20;
const MAX_NOTE = 2000;

async function postJson<T extends object = { ok: true }>(url: string, body: unknown): Promise<T | { error: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!res.ok || !data.ok) return { error: data.error ?? 'Something went wrong. Please try again.' };
  return data;
}

function validateFile(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return `“${file.name}” isn’t a PDF. Please upload your resume as a PDF file.`;
  if (file.size > MAX_BYTES) return `That file is ${formatBytes(file.size)}. The maximum size is 5 MB.`;
  if (file.size === 0) return 'That file appears to be empty.';
  return null;
}

export default function ApplyForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (files && files.length > 1) {
      setFileError('Please upload a single PDF file.');
      return;
    }
    const err = validateFile(f);
    setFileError(err);
    setFile(err ? null : f);
    setServerError(null);
  }

  function removeFile() {
    setFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const trimmed = note.trim();
    let bad = false;
    if (trimmed.length < MIN_NOTE) {
      setNoteError(`Tell the recruiter a little more — at least ${MIN_NOTE} characters.`);
      bad = true;
    } else setNoteError(null);
    if (!file) {
      setFileError('Please attach your resume as a PDF.');
      bad = true;
    }
    if (bad || !file) return;

    setSubmitting(true);
    try {
      // 1. Ask the server for a one-time upload URL (also checks we're allowed to apply).
      const start = await postJson<{ applicationId: string; path: string; token: string; local: boolean }>(
        '/api/applications/upload-url',
        { jobId },
      );
      if ('error' in start) return setServerError(start.error);

      // 2. Upload the PDF: straight to private Supabase Storage, or to this server in local mode.
      if (start.local) {
        const res = await fetch(`/api/applications/local-upload?applicationId=${start.applicationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body: file,
        });
        if (!res.ok) return setServerError('Your resume could not be uploaded. Please try again.');
      } else {
        const { supabaseBrowser } = await import('@/lib/supabase-browser');
        const { error: uploadError } = await supabaseBrowser()
          .storage.from('resumes')
          .uploadToSignedUrl(start.path, start.token, file, { contentType: 'application/pdf' });
        if (uploadError) return setServerError('Your resume could not be uploaded. Please try again.');
      }

      // 3. Record the application; the server verifies the uploaded file.
      const done = await postJson('/api/applications', {
        jobId,
        applicationId: start.applicationId,
        coverNote: trimmed,
        resumeName: file.name,
      });
      if ('error' in done) return setServerError(done.error);
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
        <span className="label" id="resume-label">
          Resume <span className="hint">PDF · max 5 MB</span>
        </span>

        {file ? (
          <div className="file-pill">
            <span className="pdf">PDF</span>
            <div className="meta">
              <div className="name" title={file.name}>
                {file.name}
              </div>
              <div className="size">{formatBytes(file.size)} · Ready to upload</div>
            </div>
            <button type="button" className="icon-btn" onClick={removeFile} aria-label={`Remove ${file.name}`}>
              <XIcon size={17} />
            </button>
          </div>
        ) : (
          <div
            className={`dropzone${dragging ? ' dragging' : ''}${fileError ? ' invalid' : ''}`}
            role="button"
            tabIndex={0}
            aria-labelledby="resume-label"
            aria-describedby={fileError ? 'file-error' : undefined}
            onClick={() => inputRef.current?.click()}
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
            <div className="dz-icon">
              <UploadIcon size={20} />
            </div>
            <strong>
              {dragging ? 'Drop your resume here' : <>Drag & drop or <span className="link">browse</span></>}
            </strong>
            <p>PDF only, up to 5 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => pick(e.target.files)}
        />
        <FieldError id="file-error" message={fileError ?? undefined} />
      </div>

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
        {submitting ? <span className="spinner" /> : null}
        {submitting ? 'Submitting application…' : 'Submit application'}
        {!submitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
