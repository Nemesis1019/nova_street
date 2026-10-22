'use client';

import { AuthFlow } from './auth/auth-flow';

interface LoginFormProps {
  onLogin?: () => void;
}

export function LoginForm(_props: LoginFormProps) {
  return <AuthFlow />;
}
