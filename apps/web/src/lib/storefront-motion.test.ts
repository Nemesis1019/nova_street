import { STOREFRONT_MOTION_PROFILES } from '@ecommerce/shared';
import { describe, expect, it } from 'vitest';

import {
  isStickyStoryMedia,
  marqueeMotion,
  pageTransitionEnabled,
  resolveSectionHover,
  resolveSectionParallax,
  resolveSectionReveal,
  storefrontHoverVars,
  storefrontMotionVars,
} from './storefront-motion';

describe('storefront motion', () => {
  it('maps the editorial profile to slow, visible motion', () => {
    const vars = storefrontMotionVars(STOREFRONT_MOTION_PROFILES.editorial);
    expect(vars['--sf-motion-duration']).toBe('700ms');
    expect(vars['--sf-motion-distance']).toBe('22px');
    expect(vars['--sf-hover-zoom']).toBe('1.055');
    expect(vars['--sf-image-zoom-scale']).toBe('1.055');
  });

  it('maps the kinetic profile to fast hover and image swap', () => {
    const vars = storefrontMotionVars(STOREFRONT_MOTION_PROFILES.kinetic);
    expect(vars['--sf-motion-duration']).toBe('380ms');
    expect(vars['--sf-hover-swap-opacity']).toBe('1');
    expect(vars['--sf-cta-lift']).toBe('-2px');
  });

  it('disables decorative motion in the none profile', () => {
    const vars = storefrontMotionVars(STOREFRONT_MOTION_PROFILES.none);
    expect(vars['--sf-motion-duration']).toBe('0ms');
    expect(vars['--sf-hover-lift']).toBe('0px');
    expect(vars['--sf-hover-swap-opacity']).toBe('0');
  });

  it('resolves section reveal overrides and skips the hero wrapper', () => {
    const motion = STOREFRONT_MOTION_PROFILES.editorial;
    expect(resolveSectionReveal(motion, undefined, 'productGrid')).toBe('rise');
    expect(resolveSectionReveal(motion, undefined, 'hero')).toBe('none');
    expect(
      resolveSectionReveal(
        motion,
        { reveal: 'clip', delay: 'none', hover: 'inherit', parallax: 'inherit', stickyMedia: false },
        'productGrid',
      ),
    ).toBe('clip');
  });

  it('resolves hover overrides and emits only explicit section values', () => {
    const motion = STOREFRONT_MOTION_PROFILES.editorial;
    expect(resolveSectionHover(motion, undefined)).toBe('zoom');
    expect(
      resolveSectionHover(
        motion,
        { reveal: 'inherit', delay: 'none', hover: 'none', parallax: 'inherit', stickyMedia: false },
      ),
    ).toBe('none');
    expect(storefrontHoverVars('swap')).toMatchObject({
      '--sf-hover-swap-opacity': '1',
    });
  });

  it('resolves parallax only for hero/story and respects overrides', () => {
    const motion = { ...STOREFRONT_MOTION_PROFILES.editorial, parallax: 'subtle' as const };
    expect(resolveSectionParallax(motion, undefined, 'hero')).toBe('subtle');
    expect(resolveSectionParallax(motion, undefined, 'story')).toBe('subtle');
    expect(resolveSectionParallax(motion, undefined, 'productGrid')).toBe('none');
    expect(
      resolveSectionParallax(
        motion,
        { reveal: 'inherit', delay: 'none', hover: 'inherit', parallax: 'none', stickyMedia: false },
        'hero',
      ),
    ).toBe('none');
  });

  it('resolves sticky story and page transition flags', () => {
    expect(
      isStickyStoryMedia({
        reveal: 'inherit',
        delay: 'none',
        hover: 'inherit',
        parallax: 'inherit',
        stickyMedia: true,
      }),
    ).toBe(true);
    expect(pageTransitionEnabled({ ...STOREFRONT_MOTION_PROFILES.editorial, pageTransition: true })).toBe(true);
    expect(pageTransitionEnabled(STOREFRONT_MOTION_PROFILES.none)).toBe(false);
  });

  it('provides accessible marquee defaults per profile', () => {
    expect(marqueeMotion(STOREFRONT_MOTION_PROFILES.kinetic)).toMatchObject({
      duration: 18,
      direction: 'normal',
      pausedByDefault: false,
      allowControl: true,
    });
    expect(marqueeMotion(STOREFRONT_MOTION_PROFILES.none)).toMatchObject({
      pausedByDefault: true,
      allowControl: false,
    });
    expect(
      marqueeMotion({
        ...STOREFRONT_MOTION_PROFILES.editorial,
        marquee: 'reverse',
      }).direction,
    ).toBe('reverse');
  });
});
