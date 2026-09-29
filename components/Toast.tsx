'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CheckIcon } from './icons';

/** Shows a transient confirmation, then strips the query flag from the URL. */
export default function Toast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const t = setTimeout(() => router.replace(pathname, { scroll: false }), 3600);
    return () => clearTimeout(t);
  }, [router, pathname]);

  return (
    <div className="toast" role="status">
      <CheckIcon size={17} strokeWidth={2.6} /> {message}
    </div>
  );
}
