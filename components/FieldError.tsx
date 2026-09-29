import { AlertIcon } from './icons';

export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="field-error" role="alert">
      <AlertIcon size={14} /> {message}
    </span>
  );
}
