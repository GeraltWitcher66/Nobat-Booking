'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@/types';
import { readSession, subscribeSession } from './session';

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    setReady(true);
    return subscribeSession(sync);
  }, []);

  return { session, ready };
};
