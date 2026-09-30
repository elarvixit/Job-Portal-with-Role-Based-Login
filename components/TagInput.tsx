'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { XIcon } from './icons';

/** Chips-style input for skills. Submits as one comma-separated field named `name`. */
export default function TagInput({
  id,
  name,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type a skill and press Enter',
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());

  function add(raw: string) {
    const parts = raw.split(',').map((p) => p.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase()) && next.length < 20) next.push(p.slice(0, 40));
    if (next.length !== value.length) onChange(next);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const open = suggestions.filter((s) => !has(s)).slice(0, 10);

  return (
    <>
      <div className={`tag-input${invalid ? ' invalid' : ''}`} onClick={() => inputRef.current?.focus()}>
        {value.map((t) => (
          <span key={t} className="tag">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))}>
              <XIcon size={12} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={value.length ? '' : placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name={name} value={value.join(', ')} />
      {open.length > 0 && (
        <div className="suggest" aria-label="Suggested skills">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
