'use client';

import { useActionState } from 'react';
import { loginAction, type FormState } from '@/app/actions';
import FieldError from './FieldError';
import PasswordInput from './PasswordInput';
import { AlertIcon, ArrowRight } from './icons';

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="form-grid" noValidate>
      {state.error && (
        <div className="alert alert-error" role="alert">
          <AlertIcon size={18} /> {state.error}
        </div>
      )}
      <input type="hidden" name="next" value={next ?? ''} />

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
          defaultValue={state.values?.email}
          aria-invalid={Boolean(fe.email) || undefined}
          aria-describedby={fe.email ? 'email-error' : undefined}
          required
          autoFocus
        />
        <FieldError id="email-error" message={fe.email} />
      </div>

      <div className="field">
        <label className="label" htmlFor="password">
          Password
        </label>
        <PasswordInput id="password" invalid={Boolean(fe.password)} autoComplete="current-password" placeholder="••••••••" />
        <FieldError id="password-error" message={fe.password} />
      </div>

      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={pending}>
        {pending ? <span className="spinner" /> : null}
        {pending ? 'Signing in…' : 'Log in'}
        {!pending && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
