import {
  STOREFRONT_MOTION_PRESET_VALUES,
  STOREFRONT_MOTION_PROFILES,
  type StorefrontDocument,
  type StorefrontExperiment,
  type StorefrontMotionPreset,
  type StorefrontSection,
} from '@ecommerce/shared';

export type ExperimentVariant = 'A' | 'B';

type HeroSection = Extract<StorefrontSection, { type: 'hero' }>;

/**
 * Hash FNV-1a de 32 bits. Es determinístico y suficiente para repartir
 * visitantes entre dos variantes sin guardar una tabla de asignaciones.
 */
export function hashExperimentKey(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function assignExperimentVariant(
  experiment: StorefrontExperiment,
  visitorId: string,
): ExperimentVariant {
  const bucket = hashExperimentKey(`${visitorId}:${experiment.id}`) % 100;
  return bucket < experiment.split ? 'B' : 'A';
}

export function isExperimentWithinWindow(
  experiment: StorefrontExperiment,
  now = Date.now(),
): boolean {
  const startsAt = experiment.startedAt ? new Date(experiment.startedAt).getTime() : null;
  const endsAt = experiment.endedAt ? new Date(experiment.endedAt).getTime() : null;

  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) return false;
  if (endsAt !== null && Number.isFinite(endsAt) && endsAt < now) return false;
  return true;
}

function isMotionPreset(value: string): value is StorefrontMotionPreset {
  return (STOREFRONT_MOTION_PRESET_VALUES as readonly string[]).includes(value);
}

export function findExperimentHero(
  doc: StorefrontDocument,
  experiment: StorefrontExperiment,
): HeroSection | null {
  const heroes = doc.pages.home.sections.filter(
    (section): section is HeroSection => section.type === 'hero' && section.visible,
  );

  if (experiment.sectionId) {
    return heroes.find((hero) => hero.id === experiment.sectionId) ?? null;
  }

  return heroes[0] ?? null;
}

export function getActiveExperiment(
  doc: StorefrontDocument,
  now = Date.now(),
): StorefrontExperiment | null {
  return (
    (doc.experiments ?? []).find((experiment) => {
      if (!experiment.enabled || !isExperimentWithinWindow(experiment, now)) return false;

      const target = experiment.target ?? 'heroTitle';
      if (target === 'motion') {
        return (
          isMotionPreset(experiment.variantA.trim()) &&
          isMotionPreset(experiment.variantB.trim())
        );
      }

      return (
        target === 'heroTitle' &&
        experiment.variantB.trim().length > 0 &&
        Boolean(findExperimentHero(doc, experiment))
      );
    }) ?? null
  );
}

/**
 * Devuelve una copia del documento con el título del hero que corresponde a la
 * variante asignada. El resto del documento no se modifica.
 */
export function applyExperimentToDocument(
  doc: StorefrontDocument,
  experiment: StorefrontExperiment,
  variant: ExperimentVariant,
): StorefrontDocument {
  if ((experiment.target ?? 'heroTitle') === 'motion') {
    const selected = variant === 'B' ? experiment.variantB.trim() : experiment.variantA.trim();
    if (!isMotionPreset(selected)) return doc;

    const profile = STOREFRONT_MOTION_PROFILES[selected];
    const next = structuredClone(doc);
    next.motion = {
      ...profile,
      parallax: doc.motion?.parallax ?? 'none',
      pageTransition: doc.motion?.pageTransition ?? false,
    };
    return next;
  }

  const hero = findExperimentHero(doc, experiment);
  if (!hero) return doc;

  const title =
    variant === 'B'
      ? experiment.variantB.trim() || hero.settings.title
      : experiment.variantA.trim() || hero.settings.title;

  if (title === hero.settings.title) return doc;

  const next = structuredClone(doc);
  const target = next.pages.home.sections.find(
    (section) => section.type === 'hero' && section.id === hero.id,
  ) as HeroSection | undefined;
  if (target) target.settings.title = title;
  return next;
}
