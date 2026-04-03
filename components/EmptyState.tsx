import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../constants/tokens';
import { BRAND_COPY } from '../constants/content';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ emoji, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={s.wrap}>
      <Text style={s.emoji}>{emoji}</Text>
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity onPress={onCta} style={s.btn} accessibilityRole="button">
          <Text style={s.btnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.emoji}>⚠️</Text>
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.subtitle}>{message ?? 'We couldn\'t load this content.'}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={s.retryBtn} accessibilityRole="button">
          <Text style={s.retryText}>{BRAND_COPY.cta.retry}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.lg },
  title: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 24, color: Colors.cream, textAlign: 'center', marginBottom: Spacing.sm, lineHeight: 28 },
  subtitle: { ...Typography.bodyLg, color: Colors.fog, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  btn: { marginTop: Spacing.xl, backgroundColor: Colors.copper, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  btnText: { ...Typography.body, color: Colors.ink, fontWeight: '700' as any },
  retryBtn: { marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.hairline, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  retryText: { ...Typography.body, color: Colors.cream },
});
