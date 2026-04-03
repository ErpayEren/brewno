export const PRODUCT_MANIFEST = {
  vision: 'coffee memory + discovery + social ritual',
  tone: 'Confident, warm, precise, and sensory.',
  valuePillars: [
    'Remember every cup with meaningful context.',
    'Discover better coffees faster with transparent recommendations.',
    'Turn coffee into a social ritual through trusted community signals.',
  ],
  successMetrics: [
    'Onboarding completion rate',
    'Check-in completion rate',
    'Recommendation CTR',
    'D7 retention',
    'D30 retention',
    'Crash-free sessions',
  ],
} as const;

export const TAB_PRIMARY_JOBS: Record<'home' | 'discover' | 'checkin' | 'map' | 'profile', string> = {
  home: 'Personal coffee command center for feed, recommendations, and quick actions.',
  discover: 'Find the right coffee with powerful search, filters, and ranking context.',
  checkin: 'Capture one cup quickly with accurate details and tasting memory.',
  map: 'Navigate specialty cafés nearby with quality signals and context.',
  profile: 'Track taste evolution, achievements, and trust signals.',
};

export const PERFORMANCE_BUDGETS = {
  firstMeaningfulPaintMs: 2200,
  firstInteractionMs: 120,
  listScrollFps: 55,
  animationTargetFps: 60,
} as const;

export const ACCESSIBILITY_STANDARDS = {
  minTouchTarget: 44,
  minContrastRatio: 4.5,
  supportScreenReader: true,
  supportReducedMotion: true,
} as const;

export const MOTION_PRINCIPLES = [
  'Fast in, gentle out',
  'Inform state change, never distract',
  'Prioritize readability during motion',
] as const;

export const HAPTIC_STANDARDS = {
  selection: 'Light feedback for taps and filter picks.',
  success: 'Strong confirmation on successful check-in.',
  warning: 'Medium warning for invalid step actions.',
  error: 'Strong alert for failing save flows.',
} as const;

