import { z } from 'zod';

type FeatureToggle = {
  enabled: boolean;
  rolloutPercentage: number;
  owner: string;
  reason: string;
  expiresAt: string;
  killSwitchNote?: string;
};

const hashToBucket = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
};

const FeatureToggleSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  owner: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1),
  killSwitchNote: z.string().trim().min(1).optional(),
});

const FeaturesSchema = z.object({
  voiceMode: FeatureToggleSchema,
  surpriseMe: FeatureToggleSchema,
  shareLinks: FeatureToggleSchema,
  analyticsDashboard: FeatureToggleSchema,
});

export const features = {
  voiceMode: {
    enabled: true,
    rolloutPercentage: 100,
    owner: 'loftwah',
    reason: 'Demoing speech synthesis for order playback',
    expiresAt: '2026-01-01',
    killSwitchNote: 'Disable for browsers without speech synthesis.',
  },
  surpriseMe: {
    enabled: true,
    rolloutPercentage: 100,
    owner: 'loftwah',
    reason: 'Allows chef-driven random cart additions',
    expiresAt: '2026-01-01',
  },
  shareLinks: {
    enabled: true,
    rolloutPercentage: 100,
    owner: 'loftwah',
    reason: 'Generate share URLs for mock orders',
    expiresAt: '2026-01-01',
  },
  analyticsDashboard: {
    enabled: true,
    rolloutPercentage: 100,
    owner: 'loftwah',
    reason: 'Expose mock telemetry and charting surfaces',
    expiresAt: '2026-01-01',
  },
} satisfies Record<string, FeatureToggle>;

(() => {
  const validation = FeaturesSchema.safeParse(features);
  if (!validation.success && typeof console !== 'undefined') {
    console.warn(
      '[features] Feature toggle configuration failed validation',
      validation.error,
    );
  }
})();

export const isFeatureEnabled = (
  flag: keyof typeof features,
  seed?: string,
) => {
  const feature = features[flag];
  if (!feature || !feature.enabled) return false;
  if (!seed) return feature.rolloutPercentage === 100;
  return hashToBucket(seed) < feature.rolloutPercentage;
};
