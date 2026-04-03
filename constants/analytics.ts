export const ANALYTICS_EVENTS = {
  onboardingStarted: 'onboarding_started',
  onboardingCompleted: 'onboarding_completed',
  checkinStarted: 'checkin_started',
  checkinCompleted: 'checkin_completed',
  recommendationImpression: 'recommendation_impression',
  recommendationClick: 'recommendation_click',
  discoverFilterApplied: 'discover_filter_applied',
  mapFilterApplied: 'map_filter_applied',
  sessionCrash: 'session_crash',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  // Placeholder instrumentation sink.
  // Integrate with real analytics provider in production.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, payload);
  }
}

