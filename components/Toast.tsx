import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn,
} from 'react-native-reanimated';
import { useUIStore } from '../stores/uiStore';
import { Colors, Typography, Spacing, Radius, SPRING } from '../constants/tokens';

const { width: W } = Dimensions.get('window');

function ToastItem({ toast }: { toast: { id: string; type: 'success'|'error'|'info'; title: string; subtitle?: string } }) {
  const { dismissToast } = useUIStore();
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    translateY.value = withSpring(0, SPRING);
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withSpring(1, SPRING);
  }, []);

  const dismiss = () => {
    translateY.value = withSpring(-20, SPRING);
    opacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => dismissToast(toast.id), 200);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconColor = toast.type === 'success' ? Colors.copper : toast.type === 'error' ? '#e05555' : Colors.amber;
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i';

  return (
    <Animated.View style={[ts.toast, animStyle]}>
      <View style={[ts.iconCircle, { backgroundColor: iconColor }]}>
        <Text style={ts.icon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.title}>{toast.title}</Text>
        {toast.subtitle ? <Text style={ts.subtitle}>{toast.subtitle}</Text> : null}
      </View>
      <TouchableOpacity onPress={dismiss} style={ts.close}>
        <Text style={{ color: Colors.fog, fontSize: 14 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.inkSoft,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.cardBorder,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 32, elevation: 16,
    marginBottom: Spacing.sm,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { color: Colors.ink, fontSize: 16, fontWeight: '800' as any },
  title: { ...Typography.body, color: Colors.cream, fontWeight: '700' as any },
  subtitle: { ...Typography.labelSm, color: Colors.fog, marginTop: 1 },
  close: { padding: 4 },
});

// ─── Toast Container (rendered in root layout) ─────────────────────────────────
export function ToastContainer() {
  const { toasts } = useUIStore();
  if (toasts.length === 0) return null;
  return (
    <View style={tc.container} pointerEvents="box-none">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </View>
  );
}

const tc = StyleSheet.create({
  container: {
    position: 'absolute', top: 56, left: 16, right: 16, zIndex: 9999,
  },
});
