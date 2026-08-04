'use client';

import { useEffect } from 'react';

import { useAuthStore } from '../store/auth-store';

export function AuthRehydrator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);

  return children;
}
