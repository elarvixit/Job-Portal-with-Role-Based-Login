'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({
  children,
  pendingText,
  className = 'btn btn-primary',
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending && <span className="spinner" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
