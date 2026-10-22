'use client';

import { Button, Group } from '@mantine/core';
import { useState } from 'react';

import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth-store';

type OAuthProvider = 'google' | 'apple';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (options: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${id}`));
    document.head.appendChild(script);
  });
}

interface OAuthButtonsProps {
  googleClientId?: string | null;
  googleEnabled?: boolean;
  appleClientId?: string | null;
  appleEnabled?: boolean;
  rememberMe?: boolean;
  onSuccess: (result: { accessToken: string; user: { emailVerified: boolean; acceptedTermsVersion?: string | null } }) => void;
}

export function OAuthButtons({
  googleClientId,
  googleEnabled,
  appleClientId,
  appleEnabled,
  rememberMe,
  onSuccess,
}: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSuccess = (result: {
    accessToken: string;
    user: { email: string; emailVerified: boolean; acceptedTermsVersion?: string | null };
  }) => {
    setAuth(result.accessToken, result.user.email, result.user.emailVerified, rememberMe ?? false, result.user.acceptedTermsVersion ?? null);
    onSuccess({ accessToken: result.accessToken, user: result.user });
  };

  const signInGoogle = async () => {
    if (!googleClientId) return;
    setPending('google');
    try {
      await loadScript('https://accounts.google.com/gsi/client', 'google-gsi-client');
      await new Promise<void>((resolve) => {
        window.google!.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              void (async () => {
                try {
                  const { data, error } = await apiClient.POST('/auth/google', {
                    body: { idToken: response.credential } as never,
                  });
                  if (error || !data) throw error ?? new Error('Google login failed');
                  handleSuccess(data as { accessToken: string; user: { email: string; emailVerified: boolean; acceptedTermsVersion?: string | null } });
                  resolve();
                } catch (err) {
                  console.error('Google login error', err);
                  resolve();
                }
              })();
            } else {
              resolve();
            }
          },
        });
        const container = document.getElementById('google-button-container');
        if (container) {
          window.google!.accounts.id.renderButton(container, {
            theme: 'outline',
            width: 280,
          });
        }
      });
    } catch (error) {
      console.error('Google sign-in failed to load', error);
    } finally {
      setPending(null);
    }
  };

  const signInApple = async () => {
    if (!appleClientId) return;
    setPending('apple');
    try {
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', 'appleid-js');
      window.AppleID!.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const response = await window.AppleID!.auth.signIn();
      const idToken = response.authorization?.id_token;
      if (!idToken) {
        throw new Error('Apple sign-in did not return a token');
      }
      const { data, error } = await apiClient.POST('/auth/apple', {
        body: {
          identityToken: idToken,
          email: response.user?.email,
          firstName: response.user?.name?.firstName,
          lastName: response.user?.name?.lastName,
        } as never,
      });
      if (error || !data) throw error ?? new Error('Apple login failed');
      handleSuccess(data as { accessToken: string; user: { email: string; emailVerified: boolean; acceptedTermsVersion?: string | null } });
    } catch (error) {
      console.error('Apple sign-in failed', error);
    } finally {
      setPending(null);
    }
  };

  const showAny = (googleEnabled && googleClientId) || (appleEnabled && appleClientId);
  if (!showAny) return null;

  return (
    <Group grow>
      {googleEnabled && googleClientId && (
        <Button
          variant="outline"
          onClick={() => void signInGoogle()}
          loading={pending === 'google'}
          style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
        >
          Google
        </Button>
      )}
      {appleEnabled && appleClientId && (
        <Button
          variant="outline"
          onClick={() => void signInApple()}
          loading={pending === 'apple'}
          style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
        >
          Apple
        </Button>
      )}
    </Group>
  );
}
