type FeatureToggle = {
  enabled: boolean;
  owner: string;
  reason: string;
  expiresAt: string;
};

export const features = {
  voiceMode: {
    enabled: true,
    owner: 'loftwah',
    reason: 'Demoing speech synthesis for order playback',
    expiresAt: '2026-01-01',
  },
  surpriseMe: {
    enabled: true,
    owner: 'loftwah',
    reason: 'Allows chef-driven random cart additions',
    expiresAt: '2026-01-01',
  },
  shareLinks: {
    enabled: true,
    owner: 'loftwah',
    reason: 'Generate share URLs for mock orders',
    expiresAt: '2026-01-01',
  },
} satisfies Record<string, FeatureToggle>;

export const isFeatureEnabled = (flag: keyof typeof features) =>
  features[flag]?.enabled ?? false;
