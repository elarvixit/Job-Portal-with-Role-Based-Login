// Edge-safe session helpers (used by middleware and server code).
// Sessions are HMAC-SHA256 signed tokens stored in an httpOnly cookie.
import type { Role } from './types';

export const SESSION_COOKIE = 'hl_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

export interface SessionPayload {
  uid: string;
  role: Role;
  exp: number; // epoch ms
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return s || 'dev-only-insecure-session-secret-change-me';
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str: string): Uint8Array<ArrayBuffer> {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signSession(uid: string, role: Role): Promise<string> {
  const payload: SessionPayload = { uid, role, exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const body = toB64url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), encoder.encode(body)));
  return `${body}.${toB64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64url(sig), encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromB64url(body))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (payload.role !== 'candidate' && payload.role !== 'recruiter') return null;
    return payload;
  } catch {
    return null;
  }
}

export function dashboardFor(role: Role): string {
  return role === 'candidate' ? '/candidate' : '/recruiter';
}
