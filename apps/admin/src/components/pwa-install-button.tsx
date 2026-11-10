'use client';

import { useEffect, useState } from 'react';

import { Icon } from './ui/icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton({ label = 'Instalar app' }: { label?: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await installEvent.prompt();
        setInstallEvent(null);
      }}
      aria-label={label}
      title={label}
      className="flex items-center gap-1.5 rounded-lg border border-outline-variant/50 px-2 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low md:px-3"
    >
      <Icon name="install_desktop" className="text-[16px]" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
