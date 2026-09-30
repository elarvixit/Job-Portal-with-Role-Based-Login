'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { saveJobAction, type FormState } from '@/app/actions';
import { JOB_TYPES, type Job } from '@/lib/types';
import FieldError from './FieldError';
import TagInput from './TagInput';
import { JobCard } from './ui';
import { AlertIcon } from './icons';

type Values = Pick<Job, 'title' | 'company' | 'description' | 'location' | 'type' | 'salary' | 'status'> & {
  deadline: string;
};

export default function JobForm({
  job,
  defaults,
  skillSuggestions = [],
}: {
  job?: Job;
  defaults: Values & { skills: string[] };
  skillSuggestions?: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveJobAction, {});
  const { skills: initialSkills, ...initial } = defaults;
  const [v, setV] = useState<Values>(initial);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const fe = state.fieldErrors ?? {};
  const minDate = new Date().toISOString().slice(0, 10);
  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  const preview: Job = {
    id: job?.id ?? 'preview',
    recruiterId: '',
    createdAt: job?.createdAt ?? new Date().toISOString(),
    updatedAt: '',
    ...v,
    skills,
    deadline: v.deadline || null,
    title: v.title || 'Job title',
    company: v.company || 'Company',
    location: v.location || 'Location',
    salary: v.salary || '—',
  };

  const input = (name: keyof Values, label: string, placeholder: string, hint?: string) => (
    <div className="field">
      <label className="label" htmlFor={name}>
        {label} {hint && <span className="hint">{hint}</span>}
      </label>
      <input
        id={name}
        name={name}
        className={`input${fe[name] ? ' invalid' : ''}`}
        placeholder={placeholder}
        value={v[name]}
        onChange={set(name)}
        aria-invalid={Boolean(fe[name]) || undefined}
        aria-describedby={fe[name] ? `${name}-error` : undefined}
      />
      <FieldError id={`${name}-error`} message={fe[name]} />
    </div>
  );

  return (
    <form action={action} noValidate className="form-layout">
      <div className="card">
        {job && <input type="hidden" name="id" value={job.id} />}
        {state.error && (
          <div style={{ padding: '20px 28px 0' }}>
            <div className="alert alert-error" role="alert">
              <AlertIcon size={18} /> {state.error}
            </div>
          </div>
        )}

        <div className="form-section">
          <h2>Role basics</h2>
          <p>The essentials candidates see first.</p>
          <div className="form-grid">
            {input('title', 'Job title', 'e.g. Senior Frontend Engineer')}
            <div className="form-row">
              {input('company', 'Company', 'e.g. Northwind Labs')}
              {input('location', 'Location', 'e.g. Bengaluru or Remote')}
            </div>
            <div className="form-row">
              {input('salary', 'Salary', 'e.g. ₹24–32 LPA or $120k – $150k')}
              <div className="field">
                <label className="label" htmlFor="type">
                  Job type
                </label>
                <select
                  id="type"
                  name="type"
                  className={`select${fe.type ? ' invalid' : ''}`}
                  value={v.type}
                  onChange={set('type')}
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <FieldError id="type-error" message={fe.type} />
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Skills & deadline</h2>
          <p>Candidates can filter jobs by skill, and see how well their skills match. Applications close after the deadline.</p>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="skills">
                Required skills <span className="hint">press Enter after each</span>
              </label>
              <TagInput
                id="skills"
                name="skills"
                value={skills}
                onChange={setSkills}
                suggestions={skillSuggestions}
                placeholder="e.g. React, then Enter"
                invalid={Boolean(fe.skills)}
                describedBy={fe.skills ? 'skills-error' : undefined}
              />
              <FieldError id="skills-error" message={fe.skills} />
            </div>
            <div className="field" style={{ maxWidth: 280 }}>
              <label className="label" htmlFor="deadline">
                Application deadline <span className="hint">last day to apply</span>
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                className={`input${fe.deadline ? ' invalid' : ''}`}
                value={v.deadline}
                min={job ? undefined : minDate}
                onChange={set('deadline')}
                aria-invalid={Boolean(fe.deadline) || undefined}
                aria-describedby={fe.deadline ? 'deadline-error' : undefined}
              />
              <FieldError id="deadline-error" message={fe.deadline} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Description</h2>
          <p>Describe the role, responsibilities, requirements and perks. Line breaks are preserved.</p>
          <div className="field">
            <label className="label" htmlFor="description">
              Job description <span className="hint">{v.description.length.toLocaleString()}/8,000</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`textarea${fe.description ? ' invalid' : ''}`}
              style={{ minHeight: 260 }}
              placeholder={'About the role…\n\nWhat you’ll do\n• …\n\nWhat we’re looking for\n• …'}
              value={v.description}
              onChange={set('description')}
              maxLength={8000}
              aria-invalid={Boolean(fe.description) || undefined}
              aria-describedby={fe.description ? 'description-error' : undefined}
            />
            <FieldError id="description-error" message={fe.description} />
          </div>
        </div>

        <div className="form-section">
          <h2>Visibility</h2>
          <p>Closed jobs are hidden from the job board and stop accepting applications.</p>
          <div className="segmented two" role="radiogroup" aria-label="Status">
            {(['open', 'closed'] as const).map((s) => (
              <label key={s}>
                <input type="radio" name="status" value={s} checked={v.status === s} onChange={set('status')} />
                <span>
                  <span
                    className="dot"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 99,
                      background: s === 'open' ? 'var(--success)' : 'var(--muted)',
                    }}
                  />
                  {s === 'open' ? 'Open — accepting applications' : 'Closed'}
                </span>
              </label>
            ))}
          </div>
          <FieldError id="status-error" message={fe.status} />
        </div>

        <div className="form-actions">
          <Link href="/recruiter/jobs" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending && <span className="spinner" />}
            {pending ? 'Saving…' : job ? 'Save changes' : 'Publish job'}
          </button>
        </div>
      </div>

      <aside className="sticky" style={{ display: 'grid', gap: 16 }}>
        <div className="card preview-card">
          <div className="label-sm">Live preview</div>
          <div style={{ pointerEvents: 'none' }}>
            <JobCard job={preview} />
          </div>
        </div>
        <div className="card preview-card">
          <div className="label-sm">Tips for a great listing</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', fontSize: 13.5, display: 'grid', gap: 8 }}>
            <li>Use a clear, searchable title.</li>
            <li>Include a salary range — listings with pay get more applicants.</li>
            <li>Keep requirements to what truly matters.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
