import type {
  StorefrontMotion,
  StorefrontSectionMotion,
  StorefrontSectionType,
} from '@ecommerce/shared';

type HoverMode = StorefrontMotion['hover'];
type RevealMode = StorefrontMotion['reveal'];
type SectionRevealMode = StorefrontSectionMotion['reveal'];

const DURATIONS = {
  slow: 700,
  normal: 520,
  fast: 380,
} as const;

const HOVER_DURATIONS = {
  slow: 300,
  normal: 220,
  fast: 160,
} as const;

const REVEAL_DISTANCES = {
  none: '0px',
  quiet: '10px',
  editorial: '22px',
  kinetic: '30px',
} as const;

const EASINGS = {
  none: 'ease',
  quiet: 'ease-out',
  editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
  kinetic: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

function hoverValues(hover: HoverMode | 'inherit' | undefined) {
  switch (hover) {
    case 'zoom':
      return { lift: '0px', zoom: '1.055', swap: '0', fallbackZoom: '1.055' };
    case 'swap':
      return { lift: '0px', zoom: '1.01', swap: '1', fallbackZoom: '1.045' };
    case 'lift':
      return { lift: '-4px', zoom: '1', swap: '0', fallbackZoom: '1' };
    default:
      return { lift: '0px', zoom: '1', swap: '0', fallbackZoom: '1' };
  }
}

function ctaValues(cta: StorefrontMotion['cta']) {
  switch (cta) {
    case 'arrow':
      return { lift: '0px', arrowX: '3px', arrowY: '-3px' };
    case 'lift':
      return { lift: '-2px', arrowX: '0px', arrowY: '0px' };
    default:
      return { lift: '0px', arrowX: '0px', arrowY: '0px' };
  }
}

/**
 * Variables CSS del movimiento. Se inyectan como scope (body para publicado,
 * wrapper para preview) y los componentes compartidos las consumen.
 */
export function storefrontMotionVars(
  motion?: StorefrontMotion | null,
): Record<string, string> {
  const preset = motion?.preset ?? 'none';
  const speed = motion?.speed ?? 'normal';
  const hover = hoverValues(motion?.hover ?? 'lift');
  const cta = ctaValues(motion?.cta ?? 'arrow');
  const duration = DURATIONS[speed];
  const hoverDuration = HOVER_DURATIONS[speed];
  const imageZoom = motion?.imageMotion === 'zoom';

  return {
    '--sf-motion-duration': motion?.preset === 'none' ? '0ms' : `${duration}ms`,
    '--sf-motion-ease': EASINGS[preset],
    '--sf-motion-distance': REVEAL_DISTANCES[preset],
    '--sf-motion-stagger': `${motion?.stagger ?? 0}ms`,
    '--sf-hover-duration': `${hoverDuration}ms`,
    '--sf-hover-lift': hover.lift,
    '--sf-hover-zoom': hover.zoom,
    '--sf-hover-swap-opacity': hover.swap,
    '--sf-hover-swap-fallback-zoom': hover.fallbackZoom,
    '--sf-cta-lift': cta.lift,
    '--sf-cta-arrow-x': cta.arrowX,
    '--sf-cta-arrow-y': cta.arrowY,
    '--sf-image-zoom-scale': imageZoom ? '1.055' : '1',
    '--sf-image-zoom-duration': speed === 'slow' ? '14s' : speed === 'fast' ? '9s' : '11s',
  };
}

/** Override de hover para una sección; hereda del perfil global si no aplica. */
export function storefrontHoverVars(
  hover?: HoverMode | 'inherit' | null,
): Record<string, string> {
  if (!hover || hover === 'inherit') return {};
  const values = hoverValues(hover);
  return {
    '--sf-hover-lift': values.lift,
    '--sf-hover-zoom': values.zoom,
    '--sf-hover-swap-opacity': values.swap,
    '--sf-hover-swap-fallback-zoom': values.fallbackZoom,
  };
}

export function isMotionEnabled(motion?: StorefrontMotion | null): boolean {
  return Boolean(motion && motion.preset !== 'none');
}

export function resolveSectionReveal(
  motion: StorefrontMotion | null | undefined,
  sectionMotion: StorefrontSectionMotion | undefined,
  sectionType: StorefrontSectionType,
): RevealMode {
  const override = sectionMotion?.reveal ?? 'inherit';
  if (override !== 'inherit') return override;
  if (sectionType === 'hero' || sectionType === 'scrollStory') return 'none';
  if (!isMotionEnabled(motion)) return 'none';
  return motion?.reveal ?? 'none';
}

export function resolveSectionHover(
  motion: StorefrontMotion | null | undefined,
  sectionMotion: StorefrontSectionMotion | undefined,
): HoverMode {
  const override = sectionMotion?.hover ?? 'inherit';
  if (override !== 'inherit') return override;
  return motion?.hover ?? 'lift';
}

export function resolveSectionParallax(
  motion: StorefrontMotion | null | undefined,
  sectionMotion: StorefrontSectionMotion | undefined,
  sectionType: StorefrontSectionType,
): 'none' | 'subtle' | 'strong' {
  if (
    sectionType !== 'hero' &&
    sectionType !== 'story' &&
    sectionType !== 'scrollStory'
  ) {
    return 'none';
  }
  const override = sectionMotion?.parallax ?? 'inherit';
  if (override !== 'inherit') return override;
  if (!isMotionEnabled(motion)) return 'none';
  return motion?.parallax ?? 'none';
}

export function isStickyStoryMedia(
  sectionMotion: StorefrontSectionMotion | undefined,
): boolean {
  return sectionMotion?.stickyMedia === true;
}

export function pageTransitionEnabled(
  motion: StorefrontMotion | null | undefined,
): boolean {
  return Boolean(motion?.pageTransition && isMotionEnabled(motion));
}

export function marqueeMotion(motion?: StorefrontMotion | null) {
  const setting = motion?.marquee ?? 'normal';
  const duration =
    setting === 'fast' ? 18 : setting === 'slow' ? 36 : setting === 'paused' ? 36 : 28;

  return {
    duration,
    direction: setting === 'reverse' ? ('reverse' as const) : ('normal' as const),
    pausedByDefault: setting === 'paused',
    allowControl: setting !== 'paused',
  };
}

export function sectionRevealDelay(delay: StorefrontSectionMotion['delay'] | undefined) {
  return delay ?? 'none';
}

export type SectionReveal = SectionRevealMode;
