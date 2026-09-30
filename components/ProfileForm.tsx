'use client';

import { useActionState, useState } from 'react';
import { saveProfileAction, type FormState } from '@/app/actions';
import FieldError from './FieldError';
import TagInput from './TagInput';
import { AlertIcon, CheckIcon } from './icons';

export default function ProfileForm({
  defaults,
  suggestions,
}: {
  defaults: { name: string; email: string; phone: string; skills: string[]; yearsExperience: number | '' };
  suggestions: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfileAction, {});
  const [skills, setSkills] = useState<string[]>(defaults.skills);
  const fe = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={action} className="form-grid" noValidate>
      {state.saved && (
        <div className="alert alert-success" role="status">
          <CheckIcon size={18} /> Profile saved.
        </div>
      )}
      {state.error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} /> {state.error}
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            name="name"
            className={`input${fe.name ? ' invalid' : ''}`}
            defaultValue={v?.name ?? defaults.name}
            autoComplete="name"
            aria-invalid={Boolean(fe.name) || undefined}
            aria-describedby={fe.name ? 'name-error' : undefined}
          />
          <FieldError id="name-error" message={fe.name} />
        </div>
        <div className="field">
          <label className="label" htmlFor="email">
            Email <span className="hint">used to log in</span>
          </label>
          <input id="email" className="input" value={defaults.email} readOnly disabled />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={`input${fe.phone ? ' invalid' : ''}`}
            placeholder="+91 98765 43210"
            defaultValue={v?.phone ?? defaults.phone}
            autoComplete="tel"
            aria-invalid={Boolean(fe.phone) || undefined}
            aria-describedby={fe.phone ? 'phone-error' : undefined}
          />
          <FieldError id="phone-error" message={fe.phone} />
        </div>
        <div className="field">
          <label className="label" htmlFor="yearsExperience">
            Years of experience
          </label>
          <input
            id="yearsExperience"
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            step={1}
            inputMode="numeric"
            className={`input${fe.yearsExperience ? ' invalid' : ''}`}
            placeholder="e.g. 3"
            defaultValue={v?.yearsExperience ?? defaults.yearsExperience}
            aria-invalid={Boolean(fe.yearsExperience) || undefined}
            aria-describedby={fe.yearsExperience ? 'years-error' : undefined}
          />
          <FieldError id="years-error" message={fe.yearsExperience} />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="skills">
          Skills <span className="hint">used to match you with jobs</span>
        </label>
        <TagInput
          id="skills"
          name="skills"
          value={skills}
          onChange={setSkills}
          suggestions={suggestions}
          invalid={Boolean(fe.skills)}
          describedBy={fe.skills ? 'skills-error' : undefined}
        />
        <FieldError id="skills-error" message={fe.skills} />
      </div>

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending && <span className="spinner" />}
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
