import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  emailVerified: boolean;
  rememberMe: boolean;
  acceptedTermsVersion: string | null;
  /** True cuando ya se intentó restaurar la sesión (hidratación + cookie). */
  sessionReady: boolean;
  setAuth: (
    accessToken: string,
    email: string,
    emailVerified?: boolean,
    rememberMe?: boolean,
    acceptedTermsVersion?: string | null,
  ) => void;
  setAccessToken: (accessToken: string) => void;
  setEmailVerified: (verified: boolean) => void;
  setRememberMe: (rememberMe: boolean) => void;
  setAcceptedTermsVersion: (version: string) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
  setSessionReady: (ready: boolean) => void;
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

type PersistedAuthState = Pick<
  AuthState,
  'accessToken' | 'email' | 'isAuthenticated' | 'emailVerified' | 'rememberMe' | 'acceptedTermsVersion'
>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      email: null,
      isAuthenticated: false,
      isHydrated: false,
      emailVerified: false,
      rememberMe: false,
      acceptedTermsVersion: null,
      sessionReady: false,
      setAuth: (accessToken, email, emailVerified = false, rememberMe = false, acceptedTermsVersion = null) => {
        set({ accessToken, email, isAuthenticated: true, emailVerified, rememberMe, acceptedTermsVersion });
      },
      setAccessToken: (accessToken) => {
        set({ accessToken, isAuthenticated: true });
      },
      setEmailVerified: (verified) => set({ emailVerified: verified }),
      setRememberMe: (rememberMe) => set({ rememberMe }),
      setAcceptedTermsVersion: (version) => set({ acceptedTermsVersion: version }),
      logout: () => {
        set({
          accessToken: null,
          email: null,
          isAuthenticated: false,
          emailVerified: false,
          rememberMe: false,
          acceptedTermsVersion: null,
        });
      },
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
      setSessionReady: (sessionReady) => set({ sessionReady }),
    }),
    {
      name: 'auth-store',
      storage: safeStorage as unknown as PersistStorage<PersistedAuthState>,
      skipHydration: true,
      // Solo se persisten los datos de sesión; los flags de runtime
      // (`isHydrated`, `sessionReady`) quedan fuera.
      partialize: (state) => ({
        accessToken: state.accessToken,
        email: state.email,
        isAuthenticated: state.isAuthenticated,
        emailVerified: state.emailVerified,
        rememberMe: state.rememberMe,
        acceptedTermsVersion: state.acceptedTermsVersion,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
