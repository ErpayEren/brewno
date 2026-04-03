import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, SPRING, SPRING_SNAPPY, SHADOWS } from '../../constants/tokens';
import { TAB_PRIMARY_JOBS } from '../../constants/experience';

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
    const id = setInterval(run, 2800);
    run();
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

const IS_WEB = Platform.OS === 'web';
const pb = StyleSheet.create({
  outer: { alignItems: 'center', justifyContent: 'center', marginTop: IS_WEB ? 0 : -18, width: IS_WEB ? 62 : 74, height: 58 },
  ring: {
    position: 'absolute',
    width: IS_WEB ? 52 : 66, height: IS_WEB ? 52 : 66, borderRadius: IS_WEB ? 26 : 33,
    borderWidth: 1.2, borderColor: 'rgba(201,114,58,0.6)',
  },
  btn: {
    width: IS_WEB ? 46 : 54, height: IS_WEB ? 46 : 54, borderRadius: IS_WEB ? 23 : 27,
    backgroundColor: Colors.copper,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.copper,
  },
   plus: { fontFamily: 'Syne-Bold', fontSize: IS_WEB ? 21 : 25, color: Colors.ink, lineHeight: IS_WEB ? 25 : 29, marginTop: -1 },
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
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: BAR_HEIGHT + (Platform.OS === 'ios' ? 46 : 34),
    alignItems: 'center', justifyContent: 'flex-end',
    paddingTop: IS_WEB ? 14 : 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  pill: {
    width: IS_WEB ? 620 : '94%',
    height: BAR_HEIGHT,
    maxWidth: '100%',
    borderRadius: IS_WEB ? Radius.xxl : 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: IS_WEB ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.12)',
    ...SHADOWS.dark,
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: IS_WEB ? 'rgba(13,10,8,0.93)' : 'rgba(11,9,8,0.94)',
  },
  inner: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: IS_WEB ? 20 : 8,
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: `Home. ${TAB_PRIMARY_JOBS.home}`,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: `Discover. ${TAB_PRIMARY_JOBS.discover}`,
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check-in',
          tabBarAccessibilityLabel: `Check-in. ${TAB_PRIMARY_JOBS.checkin}`,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarAccessibilityLabel: `Map. ${TAB_PRIMARY_JOBS.map}`,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: `Profile. ${TAB_PRIMARY_JOBS.profile}`,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
