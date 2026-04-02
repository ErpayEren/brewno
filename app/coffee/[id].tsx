import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions, StatusBar, Share,
} from 'react-native';import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
  withDelay, withRepeat, FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler,
  Extrapolation,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useWishlist, useSimilarCoffees } from '../../hooks/useData';
import { haptics } from '../../hooks/useHaptics';
import {
  Colors, Spacing, Radius, SPRING, SPRING_SNAPPY, HERO_GRADIENTS, SHADOWS, Typography,
} from '../../constants/tokens';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.min(H * 0.52, 420);
const HEADER_THRESHOLD = HERO_H - 80;

// ─── Data hook ────────────────────────────────────────────────────────────────
function useCoffeeDetail(id: string) {
  return useQuery({
    queryKey: ['coffee', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffees')
        .select(`
          id, name, origin_country, origin_region, process_method, roast_level,
          altitude_masl, variety, description, barcode,
          roasteries:roastery_id ( id, name, location, is_verified, instagram, website ),
          checkins (
            id, rating, notes, tasting_notes, brew_method, created_at,
            users:user_id ( id, username, avatar_url )
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

function useWishlistStatus(coffeeId: string) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['wishlist-status', coffeeId, user?.id],
    enabled: !!user && !!coffeeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('wishlists')
        .select('coffee_id')
        .eq('user_id', user!.id)
        .eq('coffee_id', coffeeId)
        .maybeSingle();
      return !!data;
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function computeStats(checkins: any[]) {
  if (!checkins?.length) return { avg: 0, count: 0, dist: [0, 0, 0, 0, 0] };
  const avg = checkins.reduce((a, c) => a + (c.rating ?? 0), 0) / checkins.length;
  const dist = [5, 4, 3, 2, 1].map(
    (star) => checkins.filter((c) => Math.round(c.rating) === star).length
  );
  return { avg, count: checkins.length, dist };
}

function topTastingNotes(checkins: any[]): string[] {
  const freq: Record<string, number> = {};
  for (const c of checkins ?? []) {
    for (const n of c.tasting_notes ?? []) {
      freq[n] = (freq[n] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([n]) => n);
}

// ─── Animated flavor bar ──────────────────────────────────────────────────────
function FlavorBar({ label, pct, color, delay }: { label: string; pct: number; color: string; delay: number }) {
  const width = useSharedValue(0);
  useEffect(() => { width.value = withDelay(delay, withTiming(pct, { duration: 700 })); }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={flb.row}>
      <Text style={flb.label}>{label.toUpperCase()}</Text>
      <View style={flb.track}>
        <Animated.View style={[flb.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={[flb.num, { color }]}>{pct}</Text>
    </View>
  );
}
const flb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, width: 72, letterSpacing: 1 },
  track: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  num: { fontFamily: 'SyneMono-Regular', fontSize: 10, width: 24, textAlign: 'right' },
});

// ─── Rating distribution bar ──────────────────────────────────────────────────
function RatingDist({ dist, total }: { dist: number[]; total: number }) {
  return (
    <View style={{ gap: 5 }}>
      {dist.map((count, i) => {
        const star = 5 - i;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, width: 8 }}>{star}</Text>
            <Text style={{ fontSize: 9, color: Colors.amber, lineHeight: 12 }}>★</Text>
            <View style={{ flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <Animated.View
                entering={FadeIn.delay(i * 80).duration(500)}
                style={{ width: `${pct}%`, height: 3, backgroundColor: Colors.amber, borderRadius: 2 }}
              />
            </View>
            <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, width: 20, textAlign: 'right' }}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name?: string | null; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: Colors.mahogany, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: Colors.copper,
    }}>
      <Text style={{ fontFamily: 'CormorantGaramond-SemiBold', fontSize: size * 0.38, color: Colors.cream, lineHeight: size * 0.5 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

// ─── Flavor tag chip ──────────────────────────────────────────────────────────
function NoteChip({ label, rank }: { label: string; rank: number }) {
  const opacity = Math.max(0.4, 1 - rank * 0.1);
  return (
    <View style={[nc.chip, { opacity }]}>
      <Text style={nc.text}>{label}</Text>
    </View>
  );
}
const nc = StyleSheet.create({
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: 'rgba(196,105,58,0.10)',
    borderWidth: 1, borderColor: 'rgba(196,105,58,0.25)',
  },
  text: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.amber, letterSpacing: 1 },
});

// ─── Community check-in row ───────────────────────────────────────────────────
function CheckinRow({ item, index }: { item: any; index: number }) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tags = (item.tasting_notes ?? []) as string[];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400).springify()}
      style={[cr.wrap, s]}
    >
      <View style={cr.header}>
        <Avatar name={item.users?.username} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={cr.username}>{item.users?.username ?? 'unknown'}</Text>
          {item.brew_method && (
            <Text style={cr.method}>{item.brew_method.toUpperCase()}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={cr.rating}>{item.rating?.toFixed(1)}</Text>
          <Text style={cr.time}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>
      {item.notes ? (
        <Text style={cr.note} numberOfLines={3}>{item.notes}</Text>
      ) : null}
      {tags.length > 0 && (
        <View style={cr.tagRow}>
          {tags.slice(0, 4).map((t: string) => (
            <View key={t} style={cr.tag}>
              <Text style={cr.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}
const cr = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.hairline,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  username: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream, fontWeight: '700' as any },
  method: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 1.5, marginTop: 2 },
  rating: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 20, color: Colors.gold, lineHeight: 24 },
  time: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 1 },
  note: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, lineHeight: 20, marginBottom: Spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full,
    backgroundColor: Colors.roast, borderWidth: 1, borderColor: Colors.hairline,
  },
  tagText: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 1 },
});

// ─── Hero background ──────────────────────────────────────────────────────────
function HeroBg({ gi }: { gi: number }) {
  const g = HERO_GRADIENTS[gi % HERO_GRADIENTS.length];
  return (
    <>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.from }]} />
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: g.mid, opacity: 0.75,
        transform: [{ skewY: '-10deg' }, { translateY: HERO_H * 0.2 }],
      }]} />
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: g.to, opacity: 0.3, borderRadius: W,
        transform: [{ scale: 1.8 }, { translateX: W * 0.25 }, { translateY: -HERO_H * 0.35 }],
      }]} />
      {/* Bottom scrim */}
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: 'transparent',
      }]}>
        <View style={{ flex: 1 }} />
        <View style={{ height: HERO_H * 0.6, backgroundColor: g.from, opacity: 0.9 }} />
      </View>
      {/* Watermark */}
      <Text style={{
        position: 'absolute', fontSize: 180, opacity: 0.05,
        top: -20, right: -30, transform: [{ rotate: '15deg' }], lineHeight: 200,
      }}>☕</Text>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.8, { duration: 900 }), -1, true);
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const Block = ({ w, h, br = 8 }: { w: number | string; h: number; br?: number }) => (
    <Animated.View style={[{ width: w as any, height: h, borderRadius: br, backgroundColor: Colors.roast }, s]} />
  );
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink }}>
      <Block w="100%" h={HERO_H} br={0} />
      <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
        <Block w={100} h={10} />
        <Block w="70%" h={36} />
        <Block w={80} h={20} />
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
          {[60, 80, 70].map((w, i) => <Block key={i} w={w} h={26} br={Radius.full} />)}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CoffeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { data: coffee, isLoading, isError } = useCoffeeDetail(id ?? '');
  const { data: inWishlist, refetch: refetchWishlist } = useWishlistStatus(id ?? '');
  const wishlistMutation = useWishlist();
  const { data: similarCoffees } = useSimilarCoffees(
    id ?? '',
    coffee?.origin_country,
    coffee?.process_method,
  );
  const scrollY = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const wishScale = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Parallax hero
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, HERO_H], [0, -HERO_H * 0.35], Extrapolation.CLAMP) }],
  }));

  // Floating header opacity
  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HEADER_THRESHOLD - 40, HEADER_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const handleWishlist = useCallback(() => {
    if (!user) { showToast({ type: 'info', title: 'Sign in to save coffees.' }); return; }
    haptics.heavy();
    wishScale.value = withSequence(withSpring(1.4, SPRING_SNAPPY), withSpring(1.0, SPRING));
    wishlistMutation.mutate(
      { coffeeId: id!, inWishlist: !!inWishlist },
      { onSuccess: () => { refetchWishlist(); showToast({ type: 'success', title: inWishlist ? 'Removed from wishlist.' : 'Saved to wishlist.' }); } }
    );
  }, [user, inWishlist, id]);

  const handleShare = useCallback(async () => {
    if (!coffee) return;
    await Share.share({ message: `Check out ${coffee.name} on Brewno — ${coffee.origin_country ?? ''}` });
  }, [coffee]);

  const handleCheckin = useCallback(() => {
    router.push('/(tabs)/check-in' as any);
  }, []);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !coffee) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 28, color: Colors.cream }}>Coffee not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.xl }}>
          <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.copper, letterSpacing: 2 }}>← GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const checkins = coffee.checkins ?? [];
  const { avg, count, dist } = computeStats(checkins);
  const topNotes = topTastingNotes(checkins);
  const gi = (coffee.name?.charCodeAt(0) ?? 0) % HERO_GRADIENTS.length;
  const roastery = coffee.roasteries as any;

  // Derive flavor profile scores from community tasting notes
  const FLAVOR_CATS: { label: string; keys: string[]; color: string }[] = [
    { label: 'Floral',   keys: ['jasmine','rose','chamomile','lavender','floral'],   color: Colors.gold },
    { label: 'Fruity',   keys: ['blueberry','peach','citrus','tropical','strawberry','stone fruit','fruity'], color: Colors.amber },
    { label: 'Sweet',    keys: ['caramel','honey','vanilla','brown sugar','nougat','sweet'], color: Colors.copper },
    { label: 'Nutty',    keys: ['hazelnut','almond','cocoa','dark choc','nutty'],    color: '#a07840' },
    { label: 'Roasted',  keys: ['tobacco','cedar','smoky','burnt','roasted'],        color: Colors.fog },
  ];
  const noteFreq: Record<string, number> = {};
  for (const c of checkins) for (const n of c.tasting_notes ?? []) noteFreq[n.toLowerCase()] = (noteFreq[n.toLowerCase()] ?? 0) + 1;
  const totalNoteCount = Object.values(noteFreq).reduce((a, b) => a + b, 0) || 1;
  const flavorBars = FLAVOR_CATS.map(cat => {
    const score = cat.keys.reduce((a, k) => a + (noteFreq[k] ?? 0), 0);
    return { label: cat.label, pct: Math.round((score / totalNoteCount) * 100), color: cat.color };
  }).filter(b => b.pct > 0);

  const metaTags = [
    coffee.process_method && { label: coffee.process_method.toUpperCase(), highlight: true },
    coffee.roast_level && { label: coffee.roast_level.toUpperCase(), highlight: false },
    coffee.altitude_masl && { label: `${coffee.altitude_masl}M`, highlight: false },
    coffee.variety && { label: coffee.variety.toUpperCase(), highlight: false },
    coffee.origin_region && { label: coffee.origin_region.toUpperCase(), highlight: false },
  ].filter(Boolean) as { label: string; highlight: boolean }[];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink }}>
      <StatusBar barStyle="light-content" />

      {/* Floating header bar */}
      <View style={styles.floatingHeader} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.floatingHeaderBg, headerBgStyle]} />
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.headerBtnText}>‹</Text>
        </TouchableOpacity>
        <Animated.Text
          style={[styles.headerTitle, useAnimatedStyle(() => ({
            opacity: interpolate(scrollY.value, [HEADER_THRESHOLD - 20, HEADER_THRESHOLD + 20], [0, 1], Extrapolation.CLAMP),
          }))]}
          numberOfLines={1}
        >
          {coffee.name}
        </Animated.Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Share">
            <Text style={{ fontSize: 15, color: Colors.cream }}>↑</Text>
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: wishScale }] }}>
            <TouchableOpacity onPress={handleWishlist} style={[styles.headerBtn, inWishlist && styles.headerBtnActive]} accessibilityRole="button" accessibilityLabel={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
              <Text style={{ fontSize: 16, color: inWishlist ? Colors.copper : Colors.cream }}>
                {inWishlist ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Hero ── */}
        <Animated.View style={[{ height: HERO_H, overflow: 'hidden' }, heroStyle]}>
          <HeroBg gi={gi} />
          <View style={styles.heroContent}>
            <Text style={styles.originTag}>
              {[coffee.origin_country, coffee.origin_region].filter(Boolean).join('  ·  ').toUpperCase()}
            </Text>
            <Text style={styles.coffeeName}>{coffee.name}</Text>
            {roastery?.name && (
              <View style={styles.roasteryRow}>
                <Text style={styles.roasteryName}>{roastery.name}</Text>
                {roastery.is_verified && <Text style={{ fontSize: 10, color: Colors.copper }}>✦</Text>}
              </View>
            )}
            <View style={styles.ratingRow}>
              <Text style={styles.avgRating}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
              <View>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <Text key={i} style={{ fontSize: 12, color: i <= Math.round(avg) ? Colors.gold : Colors.mist }}>★</Text>
                  ))}
                </View>
                <Text style={styles.checkinCount}>{count} check-in{count !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Meta tags ── */}
        {metaTags.length > 0 && (
          <Animated.ScrollView
            entering={FadeInDown.delay(100).duration(400)}
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.sm }}
          >
            {metaTags.map((tag) => (
              <View key={tag.label} style={[styles.metaTag, tag.highlight && styles.metaTagHighlight]}>
                <Text style={[styles.metaTagText, tag.highlight && styles.metaTagTextHighlight]}>{tag.label}</Text>
              </View>
            ))}
          </Animated.ScrollView>
        )}

        {/* ── Description ── */}
        {coffee.description && (
          <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.description}>{coffee.description}</Text>
          </Animated.View>
        )}

        {/* ── Rating breakdown ── */}
        {count > 0 && (
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>RATINGS</Text>
            <View style={styles.ratingCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginBottom: Spacing.lg }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.bigAvg}>{avg.toFixed(1)}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1,2,3,4,5].map(i => (
                      <Text key={i} style={{ fontSize: 11, color: i <= Math.round(avg) ? Colors.gold : Colors.mist }}>★</Text>
                    ))}
                  </View>
                  <Text style={styles.ratingCountSm}>{count} ratings</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <RatingDist dist={dist} total={count} />
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Community tasting notes ── */}
        {topNotes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>COMMUNITY NOTES</Text>
            <View style={styles.notesWrap}>
              {topNotes.map((n, i) => <NoteChip key={n} label={n} rank={i} />)}
            </View>
          </Animated.View>
        )}

        {/* ── Flavor profile (from community data) ── */}
        {flavorBars.length > 0 && (
          <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>FLAVOR PROFILE</Text>
            <View style={styles.flavorCard}>
              {flavorBars.map((b, i) => (
                <FlavorBar key={b.label} label={b.label} pct={b.pct} color={b.color} delay={i * 80} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Roastery card ── */}
        {roastery && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>ROASTERY</Text>
            <View style={styles.roasteryCard}>
              <View style={styles.roasteryAvatar}>
                <Text style={{ fontFamily: 'CormorantGaramond-SemiBold', fontSize: 22, color: Colors.cream }}>
                  {roastery.name?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={styles.roasteryCardName}>{roastery.name}</Text>
                  {roastery.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 1 }}>VERIFIED</Text>
                    </View>
                  )}
                </View>
                {roastery.location && (
                  <Text style={styles.roasteryLocation}>{roastery.location}</Text>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Similar Coffees ── */}
        {similarCoffees && similarCoffees.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.section}>
            <Text style={styles.sectionLabel}>YOU MIGHT ALSO LIKE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md }}>
              {similarCoffees.map((sc: any, i: number) => {
                const g = HERO_GRADIENTS[(gi + i + 1) % HERO_GRADIENTS.length];
                return (
                  <TouchableOpacity
                    key={sc.id}
                    onPress={() => { haptics.light(); router.push(`/coffee/${sc.id}` as any); }}
                    style={sim.card}
                    accessibilityRole="button"
                  >
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.from }]} />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.65 }]} />
                    <Text style={{ position: 'absolute', fontSize: 48, opacity: 0.1, bottom: -4, right: -4, lineHeight: 54 }}>☕</Text>
                    <View style={sim.body}>
                      <Text style={sim.origin} numberOfLines={1}>
                        {sc.origin_country?.toUpperCase() ?? ''}
                      </Text>
                      <Text style={sim.name} numberOfLines={2}>{sc.name}</Text>
                      {sc.avg_rating && (
                        <Text style={sim.rating}>{parseFloat(sc.avg_rating).toFixed(1)} ★</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Community check-ins ── */}
        {checkins.length > 0 && (
          <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              <Text style={styles.sectionLabel}>COMMUNITY</Text>
              <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 1 }}>
                {count} POURS
              </Text>
            </View>
            {checkins.slice(0, 6).map((c: any, i: number) => (
              <CheckinRow key={c.id} item={c} index={i} />
            ))}
          </Animated.View>
        )}

        {checkins.length === 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.section, { alignItems: 'center', paddingVertical: Spacing.xxxl }]}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.lg }}>☕</Text>
            <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 22, color: Colors.cream, textAlign: 'center', marginBottom: Spacing.sm }}>
              Be the first to pour.
            </Text>
            <Text style={{ fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, textAlign: 'center' }}>
              No check-ins yet. Share your experience.
            </Text>
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={styles.stickyBar}>
        <TouchableOpacity
          onPress={handleCheckin}
          style={styles.ctaBtn}
          accessibilityRole="button"
          accessibilityLabel="Check in this coffee"
        >
          <Text style={styles.ctaBtnText}>Check In This Coffee</Text>
          <Text style={{ fontSize: 18, color: Colors.ink }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Floating header
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  floatingHeaderBg: {
    backgroundColor: Colors.ink,
    borderBottomWidth: 1, borderBottomColor: Colors.hairline,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(8,6,4,0.72)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerBtnActive: { borderColor: Colors.copper, backgroundColor: 'rgba(196,105,58,0.15)' },
  headerBtnText: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 28, color: Colors.cream, lineHeight: 36 },
  headerTitle: {
    flex: 1, fontFamily: 'CormorantGaramond-SemiBold', fontSize: 16,
    color: Colors.cream, textAlign: 'center', marginHorizontal: Spacing.sm,
  },

  // Hero
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl,
  },
  originTag: {
    fontFamily: 'SyneMono-Regular', fontSize: 9, color: 'rgba(245,234,216,0.55)',
    letterSpacing: 2.5, marginBottom: Spacing.sm,
  },
  coffeeName: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 46, lineHeight: 50, color: Colors.cream,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16,
    marginBottom: Spacing.sm,
  },
  roasteryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  roasteryName: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.lg },
  avgRating: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 52, color: Colors.gold, lineHeight: 56 },
  checkinCount: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1, marginTop: 3 },

  // Meta tags
  metaTag: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.roast, borderWidth: 1, borderColor: Colors.hairline,
  },
  metaTagHighlight: { backgroundColor: 'rgba(196,105,58,0.12)', borderColor: 'rgba(196,105,58,0.35)' },
  metaTagText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  metaTagTextHighlight: { color: Colors.copper },

  // Sections
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xxl },
  sectionLabel: {
    fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog,
    letterSpacing: 3, marginBottom: Spacing.md,
  },
  description: { fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.cream, lineHeight: 24 },

  // Rating card
  ratingCard: { backgroundColor: Colors.inkSoft, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.hairline },
  bigAvg: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 52, color: Colors.gold, lineHeight: 56 },
  ratingCountSm: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 1, marginTop: 3 },

  // Notes
  notesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  // Flavor
  flavorCard: { backgroundColor: Colors.inkSoft, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.hairline },

  // Roastery
  roasteryCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.inkSoft, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.hairline,
  },
  roasteryAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.mahogany, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.copper,
    ...SHADOWS.copperSm,
  },
  roasteryCardName: { fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.cream, fontWeight: '700' as any },
  roasteryLocation: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1, marginTop: 3 },
  verifiedBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full,
    backgroundColor: 'rgba(196,105,58,0.12)', borderWidth: 1, borderColor: 'rgba(196,105,58,0.3)',
  },

  // Sticky CTA
  stickyBar: {    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(8,6,4,0.92)',
    borderTopWidth: 1, borderTopColor: Colors.hairline,
  },
  ctaBtn: {
    backgroundColor: Colors.copper, borderRadius: Radius.xl,
    paddingVertical: Spacing.base,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    ...SHADOWS.copper,
  },
  ctaBtnText: { fontFamily: 'Syne-Bold', fontSize: 15, color: Colors.ink },
});

// ─── Similar coffee card styles ───────────────────────────────────────────────
const sim = StyleSheet.create({
  card: {
    width: 140, height: 170, borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.hairline,
  },
  body: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md },
  origin: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 2, marginBottom: 4 },
  name: { fontFamily: 'CormorantGaramond-Italic', fontSize: 15, color: Colors.cream, lineHeight: 18, marginBottom: 4 },
  rating: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.gold, letterSpacing: 1 },
});
