export type NotificationStyle = 'editorial' | 'minimal' | 'solid';
export type NotificationPosition =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center';

export type NotificationShadow = 'none' | 'soft' | 'hard';
export type NotificationTitleFont = 'display' | 'mono' | 'sans';

export interface NotificationAppearance {
  style: NotificationStyle;
  position: NotificationPosition;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: NotificationShadow;
  titleFont?: NotificationTitleFont;
  titleSize?: number;
  messageSize?: number;
  uppercaseTitle?: boolean;
}

export interface ResolvedNotificationAppearance {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  borderWidth: number;
  borderRadius: number;
  shadow: NotificationShadow;
  titleFont: NotificationTitleFont;
  titleSize: number;
  messageSize: number;
  uppercaseTitle: boolean;
}

export const NOTIFICATION_STYLE_PRESETS: Record<
  NotificationStyle,
  ResolvedNotificationAppearance
> = {
  editorial: {
    backgroundColor: '#fcf9f8',
    textColor: '#0d0d0d',
    borderColor: '#0d0d0d',
    accentColor: '#6f7a4e',
    borderWidth: 1,
    borderRadius: 0,
    shadow: 'hard',
    titleFont: 'display',
    titleSize: 21,
    messageSize: 11,
    uppercaseTitle: true,
  },
  minimal: {
    backgroundColor: '#ffffff',
    textColor: '#0d0d0d',
    borderColor: '#0d0d0d',
    accentColor: '#6f7a4e',
    borderWidth: 0,
    borderRadius: 0,
    shadow: 'soft',
    titleFont: 'sans',
    titleSize: 18,
    messageSize: 12,
    uppercaseTitle: false,
  },
  solid: {
    backgroundColor: '#0d0d0d',
    textColor: '#fcf9f8',
    borderColor: '#0d0d0d',
    accentColor: '#6f7a4e',
    borderWidth: 1,
    borderRadius: 0,
    shadow: 'hard',
    titleFont: 'display',
    titleSize: 21,
    messageSize: 11,
    uppercaseTitle: true,
  },
};

function defined<T>(value: T | undefined, fallback: T): T {
  return value === undefined || value === '' ? fallback : value;
}

export function resolveNotificationAppearance(
  appearance: Partial<NotificationAppearance> & { style: NotificationStyle },
): ResolvedNotificationAppearance {
  const preset = NOTIFICATION_STYLE_PRESETS[appearance.style] ?? NOTIFICATION_STYLE_PRESETS.editorial;
  return {
    backgroundColor: defined(appearance.backgroundColor, preset.backgroundColor),
    textColor: defined(appearance.textColor, preset.textColor),
    borderColor: defined(appearance.borderColor, preset.borderColor),
    accentColor: defined(appearance.accentColor, preset.accentColor),
    borderWidth: defined(appearance.borderWidth, preset.borderWidth),
    borderRadius: defined(appearance.borderRadius, preset.borderRadius),
    shadow: defined(appearance.shadow, preset.shadow),
    titleFont: defined(appearance.titleFont, preset.titleFont),
    titleSize: defined(appearance.titleSize, preset.titleSize),
    messageSize: defined(appearance.messageSize, preset.messageSize),
    uppercaseTitle: defined(appearance.uppercaseTitle, preset.uppercaseTitle),
  };
}
