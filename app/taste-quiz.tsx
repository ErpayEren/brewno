// ════════════════════════════════════════════════
// BREWNO — Taste Onboarding Quiz
// Collects 8-dimensional flavour preferences to
// seed the personalised recommendation engine.
// ════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions, Platform, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import Animated, {
  FadeIn, FadeOut,
  useAnimatedStyle, useSharedValue,
  withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { Colors, Radius, Spacing, SPRING, SPRING_SNAPPY, SHADOWS } from '../constants/tokens';

const { width: W, height: H } = Dimensions.get('window');

// ─── Flavor categories ────────────────────────────────────────────────────────
const FLAVORS = [
  {
    key: 'floral',
    label: 'Floral',
    emoji: '🌸',
    tagline: 'Delicate & tea-like',
    examples: ['jasmine', 'rose', 'chamomile', 'lavender'],
    accent: '#c880b0',
    from: '#1a0e18',
    mid: '#3a1830',
  },
  {
    key: 'fruity',
    label: 'Fruity',
    emoji: '🍓',
    tagline: 'Bright & playful',
    examples: ['blueberry', 'peach', 'citrus', 'tropical'],
    accent: Colors.copper,
    from: '#1e0e06',
    mid: '#3d1f0f',
  },
  {
    key: 'sweet',
    label: 'Sweet',
    emoji: '🍯',
    tagline: 'Warm & comforting',
    examples: ['caramel', 'honey', 'vanilla', 'brown sugar'],
    accent: Colors.amber,
    from: '#1e1206',
    mid: '#3a2208',
  },
  {
    key: 'nutty',
    label: 'Nutty',
    emoji: '🍫',
    tagline: 'Rich & grounding',
    examples: ['hazelnut', 'cocoa', 'dark chocolate', 'almond'],
    accent: '#b07840',
    from: '#180e06',
    mid: '#2e1a0a',
  },
  {
    key: 'spice',
    label: 'Spice',
    emoji: '🌶️',
    tagline: 'Complex & aromatic',
    examples: ['cinnamon', 'bergamot', 'clove', 'pepper'],
    accent: '#c85040',
    from: '#180a08',
    mid: '#301410',
  },
  {
    key: 'roasted',
    label: 'Roasted',
    emoji: '☕',
    tagline: 'Deep & smoky',
    examples: ['tobacco', 'cedar', 'smoky', 'charred'],
    accent: '#906840',
    from: '#130e0a',
    mid: '#281a10',
  },
  {
    key: 'fermented',
    label: 'Fermented',
    emoji: '🍷',
    tagline: 'Bold & adventurous',
    examples: ['winey', 'whiskey', 'funky', 'kombucha'],
    accent: '#8040b0',
    from: '#130a18',
    mid: '#28104a',
  },
  {
    key: 'earthy',
    label: 'Earthy',
    emoji: '🌿',
    tagline: 'Natural & grounding',
    examples: ['herbal', 'mossy', 'mushroom', 'wet soil'],
    accent: '#508050',
    from: '#0e1408',
    mid: '#1a2810',
  },
] as const;

// ─── Preference levels ────────────────────────────────────────────────────────
const LEVELS = [
  { value: 0,    label: 'None',    short: '✕' },
  { value: 0.25, label: 'A little', short: '–' },
  { value: 0.5,  label: 'Neutral', short: '○' },
  { value: 0.75, label: 'Enjoy',   short: '♡' },
  { value: 1.0,  label: 'Love',    short: '★' },
] as const;

type FlavorKey = typeof FLAVORS[number]['key'];
type LevelValue = typeof LEVELS[number]['value'];
type Scores = Record<FlavorKey, LevelValue>;

const DEFAULT_SCORES: Scores = {
  floral: 0.5, fruity: 0.5, sweet: 0.5, nutty: 0.5,
  spice: 0.5, roasted: 0.5, fermented: 0.5, earthy: 0.5,
};

// ─── Step card ────────────────────────────────────────────────────────────────
function FlavorCard({
  flavor, selectedValue, onSelect,
}: {
  flavor: typeof FLAVORS[number];
  selectedValue: LevelValue;
  onSelect: (v: LevelValue) => void;
}) {
  const floatY = useSharedValue(0);
  const contentOp = useSharedValue(0);
  const contentY = useSharedValue(20);

  useEffect(() => {
    // Float animation loop
    const loop = () => {
      floatY.value = withSequence(
        withTiming(-14, { duration: 2600 }),
        withTiming(0, { duration: 2600 }),
      );
      setTimeout(loop, 5200);
    };
    loop();
    contentOp.value = withDelay(60, withTiming(1, { duration: 450 }));
    contentY.value = withDelay(60, withSpring(0, SPRING));
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <View style={[fc.card, { backgroundColor: flavor.from }]}>
      {/* Bloom layers */}
      <View style={[fc.bloom, { backgroundColor: flavor.mid }]} />
      <View style={[fc.bloom2, { backgroundColor: flavor.accent, opacity: 0.07 }]} />

      {/* Floating emoji watermark */}
      <Animated.Text style={[fc.bgEmoji, emojiStyle]}>{flavor.emoji}</Animated.Text>

      {/* Step content */}
      <Animated.View style={[fc.content, contentStyle]}>
        <Text style={[fc.emoji]}>{flavor.emoji}</Text>
        <Text style={[fc.label, { color: flavor.accent }]}>{flavor.label.toUpperCase()}</Text>
        <Text style={fc.tagline}>{flavor.tagline}</Text>
        <View style={[fc.accentLine, { backgroundColor: flavor.accent }]} />
        <View style={fc.examplesRow}>
          {flavor.examples.map((ex) => (
            <View key={ex} style={[fc.exChip, { borderColor: `${flavor.accent}55` }]}>
              <Text style={[fc.exText, { color: flavor.accent }]}>{ex}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Preference buttons */}
      <Animated.View style={[fc.levelsRow, contentStyle]}>
        {LEVELS.map((level) => {
          const active = selectedValue === level.value;
          return (
            <LevelButton
              key={level.value}
              level={level}
              accent={flavor.accent}
              active={active}
              onPress={() => onSelect(level.value)}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

// ─── Level button ─────────────────────────────────────────────────────────────
function LevelButton({
  level, accent, active, onPress,
}: {
  level: typeof LEVELS[number];
  accent: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.88, SPRING_SNAPPY),
      withSpring(1.0, SPRING),
    );
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={lb.touch}>
      <Animated.View
        style={[
          lb.btn,
          btnStyle,
          active
            ? { backgroundColor: accent, ...SHADOWS.copperSm, shadowColor: accent }
            : { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
        ]}
      >
        <Text style={[lb.short, { color: active ? Colors.ink : Colors.fog }]}>{level.short}</Text>
      </Animated.View>
      <Text style={[lb.label, { color: active ? accent : Colors.mist }]}>{level.label}</Text>
    </TouchableOpacity>
  );
}

const lb = StyleSheet.create({
  touch: { alignItems: 'center', gap: Spacing.xs },
  btn: {
    width: 52, height: 52, borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  short: { fontSize: 20, lineHeight: 24 },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 8, letterSpacing: 1.2, textAlign: 'center' },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total, accent }: { step: number; total: number; accent: string }) {
  const progress = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: accent,
  }));

  useEffect(() => {
    progress.value = withSpring((step + 1) / total, SPRING);
  }, [step]);

  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, barStyle]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.full, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.full },
});

// ─── Phase 1 — quick archetype cards ─────────────────────────────────────────
// Two fast questions that pre-populate the taste profile, reducing friction
// before the 8-step detail quiz.

const ARCHETYPES = [
  {
    key: 'bright_fruity',
    label: 'Bright & Fruity',
    emoji: '🍓',
    tagline: 'Light, vibrant, complex',
    accent: '#c87040',
    from: '#1e0e06',
    profile: { floral: 0.7, fruity: 0.9, sweet: 0.5, nutty: 0.1, spice: 0.2, roasted: 0.1, fermented: 0.2, earthy: 0.1 },
  },
  {
    key: 'rich_chocolatey',
    label: 'Rich & Chocolatey',
    emoji: '🍫',
    tagline: 'Sweet, warm, comforting',
    accent: '#b07840',
    from: '#180e06',
    profile: { floral: 0.1, fruity: 0.3, sweet: 0.9, nutty: 0.8, spice: 0.3, roasted: 0.5, fermented: 0.1, earthy: 0.2 },
  },
  {
    key: 'bold_smoky',
    label: 'Bold & Smoky',
    emoji: '☕',
    tagline: 'Deep, intense, full-bodied',
    accent: '#906840',
    from: '#130e0a',
    profile: { floral: 0.1, fruity: 0.2, sweet: 0.3, nutty: 0.5, spice: 0.4, roasted: 0.9, fermented: 0.3, earthy: 0.7 },
  },
  {
    key: 'sour_fermented',
    label: 'Sour & Funky',
    emoji: '🍷',
    tagline: 'Adventurous, wine-like',
    accent: '#8040b0',
    from: '#130a18',
    profile: { floral: 0.3, fruity: 0.6, sweet: 0.2, nutty: 0.1, spice: 0.5, roasted: 0.2, fermented: 0.9, earthy: 0.3 },
  },
] as const;

type ArchetypeKey = typeof ARCHETYPES[number]['key'];

const ROAST_PREFS = [
  { key: 'light',  label: 'Light Roast',  emoji: '🌤️', accent: Colors.amber,
    boost: { floral: 0.2, fruity: 0.2, sweet: 0.1, roasted: -0.1 } },
  { key: 'medium', label: 'Medium',        emoji: '⛅',  accent: Colors.copper,
    boost: { sweet: 0.1 } },
  { key: 'dark',   label: 'Dark Roast',   emoji: '🌑', accent: '#906840',
    boost: { roasted: 0.2, earthy: 0.1, floral: -0.1, fruity: -0.1 } },
] as const;

type RoastPrefKey = typeof ROAST_PREFS[number]['key'];

/** Blend archetype profile with roast preference boost and then mix into scores */
function buildPhase1Profile(
  archetype: ArchetypeKey,
  roast: RoastPrefKey,
): Scores {
  const base = { ...ARCHETYPES.find(a => a.key === archetype)!.profile };
  const boost = ROAST_PREFS.find(r => r.key === roast)!.boost as Record<string, number>;
  const dims: FlavorKey[] = ['floral','fruity','sweet','nutty','spice','roasted','fermented','earthy'];
  const result: Partial<Scores> = {};
  for (const dim of dims) {
    result[dim] = Math.max(0, Math.min(1, (base as any)[dim] + (boost[dim] ?? 0))) as LevelValue;
  }
  return result as Scores;
}

// ─── Archetype picker card ────────────────────────────────
function ArchetypeCard({
  selected,
  roastSelected,
  onArchetype,
  onRoast,
  onNext,
  onSkip,
}: {
  selected: ArchetypeKey | null;
  roastSelected: RoastPrefKey | null;
  onArchetype: (k: ArchetypeKey) => void;
  onRoast: (k: RoastPrefKey) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const firstAccent = selected
    ? ARCHETYPES.find(a => a.key === selected)!.accent
    : Colors.copper;

  return (
    <View style={[ac.container, { backgroundColor: Colors.ink }]}>
      <StatusBar barStyle="light-content" />
      <Animated.View entering={FadeIn.duration(400)} style={ac.inner}>
        <Text style={ac.eyebrow}>TASTE PROFILE · PHASE 1</Text>
        <Text style={ac.title}>What's your style?</Text>

        <View style={ac.archetypeGrid}>
          {ARCHETYPES.map((a) => {
            const active = selected === a.key;
            return (
              <TouchableOpacity
                key={a.key}
                onPress={() => onArchetype(a.key)}
                style={[ac.archetypeBtn, { backgroundColor: a.from }, active && { borderColor: a.accent, borderWidth: 2 }]}
                accessibilityRole="button"
              >
                <Text style={ac.archetypeEmoji}>{a.emoji}</Text>
                <Text style={[ac.archetypeLabel, { color: active ? a.accent : Colors.cream }]}>{a.label}</Text>
                <Text style={ac.archetypeTagline}>{a.tagline}</Text>
                {active && <View style={[ac.activeDot, { backgroundColor: a.accent }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[ac.subTitle, { color: Colors.fog }]}>Roast preference</Text>
        <View style={ac.roastRow}>
          {ROAST_PREFS.map((r) => {
            const active = roastSelected === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                onPress={() => onRoast(r.key)}
                style={[ac.roastBtn, active && { borderColor: r.accent, backgroundColor: `${r.accent}18` }]}
                accessibilityRole="button"
              >
                <Text style={ac.roastEmoji}>{r.emoji}</Text>
                <Text style={[ac.roastLabel, { color: active ? r.accent : Colors.fog }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={ac.footer}>
          <TouchableOpacity
            onPress={onNext}
            disabled={!selected || !roastSelected}
            style={[ac.nextBtn, { backgroundColor: firstAccent, opacity: (!selected || !roastSelected) ? 0.4 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={ac.nextBtnText}>Refine my taste →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={ac.skipBtn} accessibilityRole="button">
            <Text style={ac.skipText}>SKIP TO HOME</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const ac = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingHorizontal: Spacing.xl,
  },
  eyebrow: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 3, marginBottom: Spacing.sm },
  title: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 40, color: Colors.cream, lineHeight: 44, marginBottom: Spacing.xl },
  subTitle: { fontFamily: 'SyneMono-Regular', fontSize: 9, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.lg },
  archetypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  archetypeBtn: {
    width: (W - Spacing.xl * 2 - Spacing.md) / 2,
    padding: Spacing.md, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hairline,
    position: 'relative', overflow: 'hidden',
  },
  archetypeEmoji: { fontSize: 28, lineHeight: 34, marginBottom: Spacing.xs },
  archetypeLabel: { fontFamily: 'Syne-Regular', fontSize: 13, fontWeight: '700' as any, marginBottom: 2 },
  archetypeTagline: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 0.5 },
  activeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  roastRow: { flexDirection: 'row', gap: Spacing.sm },
  roastBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hairline,
  },
  roastEmoji: { fontSize: 20, lineHeight: 24, marginBottom: 4 },
  roastLabel: { fontFamily: 'SyneMono-Regular', fontSize: 8, letterSpacing: 1, textAlign: 'center' },
  footer: { marginTop: 'auto' as any, paddingBottom: Platform.OS === 'ios' ? 52 : Spacing.xxl, gap: Spacing.md },
  nextBtn: {
    borderRadius: Radius.xxl, paddingVertical: Spacing.lg + 2,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.dark,
  },
  nextBtnText: { fontFamily: 'Syne-Regular', fontSize: 17, fontWeight: '800' as any, color: Colors.ink },
  skipBtn: { alignSelf: 'center', paddingVertical: Spacing.sm },
  skipText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.mist, letterSpacing: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TasteQuizScreen() {
  const { user, setHasTasteProfile } = useAuthStore();
  const { showToast } = useUIStore();
  // phase: 1 = archetype picker, 2 = 8-step detail sliders
  const [phase, setPhase] = useState<1 | 2>(1);
  const [archetype, setArchetype] = useState<ArchetypeKey | null>(null);
  const [roastPref, setRoastPref] = useState<RoastPrefKey | null>(null);
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Scores>({ ...DEFAULT_SCORES });
  const [saving, setSaving] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flavor = FLAVORS[step];
  const isLast = step === FLAVORS.length - 1;

  const handlePhase1Next = useCallback(() => {
    if (!archetype || !roastPref) return;
    // Pre-populate Phase 2 sliders from archetype + roast preference
    const presetScores = buildPhase1Profile(archetype, roastPref);
    const levelValues = LEVELS.map(l => l.value);
    const rounded: Partial<Scores> = {};
    for (const [k, v] of Object.entries(presetScores)) {
      rounded[k as FlavorKey] = levelValues.reduce((prev, curr) =>
        Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev
      ) as LevelValue;
    }
    setScores(rounded as Scores);
    setPhase(2);
  }, [archetype, roastPref]);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const handleSelect = useCallback((value: LevelValue) => {
    setScores((prev) => ({ ...prev, [flavor.key]: value }));
    // Auto-advance after brief delay unless on last step
    if (!isLast) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => setStep((s) => s + 1), 420);
    }
  }, [flavor.key, isLast]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const handleNext = useCallback(async () => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    // Save taste profile and navigate
    if (!user) {
      router.replace('/(tabs)');
      return;
    }
    setSaving(true);
    try {
      await supabase.from('taste_profiles').upsert({
        user_id: user.id,
        ...scores,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setHasTasteProfile(true);
    } catch (e: any) {
      console.error('[taste-quiz] Failed to save taste profile:', e?.message ?? e);
      showToast({ type: 'info', title: 'Profile saved locally', subtitle: 'Preferences will sync next time' });
    } finally {
      setSaving(false);
      router.replace('/(tabs)');
    }
  }, [isLast, user, scores, setHasTasteProfile, showToast]);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleNextPress = () => {
    btnScale.value = withSequence(withSpring(0.93, SPRING_SNAPPY), withSpring(1.0, SPRING));
    handleNext();
  };

  // Phase 1 — Archetype picker
  if (phase === 1) {
    return (
      <ArchetypeCard
        selected={archetype}
        roastSelected={roastPref}
        onArchetype={setArchetype}
        onRoast={setRoastPref}
        onNext={handlePhase1Next}
        onSkip={handleSkip}
      />
    );
  }

  // Phase 2 — 8-step flavor detail sliders
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen flavor card — keyed to force remount on step change */}
      <Animated.View
        key={step}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <FlavorCard
          flavor={flavor}
          selectedValue={scores[flavor.key as FlavorKey]}
          onSelect={handleSelect}
        />
      </Animated.View>

      {/* Overlay header */}
      <View style={styles.header}>
        <View style={styles.progressWrap}>
          <ProgressBar step={step} total={FLAVORS.length} accent={flavor.accent} />
        </View>
        <Text style={[styles.stepLabel, { color: flavor.accent }]}>
          {`${step + 1} OF ${FLAVORS.length}`}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View style={btnStyle}>
          <TouchableOpacity
            onPress={handleNextPress}
            disabled={saving}
            activeOpacity={0.85}
            style={[styles.btn, { backgroundColor: flavor.accent }, saving && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Build my taste profile' : 'Next flavour'}
          >
            <Text style={styles.btnText}>
              {saving ? 'Saving…' : isLast ? 'Build my taste profile' : 'Next'}
            </Text>
            {!saving && <Text style={[styles.btnArrow, { color: Colors.ink }]}>→</Text>}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip taste quiz"
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>SKIP QUIZ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fc = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  bloom: {
    position: 'absolute', width: W * 2.4, height: W * 2.4, borderRadius: W * 1.2,
    top: -W * 0.5, left: -W * 0.7, opacity: 0.6,
  },
  bloom2: {
    position: 'absolute', width: W * 1.8, height: W * 1.8, borderRadius: W * 0.9,
    bottom: -W * 0.6, right: -W * 0.5,
  },
  bgEmoji: {
    position: 'absolute', fontSize: 180, lineHeight: 200, opacity: 0.08,
    top: H * 0.06, right: -28, transform: [{ rotate: '10deg' }],
  },
  content: {
    position: 'absolute', top: H * 0.18, left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
  },
  emoji: { fontSize: 64, lineHeight: 72, marginBottom: Spacing.lg },
  label: {
    fontFamily: 'SyneMono-Regular', fontSize: 12,
    letterSpacing: 4, marginBottom: Spacing.sm,
  },
  tagline: {
    fontFamily: 'CormorantGaramond-LightItalic', fontSize: 36,
    lineHeight: 40, color: Colors.cream, marginBottom: Spacing.lg,
  },
  accentLine: { width: 36, height: 2, borderRadius: 1, marginBottom: Spacing.lg },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, borderWidth: 1,
  },
  exText: { fontFamily: 'Syne-Regular', fontSize: 12 },
  levelsRow: {
    position: 'absolute', bottom: 230, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.lg,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36,
    left: 0, right: 0, paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },
  progressWrap: { marginBottom: Spacing.xs },
  stepLabel: {
    fontFamily: 'SyneMono-Regular', fontSize: 9,
    letterSpacing: 3, alignSelf: 'flex-end',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 52 : Spacing.xxl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: 'rgba(8,6,4,0.55)',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.xxl, paddingVertical: Spacing.lg + 2, gap: Spacing.md,
    ...SHADOWS.dark,
  },
  btnText: {
    fontFamily: 'Syne-Regular', fontSize: 17,
    fontWeight: '800' as any, color: Colors.ink,
  },
  btnArrow: { fontSize: 20, lineHeight: 22 },
  skipBtn: { alignSelf: 'center', paddingVertical: Spacing.sm },
  skipText: {
    fontFamily: 'SyneMono-Regular', fontSize: 9,
    color: Colors.mist, letterSpacing: 2,
  },
});
