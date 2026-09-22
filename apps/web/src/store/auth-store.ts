import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  emailVerified: boolean;
  rememberMe: boolean;
  setAuth: (accessToken: string, email: string, emailVerified?: boolean, rememberMe?: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  setEmailVerified: (verified: boolean) => void;
  setRememberMe: (rememberMe: boolean) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.rememberMe === false) return null;
    } catch {
      return null;
    }
    return raw;
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      if (parsed?.state?.rememberMe === false) {
        window.localStorage.removeItem(name);
        return;
      }
    } catch {
      // ignore malformed values
    }
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      email: null,
      isAuthenticated: false,
      isHydrated: false,
      emailVerified: false,
      rememberMe: false,
      setAuth: (accessToken, email, emailVerified = false, rememberMe = false) => {
        set({ accessToken, email, isAuthenticated: true, emailVerified, rememberMe });
      },
      setAccessToken: (accessToken) => {
        set({ accessToken, isAuthenticated: true });
      },
      setEmailVerified: (verified) => set({ emailVerified: verified }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      logout: () => {
        set({ accessToken: null, email: null, isAuthenticated: false, emailVerified: false, rememberMe: false });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'auth-store',
      storage: safeStorage as unknown as PersistStorage<AuthState>,
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
