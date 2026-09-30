'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logoutAction } from '@/app/actions';
import { initials } from '@/lib/format';
import type { Role } from '@/lib/types';
import ThemeToggle from './ThemeToggle';
import { LogoutIcon, MenuIcon, XIcon } from './icons';

interface NavUser {
  name: string;
  role: Role;
}

type NavItem = { href: string; label: string; match: (p: string) => boolean };

const CANDIDATE_LINKS: NavItem[] = [
  { href: '/', label: 'Jobs', match: (p) => p === '/' || p.startsWith('/jobs') },
  { href: '/candidate/applications', label: 'My Applications', match: (p) => p.startsWith('/candidate/applications') },
];

const RECRUITER_LINKS: NavItem[] = [
  {
    href: '/recruiter/jobs',
    label: 'My Jobs',
    match: (p) => p.startsWith('/recruiter/jobs') && p !== '/recruiter/jobs/new',
  },
  { href: '/recruiter/jobs/new', label: 'Post a Job', match: (p) => p === '/recruiter/jobs/new' },
];

export default function Navbar({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const onDark = pathname === '/' && !pastHero;

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const hero = pathname === '/' ? document.querySelector('.hero') : null;
      setPastHero(hero ? hero.getBoundingClientRect().bottom < 68 : false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const links = user?.role === 'candidate' ? CANDIDATE_LINKS : user?.role === 'recruiter' ? RECRUITER_LINKS : [];
  const home = user ? (user.role === 'candidate' ? '/candidate' : '/recruiter') : '/';

  return (
    <header className={`nav${onDark ? ' on-dark' : ''}${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link href={user ? home : '/'} className="brand" aria-label="Hireloom home">
          <span className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12" />
            </svg>
          </span>
          Hireloom
        </Link>

        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon size={22} /> : <MenuIcon size={22} />}
        </button>

        <nav className={`nav-links${open ? ' open' : ''}`} aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link${l.match(pathname) ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}

          <ThemeToggle />

          {user ? (
            <>
              <form action={logoutAction}>
                <button type="submit" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <LogoutIcon size={16} /> Logout
                </button>
              </form>
              <Link href={home} className="nav-user" title="Go to your dashboard">
                <span className="avatar">{initials(user.name)}</span>
                <span>
                  {user.name.split(' ')[0]} <span className="role">· {user.role}</span>
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={`nav-link${pathname === '/login' ? ' active' : ''}`}>
                Login
              </Link>
              <Link href="/signup" className={`btn btn-sm ${onDark ? 'btn-secondary' : 'btn-dark'}`} style={{ marginLeft: 6 }}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
