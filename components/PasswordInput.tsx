'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

export default function PasswordInput({
  id,
  invalid,
  autoComplete,
  placeholder,
}: {
  id: string;
  invalid?: boolean;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <input
        id={id}
        name="password"
        type={show ? 'text' : 'password'}
        className={`input${invalid ? ' invalid' : ''}`}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
      </button>
    </div>
  );
}
