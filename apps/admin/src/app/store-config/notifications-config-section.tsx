'use client';

import {
  NOTIFICATION_STYLE_PRESETS,
  type NotificationAppearance,
  type NotificationStyle,
  resolveNotificationAppearance,
} from '@ecommerce/shared';
import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { useTranslation } from '../../providers/i18n-provider';

type NotificationPreset = NotificationAppearance & { id: string; name: string };
type NotificationSettings = NotificationAppearance;

interface NotificationSettingsSectionProps {
  value: NotificationSettings;
  presets: NotificationPreset[];
  onChange: (value: NotificationSettings) => void;
  onPresetsChange: (presets: NotificationPreset[]) => void;
}

const STYLE_OPTIONS: NotificationStyle[] = ['editorial', 'minimal', 'solid'];
const POSITION_OPTIONS: NotificationSettings['position'][] = [
  'top-right',
  'top-center',
  'bottom-right',
  'bottom-center',
];

function styleLabel(style: NotificationStyle, t: (key: string) => string) {
  if (style === 'minimal') return t('pages.storeConfig.notificationMinimal');
  if (style === 'solid') return t('pages.storeConfig.notificationSolid');
  return t('pages.storeConfig.notificationEditorial');
}

function positionLabel(position: NotificationSettings['position'], t: (key: string) => string) {
  if (position === 'top-center') return t('pages.storeConfig.notificationTopCenter');
  if (position === 'bottom-right') return t('pages.storeConfig.notificationBottomRight');
  if (position === 'bottom-center') return t('pages.storeConfig.notificationBottomCenter');
  return t('pages.storeConfig.notificationTopRight');
}

function normalized(value: NotificationSettings) {
  return JSON.stringify({
    style: value.style,
    position: value.position,
    backgroundColor: value.backgroundColor,
    textColor: value.textColor,
    borderColor: value.borderColor,
    accentColor: value.accentColor,
    borderWidth: value.borderWidth,
    borderRadius: value.borderRadius,
    shadow: value.shadow,
    titleFont: value.titleFont,
    titleSize: value.titleSize,
    messageSize: value.messageSize,
    uppercaseTitle: value.uppercaseTitle,
  });
}

function NotificationPreview({ appearance }: { appearance: NotificationSettings }) {
  const { t } = useTranslation();
  const resolved = resolveNotificationAppearance(appearance);
  const vertical = appearance.position.startsWith('top') ? 'items-start' : 'items-end';
  const horizontal = appearance.position.endsWith('right')
    ? 'justify-end'
    : appearance.position.endsWith('center')
      ? 'justify-center'
      : 'justify-start';
  const fontFamily =
    resolved.titleFont === 'mono'
      ? 'var(--font-jetbrains-mono), monospace'
      : resolved.titleFont === 'sans'
        ? 'var(--font-inter), sans-serif'
        : 'var(--font-bebas-neue), Impact, sans-serif';
  const shadow =
    resolved.shadow === 'none'
      ? 'none'
      : resolved.shadow === 'soft'
        ? '0 10px 30px rgba(13, 13, 13, 0.16)'
        : '6px 6px 0 rgba(13, 13, 13, 0.18)';

  return (
    <div className="mt-5">
      <p className="mb-2 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
        {t('pages.storeConfig.notificationPreviewTitle')}
      </p>
      <div
        className={`relative flex h-64 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 ${vertical} ${horizontal}`}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 380,
            overflow: 'hidden',
            padding: '12px 36px 12px 18px',
            background: resolved.backgroundColor,
            color: resolved.textColor,
            border: `${resolved.borderWidth}px solid ${resolved.borderColor}`,
            borderRadius: resolved.borderRadius,
            boxShadow: shadow,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '0 auto 0 0',
              width: 4,
              background: resolved.accentColor,
            }}
          />
          <p
            style={{
              margin: 0,
              fontFamily,
              fontSize: resolved.titleSize,
              lineHeight: 1,
              letterSpacing: '0.035em',
              textTransform: resolved.uppercaseTitle ? 'uppercase' : 'none',
            }}
          >
            {t('pages.storeConfig.notificationSampleTitle')}
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: resolved.messageSize,
              lineHeight: 1.55,
              opacity: 0.8,
            }}
          >
            {t('pages.storeConfig.notificationSampleMessage')}
          </p>
          <Icon name="close" className="absolute right-2 top-2 text-[16px] opacity-60" />
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value?: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const color = value || fallback;
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-outline/70 bg-white p-1"
        />
        <Input value={color} onChange={(event) => onChange(event.currentTarget.value)} />
      </div>
    </Field>
  );
}

export function NotificationSettingsSection({
  value,
  presets,
  onChange,
  onPresetsChange,
}: NotificationSettingsSectionProps) {
  const { t } = useTranslation();
  const resolved = resolveNotificationAppearance(value);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const update = (next: Partial<NotificationSettings>) => {
    onChange({ ...value, ...next });
  };

  const startCreate = () => {
    setName('');
    setCreating(true);
  };

  const savePreset = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const preset: NotificationPreset = {
      ...value,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `notification-${Date.now()}`,
      name: cleanName,
    };
    onPresetsChange([...presets, preset]);
    setCreating(false);
    setName('');
  };

  const applyPreset = (preset: NotificationPreset) => {
    const { id: _id, name: _name, ...appearance } = preset;
    onChange(appearance);
  };

  return (
    <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {t('pages.storeConfig.notificationAppearanceTitle')}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('pages.storeConfig.notificationAppearanceSubtitle')}
          </p>
        </div>
        <Button variant="secondary" icon="bookmark_add" onClick={startCreate}>
          {t('pages.storeConfig.notificationSaveConfig')}
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('pages.storeConfig.notificationStyle')}>
          <Select
            value={value.style}
            onChange={(event) =>
              update({ style: event.currentTarget.value as NotificationStyle })
            }
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {styleLabel(option, t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('pages.storeConfig.notificationPosition')}>
          <Select
            value={value.position}
            onChange={(event) =>
              update({
                position: event.currentTarget.value as NotificationSettings['position'],
              })
            }
          >
            {POSITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {positionLabel(option, t)}
              </option>
            ))}
          </Select>
        </Field>
        <ColorField
          label={t('pages.storeConfig.notificationBackground')}
          value={value.backgroundColor}
          fallback={resolved.backgroundColor}
          onChange={(backgroundColor) => update({ backgroundColor })}
        />
        <ColorField
          label={t('pages.storeConfig.notificationTextColor')}
          value={value.textColor}
          fallback={resolved.textColor}
          onChange={(textColor) => update({ textColor })}
        />
        <ColorField
          label={t('pages.storeConfig.notificationBorderColor')}
          value={value.borderColor}
          fallback={resolved.borderColor}
          onChange={(borderColor) => update({ borderColor })}
        />
        <ColorField
          label={t('pages.storeConfig.notificationAccentColor')}
          value={value.accentColor}
          fallback={resolved.accentColor}
          onChange={(accentColor) => update({ accentColor })}
        />
        <Field label={t('pages.storeConfig.notificationBorderWidth')}>
          <Input
            type="number"
            min={0}
            max={8}
            value={resolved.borderWidth}
            onChange={(event) => update({ borderWidth: Number(event.currentTarget.value) })}
          />
        </Field>
        <Field label={t('pages.storeConfig.notificationBorderRadius')}>
          <Input
            type="number"
            min={0}
            max={32}
            value={resolved.borderRadius}
            onChange={(event) => update({ borderRadius: Number(event.currentTarget.value) })}
          />
        </Field>
        <Field label={t('pages.storeConfig.notificationShadow')}>
          <Select
            value={resolved.shadow}
            onChange={(event) =>
              update({ shadow: event.currentTarget.value as NotificationSettings['shadow'] })
            }
          >
            <option value="none">{t('pages.storeConfig.notificationShadowNone')}</option>
            <option value="soft">{t('pages.storeConfig.notificationShadowSoft')}</option>
            <option value="hard">{t('pages.storeConfig.notificationShadowHard')}</option>
          </Select>
        </Field>
        <Field label={t('pages.storeConfig.notificationTitleFont')}>
          <Select
            value={resolved.titleFont}
            onChange={(event) =>
              update({
                titleFont: event.currentTarget.value as NotificationSettings['titleFont'],
              })
            }
          >
            <option value="display">{t('pages.storeConfig.notificationFontDisplay')}</option>
            <option value="mono">{t('pages.storeConfig.notificationFontMono')}</option>
            <option value="sans">{t('pages.storeConfig.notificationFontSans')}</option>
          </Select>
        </Field>
        <Field label={t('pages.storeConfig.notificationTitleSize')}>
          <Input
            type="number"
            min={12}
            max={48}
            value={resolved.titleSize}
            onChange={(event) => update({ titleSize: Number(event.currentTarget.value) })}
          />
        </Field>
        <Field label={t('pages.storeConfig.notificationMessageSize')}>
          <Input
            type="number"
            min={9}
            max={20}
            value={resolved.messageSize}
            onChange={(event) => update({ messageSize: Number(event.currentTarget.value) })}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
        <span className="font-body-sm text-body-sm font-semibold text-on-surface">
          {t('pages.storeConfig.notificationUppercase')}
        </span>
        <Switch
          checked={resolved.uppercaseTitle}
          onChange={(checked) => update({ uppercaseTitle: checked })}
          label={t('pages.storeConfig.notificationUppercase')}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          icon="restart_alt"
          onClick={() => onChange({ ...NOTIFICATION_STYLE_PRESETS[value.style], style: value.style, position: value.position })}
        >
          {t('pages.storeConfig.notificationResetStyle')}
        </Button>
      </div>

      <NotificationPreview appearance={value} />

      {creating && (
        <div className="mt-5 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={t('pages.storeConfig.notificationConfigName')} className="flex-1">
              <Input
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder={t('pages.storeConfig.notificationConfigNamePlaceholder')}
              />
            </Field>
            <div className="flex gap-2">
              <Button icon="check" onClick={savePreset} disabled={!name.trim()}>
                {t('pages.storeConfig.notificationSave')}
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
          <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">
            {t('pages.storeConfig.notificationSaveConfigHint')}
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-outline-variant/30 pt-4">
        <p className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
          {t('pages.storeConfig.notificationSavedConfigs')}
        </p>
        {presets.length === 0 ? (
          <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
            {t('pages.storeConfig.notificationNoConfigs')}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {presets.map((preset) => {
              const active = normalized({ ...preset }) === normalized(value);
              return (
                <div
                  key={preset.id}
                  className="flex flex-col gap-3 rounded-lg bg-surface-container-low px-3 py-2.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md font-semibold text-on-surface">
                      {preset.name}
                    </p>
                    <p className="font-body-sm text-[12px] text-on-surface-variant">
                      {styleLabel(preset.style, t)} · {positionLabel(preset.position, t)}
                    </p>
                  </div>
                  {active && (
                    <span className="w-fit rounded-full bg-primary px-2 py-0.5 font-label-sm text-label-sm text-on-primary">
                      {t('pages.storeConfig.notificationActive')}
                    </span>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => applyPreset(preset)}>
                      {t('pages.storeConfig.notificationApply')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onPresetsChange(presets.filter((item) => item.id !== preset.id))}
                    >
                      {t('pages.storeConfig.notificationDelete')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
