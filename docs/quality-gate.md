# Brewno Premium Quality Gate

Every release must pass this checklist before shipping.

## 1) Visual Consistency
- [ ] Uses design tokens only (color, spacing, radius, type).
- [ ] Cards/panels/pills follow shared visual language.
- [ ] Microcopy matches brand tone.

## 2) Interaction Consistency
- [ ] Motion follows motion principles.
- [ ] Haptics are used on key interactions.
- [ ] Step flows validate user input before progression.

## 3) Accessibility
- [ ] Touch targets are at least 44x44.
- [ ] Critical controls have accessibility labels/roles.
- [ ] Contrast and text hierarchy are readable.
- [ ] Reduced motion path is considered for heavy animations.

## 4) Performance
- [ ] First meaningful paint target respected.
- [ ] Initial interaction remains responsive.
- [ ] List and motion performance stay within FPS targets.
- [ ] Expensive visuals are memoized or bounded.

## 5) Product Metrics
- [ ] Event names mapped to funnel (onboarding, check-in, recommendation).
- [ ] CTR and retention metrics are queryable.
- [ ] Crash-free session metric is monitored.

