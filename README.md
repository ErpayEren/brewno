# brewno

Premium coffee memory product built with Expo + Supabase.

## Product Manifest

**Vision:** coffee memory + discovery + social ritual

### Emotional tone
- Confident
- Warm
- Precise
- Sensory

### Three value pillars
1. Remember every cup with context and continuity.
2. Discover coffees faster with transparent recommendation logic.
3. Build social ritual through trusted community signals.

### Success metrics
- Onboarding completion
- Check-in completion
- Recommendation click-through rate
- D7 / D30 retention
- Crash-free sessions

## Information Architecture (Tab primary jobs)
- **Home:** Personal command center for recommendations, activity, and quick actions.
- **Discover:** Search/filter/sort engine for finding the right coffee.
- **Check-in:** Fast one-hand ritual capture flow.
- **Map:** Specialty navigator with quality signals and filtering.
- **Profile:** Taste progression, badges, trust level, and history.

## Design System + Experience Standards
- Tokens: `/home/runner/work/brewno/brewno/constants/tokens.ts`
- Experience standards: `/home/runner/work/brewno/brewno/constants/experience.ts`
- Brand microcopy: `/home/runner/work/brewno/brewno/constants/content.ts`
- Analytics event map: `/home/runner/work/brewno/brewno/constants/analytics.ts`
- Release quality gate: `/home/runner/work/brewno/brewno/docs/quality-gate.md`

## Roadmap (3 phases)

### Phase 1 — Quality & consistency baseline
- Unify token usage and copy voice across critical screens
- Strengthen step validations and accessibility labels
- Instrument core product events

### Phase 2 — Premium interaction & discovery depth
- Expand recommendation explanations and ranking transparency
- Deepen discover and map filtering/routing context
- Improve progressive loading and animation smoothness

### Phase 3 — Community + personalization polish
- Richer social graph and trust indicators
- Advanced progression systems and badge storytelling
- Final award-level polish pass with quality gate enforcement

## Local development

Install dependencies:

```bash
npm install
```

Run app:

```bash
npx expo start
```

Run lint:

```bash
npm run lint
```

