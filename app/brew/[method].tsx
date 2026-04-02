import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useBrewGuides } from '../../hooks/useRecommendations';
import { Colors, Spacing, Radius, SPRING, SHADOWS } from '../../constants/tokens';
import { haptics } from '../../hooks/useHaptics';

const { width: W } = Dimensions.get('window');

const METHOD_ICONS: Record<string, string> = {
  'V60': '▽', 'Espresso': '⊙', 'Chemex': '⌖',
  'AeroPress': '⊕', 'French Press': '⊞', 'Cold Brew': '❄',
};

export default function BrewGuideScreen() {
  const { method } = useLocalSearchParams<{ method: string }>();
  const { data: guides } = useBrewGuides();
  const [activeStep, setActiveStep] = useState(0);

  const guide = guides?.find((g: any) => g.method === method);

  if (!guide) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 24, color: Colors.cream }}>
          Guide not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.xl }}>
          <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.copper, letterSpacing: 2 }}>← BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = guide.steps as any[];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Brew Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.hero}>
          <View style={s.methodIcon}>
            <Text style={s.methodIconText}>{METHOD_ICONS[guide.method] ?? '☕'}</Text>
          </View>
          <Text style={s.methodName}>{guide.method}</Text>
          <Text style={s.methodTitle}>{guide.title}</Text>
          <Text style={s.methodDesc}>{guide.description}</Text>

          {/* Specs row */}
          <View style={s.specsRow}>
            {[
              { label: 'RATIO', value: guide.ratio },
              { label: 'TEMP', value: `${guide.temp_c}°C` },
              { label: 'GRIND', value: guide.grind_size },
            ].map((spec) => (
              <View key={spec.label} style={s.specItem}>
                <Text style={s.specValue}>{spec.value}</Text>
                <Text style={s.specLabel}>{spec.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Steps */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Text style={s.sectionLabel}>STEPS</Text>
          {steps.map((step: any, i: number) => {
            const isActive = activeStep === i;
            const isDone = activeStep > i;
            return (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 60).duration(400)}
              >
                <TouchableOpacity
                  onPress={() => { haptics.light(); setActiveStep(i); }}
                  style={[s.stepRow, isActive && s.stepRowActive, isDone && s.stepRowDone]}
                  accessibilityRole="button"
                >
                  <View style={[s.stepNum, isActive && s.stepNumActive, isDone && s.stepNumDone]}>
                    <Text style={[s.stepNumText, (isActive || isDone) && { color: Colors.ink }]}>
                      {isDone ? '✓' : step.step}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stepText, isActive && { color: Colors.cream }]}>
                      {step.instruction}
                    </Text>
                    {step.duration_sec > 0 && (
                      <Text style={s.stepDuration}>
                        {step.duration_sec >= 60
                          ? `${Math.floor(step.duration_sec / 60)}:${String(step.duration_sec % 60).padStart(2, '0')} min`
                          : `${step.duration_sec}s`
                        }
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Next / Done button */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
          {activeStep < steps.length - 1 ? (
            <TouchableOpacity
              onPress={() => { haptics.medium(); setActiveStep(s => s + 1); }}
              style={s.nextBtn}
              accessibilityRole="button"
            >
              <Text style={s.nextBtnText}>Next Step →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => { haptics.success(); router.back(); }}
              style={[s.nextBtn, { backgroundColor: Colors.amber }]}
              accessibilityRole="button"
            >
              <Text style={s.nextBtnText}>Brew complete ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 28, color: Colors.cream, lineHeight: 36 },
  headerTitle: { fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.fog, letterSpacing: 2 },
  hero: {
    alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl, marginBottom: Spacing.xl,
    borderBottomWidth: 1, borderBottomColor: Colors.hairline,
  },
  methodIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.mahogany, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.copper, marginBottom: Spacing.lg,
    ...SHADOWS.copperSm,
  },
  methodIconText: { fontSize: 28, color: Colors.copper },
  methodName: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.copper, letterSpacing: 3, marginBottom: Spacing.sm },
  methodTitle: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 32, color: Colors.cream, textAlign: 'center', marginBottom: Spacing.md },
  methodDesc: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  specsRow: { flexDirection: 'row', gap: Spacing.xl },
  specItem: { alignItems: 'center' },
  specValue: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 20, color: Colors.gold, lineHeight: 24, marginBottom: 3 },
  specLabel: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 2 },
  sectionLabel: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 3, marginBottom: Spacing.lg },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.hairline,
    backgroundColor: Colors.inkSoft,
  },
  stepRowActive: { borderColor: Colors.copper, backgroundColor: Colors.roast },
  stepRowDone: { opacity: 0.5 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.hairline,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumActive: { backgroundColor: Colors.copper, borderColor: Colors.copper },
  stepNumDone: { backgroundColor: Colors.fog, borderColor: Colors.fog },
  stepNumText: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog },
  stepText: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog, lineHeight: 21 },
  stepDuration: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 1, marginTop: 4 },
  nextBtn: {
    backgroundColor: Colors.copper, borderRadius: Radius.xl,
    paddingVertical: Spacing.base, alignItems: 'center',
    ...SHADOWS.copper,
  },
  nextBtnText: { fontFamily: 'Syne-Bold', fontSize: 15, color: Colors.ink },
});
