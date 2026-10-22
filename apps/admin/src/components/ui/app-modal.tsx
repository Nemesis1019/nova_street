'use client';

import { Modal } from '@mantine/core';
import { ReactNode } from 'react';

import { useTranslation } from '../../providers/i18n-provider';
import { Icon } from './icon';

interface AppModalProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

export function AppModal({ opened, onClose, title, subtitle, size = 'lg', children, footer }: AppModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size={size}
      centered
      withCloseButton={false}
      padding={0}
      radius="xl"
      transitionProps={{ transition: 'pop', duration: 180 }}
      classNames={{ content: 'bg-surface-container-lowest' }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant/30 px-6 py-4">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h2>
          {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/30 px-6 py-4">
          {footer}
        </div>
      )}
    </Modal>
  );
}
