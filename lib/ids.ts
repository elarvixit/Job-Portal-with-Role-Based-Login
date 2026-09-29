import { randomBytes } from 'crypto';

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}
