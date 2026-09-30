'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { mode: 'light', label: 'Light', Icon: SunIcon },
  { mode: 'dark', label: 'Dark', Icon: MoonIcon },
  { mode: 'system', label: 'Auto (match my device)', Icon: MonitorIcon },
];

function resolved(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* private mode: the choice just won't persist */
  }
}

export default function ThemeToggle() {
  // Starts as "system" to match the server render, then syncs with the saved choice.
  const [mode, setMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') setMode(saved);
    } catch {
      /* ignore */
    }
    // Enable the sliding thumb only after the saved position is shown.
    requestAnimationFrame(() => setReady(true));
  }, []);

  function choose(next: ThemeMode, e: MouseEvent<HTMLButtonElement>) {
    if (next === mode) return;
    const changesLook = resolved(next) !== resolved(mode);
    setMode(next);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };

    if (!changesLook || reduceMotion) {
      applyTheme(next);
    } else if (doc.startViewTransition) {
      // Circular reveal that grows from the button that was clicked.
      const r = e.currentTarget.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const root = document.documentElement.style;
      root.setProperty('--vt-x', `${x}px`);
      root.setProperty('--vt-y', `${y}px`);
      root.setProperty('--vt-r', `${radius}px`);
      doc.startViewTransition(() => applyTheme(next));
    } else {
      const root = document.documentElement;
      root.classList.add('theme-fade');
      applyTheme(next);
      setTimeout(() => root.classList.remove('theme-fade'), 400);
    }
  }

  const index = OPTIONS.findIndex((o) => o.mode === mode);

  return (
    <>
      <span className="theme-label">Theme</span>
      <div className="theme-toggle" role="radiogroup" aria-label="Colour theme">
        <span
          className="thumb"
          aria-hidden
          style={{ ['--i' as string]: index, transition: ready ? undefined : 'none' }}
        />
        {OPTIONS.map(({ mode: m, label, Icon }) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            aria-label={label}
            title={label}
            onClick={(e) => choose(m, e)}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </>
  );
}
