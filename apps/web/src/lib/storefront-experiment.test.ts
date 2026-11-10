import { type StorefrontDocument, StorefrontDocumentSchema, type StorefrontExperiment } from '@ecommerce/shared';
import { describe, expect, it } from 'vitest';

import {
  applyExperimentToDocument,
  assignExperimentVariant,
  findExperimentHero,
  getActiveExperiment,
} from './storefront-experiment';

function makeExperiment(overrides: Partial<StorefrontExperiment> = {}): StorefrontExperiment {
  return {
    id: 'exp-hero',
    name: 'Hero test',
    enabled: true,
    target: 'heroTitle',
    sectionId: '',
    variantA: 'Título A',
    variantB: 'Título B',
    split: 50,
    startedAt: '',
    endedAt: '',
    ...overrides,
  };
}

function makeDoc(overrides: Partial<StorefrontDocument> = {}): StorefrontDocument {
  return StorefrontDocumentSchema.parse({
    pages: {
      home: {
        sections: [
          {
            id: 'hero-1',
            type: 'hero',
            visible: true,
            variant: 'split',
            settings: {
              eyebrow: '',
              title: 'Título original',
              subtitle: '',
              imageUrl: '',
              imageFocalPoint: 'center',
              overlay: 0.3,
              align: 'left',
              minHeight: '70vh',
              ctas: [],
            },
          },
        ],
      },
    },
    ...overrides,
  });
}

describe('storefront experiments', () => {
  it('assigns the same variant to the same visitor deterministically', () => {
    const experiment = makeExperiment();
    const first = assignExperimentVariant(experiment, 'visitor-123');
    const second = assignExperimentVariant(experiment, 'visitor-123');
    expect(first).toBe(second);
    expect(['A', 'B']).toContain(first);
  });

  it('applies motion profile experiments without requiring a hero', () => {
    const experiment = makeExperiment({
      target: 'motion',
      variantA: 'quiet',
      variantB: 'kinetic',
    });
    const doc = makeDoc({ experiments: [experiment] });
    doc.pages.home.sections = [];
    doc.motion.parallax = 'subtle';
    doc.motion.pageTransition = true;

    expect(getActiveExperiment(doc)?.target).toBe('motion');
    const applied = applyExperimentToDocument(doc, experiment, 'B');
    expect(applied.motion.preset).toBe('kinetic');
    expect(applied.motion.hover).toBe('swap');
    expect(applied.motion.parallax).toBe('subtle');
    expect(applied.motion.pageTransition).toBe(true);
  });

  it('changes the assignment when the experiment changes', () => {
    const visitor = 'visitor-123';
    const assignments = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      assignments.add(
        assignExperimentVariant(makeExperiment({ id: `experiment-${index}` }), visitor),
      );
    }
    expect(assignments.size).toBe(2);
  });

  it('respects the scheduling window', () => {
    const experiment = makeExperiment({
      startedAt: '2026-10-24T10:00:00.000Z',
      endedAt: '2026-10-24T12:00:00.000Z',
    });
    const inside = new Date('2026-10-24T11:00:00.000Z').getTime();
    const before = new Date('2026-10-24T09:00:00.000Z').getTime();
    const after = new Date('2026-10-24T13:00:00.000Z').getTime();
    expect(getActiveExperiment(makeDoc({ experiments: [experiment] }), inside)?.id).toBe('exp-hero');
    expect(getActiveExperiment(makeDoc({ experiments: [experiment] }), before)).toBeNull();
    expect(getActiveExperiment(makeDoc({ experiments: [experiment] }), after)).toBeNull();
  });

  it('finds the configured hero or falls back to the first visible hero', () => {
    const doc = makeDoc();
    const hero = findExperimentHero(doc, makeExperiment());
    expect(hero?.id).toBe('hero-1');

    const missing = findExperimentHero(doc, makeExperiment({ sectionId: 'other-hero' }));
    expect(missing).toBeNull();
  });

  it('applies the title variant without mutating the original document', () => {
    const doc = makeDoc();
    const experiment = makeExperiment();
    const variantB = applyExperimentToDocument(doc, experiment, 'B');
    const variantA = applyExperimentToDocument(doc, experiment, 'A');

    expect(variantB.pages.home.sections[0]).toMatchObject({ settings: { title: 'Título B' } });
    expect(variantA.pages.home.sections[0]).toMatchObject({ settings: { title: 'Título A' } });
    expect(doc.pages.home.sections[0]).toMatchObject({ settings: { title: 'Título original' } });
  });

  it('ignores experiments without a B variant or an active hero', () => {
    const withoutB = makeDoc({ experiments: [makeExperiment({ variantB: '' })] });
    expect(getActiveExperiment(withoutB)).toBeNull();

    const withoutHero = makeDoc({ experiments: [makeExperiment()] });
    withoutHero.pages.home.sections = [];
    expect(getActiveExperiment(withoutHero)).toBeNull();
  });
});
