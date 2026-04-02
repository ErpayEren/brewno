import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Platform, StatusBar, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  withDelay, interpolate, Extrapolation, FadeIn,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, SPRING, SPRING_SNAPPY, SHADOWS } from '../constants/tokens';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    eyebrow: 'THE PROBLEM',
    title: "You've had 3 amazing cups this week.",
    emphasis: 'You remember none of them.',
    body: 'Every great coffee deserves to be remembered. Origin, process, roastery — all of it.',
    emoji: '☕',
    accent: Colors.copper,
    from: '#1e0e06',
    mid:  '#3d1f0f',
  },
  {
    eyebrow: 'THE RITUAL',
    title: 'Check in every cup.',
    emphasis: 'Build your flavor memory.',
    body: 'Rate, note tasting flavors, log your brew method. Your palate evolves with every pour.',
    emoji: '📓',
    accent: Colors.amber,
    from: '#0e1808',
    mid:  '#1e3418',
  },
  {
    eyebrow: 'THE COMMUNITY',
    title: 'See what the people you trust',
    emphasis: 'are drinking right now.',
    body: 'Follow fellow enthusiasts. Discover new origins. Find specialty cafés near you.',
    emoji: '🫶',
    accent: Colors.gold,
    from: '#160e22',
    mid:  '#321a50',
  },
];

// ─── Single slide ─────────────────────────────────────────────────────────────
function Slide({ slide, active, index }: { slide: typeof SLIDES[0]; active: boolean; index: number }) {
  const floatY = useSharedValue(0);
  const contentOp = useSharedValue(0);
  const contentY = useSharedValue(24);

  useEffect(() => {
    // Floating emoji loop
    const loop = () => {
      floatY.value = withSequence(
        withTiming(-16, { duration: 2400 }),
        withTiming(0, { duration: 2400 }),
      );
      setTimeout(loop, 4800);
    };
    loop();
  }, []);

  useEffect(() => {
    if (active) {
      contentOp.value = withDelay(120, withTiming(1, { duration: 500 }));
      contentY.value = withDelay(120, withSpring(0, SPRING));
    } else {
      contentOp.value = withTiming(0, { duration: 200 });
      contentY.value = withTiming(16, { duration: 200 });
    }
  }, [active]);

  const emojiStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOp.value, transform: [{ translateY: contentY.value }] }));

  return (
    <View style={[sl.slide, { width: W, backgroundColor: slide.from }]}>
      {/* Gradient bloom */}
      <View style={[sl.bloom, { backgroundColor: slide.mid }]} />
      <View style={[sl.bloom2, { backgroundColor: slide.accent, opacity: 0.06 }]} />

      {/* Big emoji watermark */}
      <Animated.Text style={[sl.bgEmoji, emojiStyle]}>{slide.emoji}</Animated.Text>

      {/* Content */}
      <Animated.View style={[sl.content, contentStyle]}>
        <Text style={[sl.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
        <Text style={sl.title}>{slide.title}</Text>
        <View style={[sl.accentLine, { backgroundColor: slide.accent }]} />
        <Text style={[sl.emphasis, { color: slide.accent === Colors.gold ? Colors.gold : Colors.cream }]}>
          {slide.emphasis}
        </Text>
        <Text style={sl.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

const sl = StyleSheet.create({
  slide: { flex: 1, overflow: 'hidden' },
  bloom: {
    position: 'absolute', width: W * 2.2, height: W * 2.2, borderRadius: W * 1.1,
    top: -W * 0.4, left: -W * 0.6, opacity: 0.65,
  },
  bloom2: {
    position: 'absolute', width: W * 1.6, height: W * 1.6, borderRadius: W * 0.8,
    bottom: -W * 0.5, right: -W * 0.4,
  },
  bgEmoji: {
    position: 'absolute', fontSize: 160, lineHeight: 180, opacity: 0.1,
    top: H * 0.08, right: -24, transform: [{ rotate: '12deg' }],
  },
  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingBottom: 220,
  },
  eyebrow: { fontFamily: 'SyneMono-Regular', fontSize: 10, letterSpacing: 3.5, marginBottom: Spacing.lg },
  title: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 50, lineHeight: 54, color: Colors.cream, marginBottom: Spacing.lg,
  },
  accentLine: { width: 36, height: 2, borderRadius: 1, marginBottom: Spacing.lg },
  emphasis: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 26, lineHeight: 30, marginBottom: Spacing.lg,
  },
  body: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog, lineHeight: 22 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const goNext = () => {
    btnScale.value = withSequence(withSpring(0.93, SPRING_SNAPPY), withSpring(1.0, SPRING));
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
      setCurrent(next);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const slide = SLIDES[current];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Paged scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
      >
        {SLIDES.map((s, i) => (
          <Slide key={i} slide={s} active={current === i} index={i} />
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const isActive = i === current;
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: isActive ? 28 : 8,
                    backgroundColor: isActive ? slide.accent : 'rgba(255,255,255,0.18)',
                    shadowColor: isActive ? slide.accent : 'transparent',
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Skip */}
        {current < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.skipBtn}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>
        )}

        {/* CTA button */}
        <Animated.View style={btnStyle}>
          <TouchableOpacity
            onPress={goNext}
            style={[styles.btn, { backgroundColor: slide.accent }]}
            accessibilityRole="button"
            accessibilityLabel={current < SLIDES.length - 1 ? 'Next slide' : 'Get started'}
          >
            <Text style={styles.btnText}>
              {current < SLIDES.length - 1 ? 'Continue' : 'Start your journey'}
            </Text>
            <Text style={[styles.btnArrow, { color: Colors.ink }]}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.sig}>brewno — your coffee memory</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 52 : Spacing.xxl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: 'rgba(8,6,4,0.55)',
  },
  dotsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm },
  dot: { height: 4, borderRadius: 2 },
  skipBtn: { position: 'absolute', top: Spacing.xl, right: Spacing.xl },
  skipText: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.xxl, paddingVertical: Spacing.lg + 2, gap: Spacing.md,
    ...SHADOWS.dark,
  },
  btnText: { fontFamily: 'Syne-Regular', fontSize: 17, fontWeight: '800' as any, color: Colors.ink },
  btnArrow: { fontSize: 20, lineHeight: 22 },
  sig: {
    fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.mist,
    letterSpacing: 2, textAlign: 'center',
  },
});
