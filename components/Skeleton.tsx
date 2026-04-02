import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, Radius } from '../constants/tokens';

// ─── Base Shimmer Block ────────────────────────────────────────────────────────
function ShimmerBlock({ width, height, borderRadius = Radius.sm, style }: {
  width: number | string; height: number; borderRadius?: number; style?: any;
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.roast },
        animStyle,
        style,
      ]}
    />
  );
}

// ─── Feed Card Skeleton ────────────────────────────────────────────────────────
export function FeedCardSkeleton() {
  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <ShimmerBlock width={28} height={28} borderRadius={14} />
        <View style={{ flex: 1, gap: 6 }}>
          <ShimmerBlock width={80} height={10} />
          <ShimmerBlock width={50} height={8} />
        </View>
        <ShimmerBlock width={60} height={8} />
      </View>
      {/* Hero */}
      <ShimmerBlock width="100%" height={200} borderRadius={0} />
      {/* Body */}
      <View style={s.body}>
        <ShimmerBlock width={100} height={8} />
        <ShimmerBlock width={'80%'} height={20} style={{ marginTop: 8 }} />
        <ShimmerBlock width={'60%'} height={12} style={{ marginTop: 8 }} />
        <View style={s.tagRow}>
          <ShimmerBlock width={60} height={22} borderRadius={Radius.full} />
          <ShimmerBlock width={70} height={22} borderRadius={Radius.full} />
          <ShimmerBlock width={55} height={22} borderRadius={Radius.full} />
        </View>
      </View>
    </View>
  );
}

// ─── Coffee Card Skeleton ──────────────────────────────────────────────────────
export function CoffeeCardSkeleton() {
  return (
    <View style={[s.card, { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 12 }]}>
      <ShimmerBlock width="100%" height={180} borderRadius={0} />
      <View style={s.body}>
        <ShimmerBlock width={80} height={8} />
        <ShimmerBlock width="70%" height={22} style={{ marginTop: 8 }} />
        <ShimmerBlock width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// ─── List Row Skeleton ───────────────────────────────────────────────────────
export function ListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={s.listRow}>
          <ShimmerBlock width={44} height={44} borderRadius={Radius.sm} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerBlock width="60%" height={12} />
            <ShimmerBlock width="40%" height={9} />
          </View>
          <ShimmerBlock width={32} height={24} />
        </View>
      ))}
    </>
  );
}

// ─── Profile Header Skeleton ──────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <View style={s.profileWrap}>
      <ShimmerBlock width={80} height={80} borderRadius={40} />
      <ShimmerBlock width={120} height={22} style={{ marginTop: 12 }} />
      <ShimmerBlock width={80} height={10} style={{ marginTop: 8 }} />
      <View style={s.statsRow}>
        {[1,2,3,4].map(i => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <ShimmerBlock width={40} height={28} />
            <ShimmerBlock width={50} height={8} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.inkSoft, marginBottom: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  body: { padding: 16 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  profileWrap: { alignItems: 'center', padding: 24 },
  statsRow: { flexDirection: 'row', gap: 0, marginTop: 24, width: '100%' },
});
