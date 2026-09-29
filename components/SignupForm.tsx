'use client';

import { useActionState } from 'react';
import { signupAction, type FormState } from '@/app/actions';
import FieldError from './FieldError';
import PasswordInput from './PasswordInput';
import { AlertIcon, ArrowRight, BriefcaseIcon, CheckIcon, UserIcon } from './icons';

const ROLES = [
  { value: 'candidate', title: 'Candidate', text: 'Browse roles and apply with your resume.', Icon: UserIcon },
  { value: 'recruiter', title: 'Recruiter', text: 'Post jobs and manage your applicants.', Icon: BriefcaseIcon },
] as const;

export default function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="form-grid" noValidate>
      {state.error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} /> {state.error}
        </div>
      )}

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 7 }}>
          I want to join as
        </legend>
        <div className="role-options">
          {ROLES.map(({ value, title, text, Icon }) => (
            <label key={value} className="role-option">
              <input type="radio" name="role" value={value} defaultChecked={(v.role || 'candidate') === value} />
              <span className="card">
                <span className="ico">
                  <Icon size={18} />
                </span>
                <strong>{title}</strong>
                <span>{text}</span>
              </span>
              <span className="role-check">
                <CheckIcon size={12} strokeWidth={3} />
              </span>
            </label>
          ))}
        </div>
        <FieldError id="role-error" message={fe.role} />
      </fieldset>

      <div className="field">
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          className={`input${fe.name ? ' invalid' : ''}`}
          placeholder="Jane Doe"
          autoComplete="name"
          defaultValue={v.name}
          aria-invalid={Boolean(fe.name) || undefined}
          aria-describedby={fe.name ? 'name-error' : undefined}
          required
        />
        <FieldError id="name-error" message={fe.name} />
      </div>

      <div className="field">
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={`input${fe.email ? ' invalid' : ''}`}
          placeholder="you@company.com"
          autoComplete="email"
          defaultValue={v.email}
          aria-invalid={Boolean(fe.email) || undefined}
          aria-describedby={fe.email ? 'email-error' : undefined}
          required
        />
        <FieldError id="email-error" message={fe.email} />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Password <span className="hint">At least 8 characters</span>
        </label>
        <PasswordInput id="password" invalid={Boolean(fe.password)} autoComplete="new-password" placeholder="Create a password" />
        <FieldError id="password-error" message={fe.password} />
      </div>

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>
        {pending ? <span className="spinner" /> : null}
        {pending ? 'Creating account…' : 'Create account'}
        {!pending && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
