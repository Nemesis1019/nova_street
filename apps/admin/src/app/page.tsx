'use client';

import { useEffect, useState } from 'react';

import { DashboardView } from '../components/dashboard-view';
import { LoginForm } from '../components/login-form';
import { getAccessToken } from '../lib/auth';

export default function AdminDashboardPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (!getAccessToken()) {
    return <LoginForm />;
  }

  return <DashboardView />;
}
