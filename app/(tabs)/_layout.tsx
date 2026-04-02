import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, BlurView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, SPRING, SPRING_SNAPPY, SHADOWS } from '../../constants/tokens';

const { width: W } = Dimensions.get('window');

// ─── Icon set ─────────────────────────────────────────────────────────────────
const SVG_ICONS: Record<string, React.ReactNode> = {
  home: (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, lineHeight: 22 }}>⌂</Text>
    </View>
  ),
  discover: (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, lineHeight: 22 }}>◎</Text>
    </View>
  ),
  map: (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, lineHeight: 22 }}>⊕</Text>
    </View>
  ),
  profile: (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 17, lineHeight: 22 }}>◉</Text>
    </View>
  ),
};

// ─── Tab Icon — premium spring animation ──────────────────────────────────────
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const glow = useSharedValue(0);
  const lift = useSharedValue(0);
  const dotScale = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      glow.value = withSpring(1, SPRING);
      lift.value = withSpring(-3, SPRING);
      dotScale.value = withSpring(1, SPRING_SNAPPY);
    } else {
      glow.value = withSpring(0, SPRING);
      lift.value = withSpring(0, SPRING);
      dotScale.value = withSpring(0, SPRING_SNAPPY);
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
    opacity: interpolate(glow.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <View style={ti.wrap}>
      {/* Glow halo behind icon */}
      <Animated.View style={[ti.glowHalo, glowStyle]} />
      <Animated.View style={[ti.icon, iconStyle]}>
        <Text style={{ fontSize: 19, color: focused ? Colors.cream : Colors.mist, lineHeight: 24 }}>
          {name === 'home' ? '⌂' : name === 'discover' ? '◎' : name === 'map' ? '⊕' : '◉'}
        </Text>
      </Animated.View>
      <Animated.View style={[ti.dot, dotStyle]} />
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 56, height: 52 },
  glowHalo: {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.copperGlowSoft,
  },
  icon: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.copper },
});

// ─── Center Plus button ────────────────────────────────────────────────────────
function PlusButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Subtle breathing ring animation
    const run = () => {
      ringScale.value = withSequence(
        withTiming(1.35, { duration: 1400 }),
        withTiming(1.0, { duration: 1400 }),
      );
      ringOpacity.value = withSequence(
        withTiming(0, { duration: 1400 }),
        withTiming(0.3, { duration: 1400 }),
      );
    };
    run();
    const id = setInterval(run, 2800);
    return () => clearInterval(id);
  }, []);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <TouchableOpacity
      onPressIn={() => { scale.value = withSpring(0.88, SPRING_SNAPPY); }}
      onPressOut={() => { scale.value = withSpring(1.0, SPRING); }}
      onPress={onPress}
      style={pb.outer}
      accessibilityLabel="New check-in"
      accessibilityRole="button"
    >
      {/* Breathing ring */}
      <Animated.View style={[pb.ring, ringStyle]} />
      <Animated.View style={[pb.btn, btnStyle]}>
        <Text style={pb.plus}>+</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const pb = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center', marginTop: -20, width: 76, height: 52 },
  ring: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
    borderWidth: 1.5, borderColor: Colors.copper,
  },
  btn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.copper,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.copper,
  },
  plus: { fontFamily: 'Syne-Bold', fontSize: 26, color: Colors.ink, lineHeight: 30, marginTop: -1 },
});

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={bar.outerWrap} pointerEvents="box-none">
      <View style={bar.pill}>
        {/* Glass blur backdrop */}
        <View style={bar.blurBg} />
        <View style={bar.inner}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const isCenter = route.name === 'check-in';

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            if (isCenter) {
              return <PlusButton key={route.key} onPress={onPress} />;
            }

            const name =
              route.name === 'index' ? 'home' :
              route.name === 'discover' ? 'discover' :
              route.name === 'map' ? 'map' : 'profile';

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={bar.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? name}
              >
                <TabIcon name={name} focused={focused} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 70;
const bar = StyleSheet.create({
  outerWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: BAR_HEIGHT + (Platform.OS === 'ios' ? 12 : 0),
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  pill: {
    width: Math.min(W - 24, 480),
    height: BAR_HEIGHT,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...SHADOWS.dark,
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,10,8,0.92)',
  },
  inner: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-around',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
});

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="check-in" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
