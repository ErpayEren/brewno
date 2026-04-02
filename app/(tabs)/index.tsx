import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated as RNAnimated,
  TouchableOpacity, StatusBar, Platform, RefreshControl,
  Dimensions, FlatList, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
  withDelay, FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler,
  useAnimatedRef, scrollTo, Extrapolation,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useFeed, useLike } from '../../hooks/useData';
import { useRecommendations, useTrending } from '../../hooks/useRecommendations';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { haptics } from '../../hooks/useHaptics';
import { FeedCardSkeleton } from '../../components/Skeleton';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import {
  Colors, Typography, Spacing, Radius, SPRING, SPRING_SNAPPY,
  HERO_GRADIENTS, SHADOWS,
} from '../../constants/tokens';

const { width: W, height: H } = Dimensions.get('window');
const CARD_HERO_HEIGHT = Math.min(340, H * 0.38);

// ─── Time greeting ────────────────────────────────────────────────────────────
const PHRASES: Record<string, string[]> = {
  morning:   ['early bird.', 'first pour.', 'sunrise ritual.', 'morning silence.'],
  afternoon: ['afternoon pick-me-up.', 'midday cup.', 'golden afternoon.'],
  evening:   ['golden hour.', 'wind down slowly.', 'last light.'],
  night:     ['night owl.', 'late pour.', 'moonlit cup.', 'after hours.'],
};
function buildGreeting() {
  const h = new Date().getHours();
  let slot = 'night';
  if (h >= 5 && h < 12) slot = 'morning';
  else if (h >= 12 && h < 17) slot = 'afternoon';
  else if (h >= 17 && h < 21) slot = 'evening';
  const arr = PHRASES[slot];
  const l1: Record<string, string> = { morning: 'Good morning,', afternoon: 'Good afternoon,', evening: 'Good evening,', night: 'Good evening,' };
  return { line1: l1[slot], line2: arr[Date.now() % arr.length] };
}
const GREET = buildGreeting();

// ─── Time ago ─────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ─── Radial gradient card background ─────────────────────────────────────────
function HeroBackground({ gi, children }: { gi: number; children?: React.ReactNode }) {
  const g = HERO_GRADIENTS[gi % HERO_GRADIENTS.length];
  return (
    <View style={{ width: '100%', height: CARD_HERO_HEIGHT }}>
      {/* Base */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.from }]} />
      {/* Mid layer — strong diagonal bloom */}
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: g.mid,
        opacity: 0.75,
        transform: [{ skewY: '-12deg' }, { translateY: CARD_HERO_HEIGHT * 0.15 }],
      }]} />
      {/* Top accent bloom */}
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: g.to,
        opacity: 0.35,
        borderRadius: W,
        transform: [{ scale: 1.6 }, { translateX: W * 0.2 }, { translateY: -CARD_HERO_HEIGHT * 0.4 }],
      }]} />
      {/* Bottom scrim for text legibility */}
      <View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: 'transparent',
        // We'll use a View with opacity gradient instead
      }]}>
        <View style={{ flex: 1 }} />
        <View style={{ height: CARD_HERO_HEIGHT * 0.55, backgroundColor: g.from, opacity: 0.85 }} />
      </View>
      {/* Coffee emoji watermark */}
      <Text style={{
        position: 'absolute', fontSize: 110, opacity: 0.08,
        top: -10, right: -10,
        transform: [{ rotate: '15deg' }],
        lineHeight: 120,
      }}>☕</Text>
      {children}
    </View>
  );
}

// ─── Rating badge ─────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <View style={rb.wrap}>
      <Text style={rb.num}>{rating.toFixed(1)}</Text>
      <View style={rb.stars}>
        {[1,2,3,4,5].map(i => (
          <Text key={i} style={{ fontSize: 10, color: i <= full ? Colors.amber : Colors.mist, lineHeight: 12 }}>★</Text>
        ))}
      </View>
    </View>
  );
}
const rb = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,6,4,0.72)',
    borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    ...SHADOWS.darkSm,
  },
  num: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 22, color: Colors.gold, lineHeight: 26 },
  stars: { flexDirection: 'row', gap: 2 },
});

// ─── Avatar with copper ring ──────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name?: string | null; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: Colors.mahogany,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: Colors.copper,
      ...SHADOWS.copperSm,
    }}>
      <Text style={{ fontFamily: 'CormorantGaramond-SemiBold', fontSize: size * 0.38, color: Colors.cream, lineHeight: size * 0.5 }}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

// ─── Flavor chip ─────────────────────────────────────────────────────────────
function FlavorTag({ tag }: { tag: string }) {
  return (
    <View style={ft.chip}>
      <Text style={ft.text}>{tag}</Text>
    </View>
  );
}
const ft = StyleSheet.create({
  chip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    backgroundColor: 'rgba(196,105,58,0.10)',
    borderWidth: 1, borderColor: 'rgba(196,105,58,0.22)',
  },
  text: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.amber, letterSpacing: 1 },
});

// ─── Feed Card ────────────────────────────────────────────────────────────────
const FeedCard = React.memo(function FeedCard({ item, index, userId }: {
  item: any; index: number; userId?: string;
}) {
  const likeMutation = useLike();
  const { showToast } = useUIStore();
  const liked = item.likes?.some((l: any) => l.user_id === userId);
  const likeCount = item.likes?.length ?? 0;

  const cardScale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const heartColor = useSharedValue(0); // 0 = fog, 1 = copper

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: interpolate(heartColor.value, [0, 1], [0.7, 1], Extrapolation.CLAMP),
  }));

  const onLike = () => {
    if (!userId) {
      showToast({ type: 'info', title: 'Sign in to like.' });
      return;
    }
    haptics.heavy();
    heartScale.value = withSequence(
      withSpring(1.5, SPRING_SNAPPY),
      withSpring(1.0, SPRING)
    );
    heartColor.value = withTiming(liked ? 0 : 1, { duration: 200 });
    likeMutation.mutate({ checkinId: item.id, liked });
  };

  const coffee   = item.coffees;
  const user     = item.users;
  const cafe     = item.cafes;
  const tags     = (item.tasting_notes ?? []) as string[];
  const gi       = index % HERO_GRADIENTS.length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(500).springify()} style={[cs.card, cardStyle]}>
      <Pressable
        onPressIn={() => { cardScale.value = withSpring(0.977, SPRING); }}
        onPressOut={() => { cardScale.value = withSpring(1.0, SPRING); }}
        onPress={() => coffee?.id && router.push(`/coffee/${coffee.id}` as any)}
      >
        {/* ─── Hero area ─────────────────────────────────────── */}
        <HeroBackground gi={gi}>
          {/* Top: Avatar + user */}
          <View style={cs.heroTop}>
            <Avatar name={user?.username} />
            <View style={{ flex: 1 }}>
              <Text style={cs.username}>{user?.username ?? 'unknown'}</Text>
              {cafe && <Text style={cs.cafeName}>{cafe.name}</Text>}
            </View>
            <Text style={cs.time}>{timeAgo(item.created_at)}</Text>
          </View>

          {/* Bottom: coffee name floated over hero */}
          <View style={cs.heroBottom}>
            <Text style={cs.originTag}>
              {[coffee?.origin_country, coffee?.process_method]
                .filter(Boolean).join('  ·  ').toUpperCase()}
            </Text>
            <Text style={cs.coffeeName} numberOfLines={2}>{coffee?.name ?? '—'}</Text>
          </View>

          {/* Rating badge — top-right absolute */}
          <View style={cs.ratingPos}>
            <StarRating rating={item.rating ?? 0} />
          </View>
        </HeroBackground>

        {/* ─── Body ──────────────────────────────────────────── */}
        {(item.notes || tags.length > 0) && (
          <View style={cs.body}>
            {item.notes && (
              <Text style={cs.notes} numberOfLines={3}>{item.notes}</Text>
            )}
            {tags.length > 0 && (
              <View style={cs.tagRow}>
                {tags.slice(0, 5).map((t: string) => <FlavorTag key={t} tag={t} />)}
              </View>
            )}
          </View>
        )}

        {/* ─── Actions bar ───────────────────────────────────── */}
        <View style={cs.actions}>
          {/* Like */}
          <TouchableOpacity onPress={onLike} style={cs.actionBtn} accessibilityRole="button" accessibilityLabel={`Like. ${likeCount} likes`}>
            <Animated.Text style={[cs.heart, heartStyle, liked && { color: Colors.copper }]}>
              {liked ? '♥' : '♡'}
            </Animated.Text>
            <Text style={cs.actionCount}>{likeCount > 0 ? likeCount : ''}</Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={cs.actionBtn} accessibilityRole="button" accessibilityLabel="Comment">
            <Text style={cs.actionIcon}>⌁</Text>
            <Text style={cs.actionCount}>{item.comments?.length > 0 ? item.comments.length : ''}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flex: 1 }} />

          {/* Roastery tag */}
          {coffee?.roasteries?.name && (
            <View style={cs.roasteryTag}>
              <Text style={cs.roasteryText}>{coffee.roasteries.name}</Text>
              {coffee.roasteries.is_verified && <Text style={{ fontSize: 10, color: Colors.copper }}>✦</Text>}
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const cs = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.inkSoft,
    borderWidth: 1, borderColor: Colors.hairline,
    ...SHADOWS.dark,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
  },
  username: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream, fontWeight: '700' as any, lineHeight: 16 },
  cafeName: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 1.5, marginTop: 1 },
  time: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.lg, paddingTop: Spacing.md,
  },
  originTag: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: 'rgba(245,234,216,0.5)', letterSpacing: 2, marginBottom: 6 },
  coffeeName: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 30, lineHeight: 34, color: Colors.cream,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  ratingPos: { position: 'absolute', top: Spacing.base, right: Spacing.base },
  body: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.hairline },
  notes: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, lineHeight: 20, marginBottom: Spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.hairline,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  heart: { fontSize: 18, color: Colors.fog },
  actionIcon: { fontSize: 18, color: Colors.fog },
  actionCount: { fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.fog, letterSpacing: 0.5 },
  roasteryTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    backgroundColor: Colors.roast, borderWidth: 1, borderColor: Colors.hairline,
  },
  roasteryText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
});

// ─── Header Component ─────────────────────────────────────────────────────────
function FeedHeader({
  active, onFilter, profile, recommendations, trending,
}: { active: string; onFilter: (f: string) => void; profile: any; recommendations?: any[]; trending?: any[] }) {
  const FILTERS = ['All', 'Following', 'Nearby'];

  return (
    <View style={hs.wrap}>
      {/* Greeting text — MASSIVE editorial */}
      <Animated.View entering={FadeIn.duration(600)} style={hs.greetBlock}>
        <View style={hs.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={hs.line1}>{GREET.line1}</Text>
            <Text style={hs.line2} numberOfLines={1} adjustsFontSizeToFit>
              {profile?.full_name
                ? profile.full_name.split(' ')[0].toLowerCase() + '.'
                : GREET.line2}
            </Text>
          </View>
          <Animated.View entering={FadeIn.delay(200).duration(400)}>
            <TouchableOpacity style={hs.bellBtn} accessibilityLabel="Notifications" accessibilityRole="button">
              <Text style={{ fontSize: 17 }}>🔔</Text>
              <View style={hs.bellDot} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Copper divider with glow */}
        <View style={hs.copperLine} />
      </Animated.View>

      {/* Stats row — editorial numbers */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={hs.statsRow}>
        {[
          { n: profile?.checkins?.length ?? '—', l: 'CHECK·INS' },
          { n: '—', l: 'ORIGINS' },
          { n: '—', l: 'AVG SCORE' },
        ].map((s, i) => (
          <React.Fragment key={s.l}>
            {i > 0 && <View style={hs.statDiv} />}
            <View style={hs.statItem}>
              <Text style={hs.statNum}>{String(s.n)}</Text>
              <Text style={hs.statLabel}>{s.l}</Text>
            </View>
          </React.Fragment>
        ))}
      </Animated.View>

      {/* Filter chips */}
      <Animated.View entering={FadeInDown.delay(180).duration(500)} style={hs.filterRow}>
        {FILTERS.map((f) => {
          const isActive = active === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => onFilter(f)}
              style={[hs.chip, isActive && hs.chipActive]}
              accessibilityRole="button"
            >
              {isActive && <View style={hs.chipGlow} />}
              <Text style={[hs.chipText, isActive && hs.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ flex: 1 }} />
        <View style={hs.sortBtn}>
          <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 }}>SORT ↕</Text>
        </View>
      </Animated.View>

      {/* For You row */}
      {recommendations && recommendations.length > 0 && (
        <Animated.View entering={FadeInDown.delay(140).duration(400)} style={{ marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 20, color: Colors.cream, lineHeight: 24 }}>For You</Text>
            <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 1 }}>PERSONALIZED</Text>
          </View>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={recommendations}
            keyExtractor={(i: any) => i.id}
            contentContainerStyle={{ gap: Spacing.sm }}
            renderItem={({ item, index }: any) => {
              const g = HERO_GRADIENTS[index % HERO_GRADIENTS.length];
              return (
                <TouchableOpacity
                  onPress={() => router.push(`/coffee/${item.id}` as any)}
                  style={[rw.card, { backgroundColor: g.from }]}
                  accessibilityRole="button"
                >
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.6 }]} />
                  <View style={rw.matchBadge}>
                    <Text style={rw.matchText}>{item.match_score}%</Text>
                  </View>
                  <View style={rw.bottom}>
                    <Text style={rw.origin} numberOfLines={1}>{item.origin_country?.toUpperCase()}</Text>
                    <Text style={rw.name} numberOfLines={2}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      )}

      {/* Trending row */}
      {trending && trending.length > 0 && (
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 20, color: Colors.cream, lineHeight: 24 }}>Trending</Text>
            <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 1 }}>THIS WEEK</Text>
          </View>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={trending}
            keyExtractor={(i: any) => i.id}
            contentContainerStyle={{ gap: Spacing.sm }}
            renderItem={({ item, index }: any) => {
              const g = HERO_GRADIENTS[(index + 2) % HERO_GRADIENTS.length];
              return (
                <TouchableOpacity
                  onPress={() => router.push(`/coffee/${item.id}` as any)}
                  style={[rw.card, { backgroundColor: g.from }]}
                  accessibilityRole="button"
                >
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.6 }]} />
                  <View style={rw.trendBadge}>
                    <Text style={rw.trendText}>{item.checkin_count} pours</Text>
                  </View>
                  <View style={rw.bottom}>
                    <Text style={rw.origin} numberOfLines={1}>{item.origin_country?.toUpperCase()}</Text>
                    <Text style={rw.name} numberOfLines={2}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      )}

      {/* Section label */}
      <Text style={hs.section}>
        {active === 'Following' ? "FRIENDS' PICKS" : active === 'Nearby' ? 'NEAR YOU' : 'LATEST POURS'}
      </Text>
    </View>
  );
}

const rw = StyleSheet.create({
  card: { width: 130, height: 160, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.hairline },
  matchBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: Colors.copper, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  matchText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.ink, fontWeight: '700' as any },
  trendBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(8,6,4,0.72)', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: Colors.hairline },
  trendText: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 0.5 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.sm },
  origin: { fontFamily: 'SyneMono-Regular', fontSize: 7, color: Colors.copper, letterSpacing: 1.5, marginBottom: 3 },
  name: { fontFamily: 'CormorantGaramond-Italic', fontSize: 14, color: Colors.cream, lineHeight: 17 },
});
const hs = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.md,
  },
  greetRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.lg },
  greetBlock: { marginBottom: Spacing.xl },
  line1: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 2, marginBottom: 4 },
  line2: {
    fontFamily: 'CormorantGaramond-LightItalic',
    fontSize: 58, lineHeight: 62, color: Colors.cream,
  },
  copperLine: {
    height: 1.5, backgroundColor: Colors.copper, opacity: 0.5,
    shadowColor: Colors.copper, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6,
  },
  bellBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.roast,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.hairline,
    marginBottom: 6,
  },
  bellDot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.copper, borderWidth: 1.5, borderColor: Colors.ink },
  statsRow: {
    flexDirection: 'row', marginBottom: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 36, color: Colors.gold, lineHeight: 40, marginBottom: 2 },
  statLabel: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 2.5 },
  statDiv: { width: 1, height: 36, backgroundColor: Colors.hairline, alignSelf: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.hairline, position: 'relative', overflow: 'hidden',
  },
  chipActive: { borderColor: Colors.copper, backgroundColor: Colors.roast },
  chipGlow: {
    position: 'absolute', inset: 0,
    backgroundColor: Colors.copperGlowSoft,
  },
  chipText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  chipTextActive: { color: Colors.cream },
  sortBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline,
  },
  section: {
    fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.mist,
    letterSpacing: 3, marginBottom: Spacing.md,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const [filter, setFilter] = useState('All');
  const { user, profile } = useAuthStore();
  const { data, isLoading, isError, error, refetch, isFetching } = useFeed(filter);
  const { data: recommendations } = useRecommendations(6);
  const { data: trending } = useTrending(6);

  const renderCard = useCallback(({ item, index }: { item: any; index: number }) => (
    <FeedCard item={item} index={index} userId={user?.id} />
  ), [user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.ink} />
      <FlatList
        data={isLoading ? [] : (data ?? [])}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <FeedHeader active={filter} onFilter={setFilter} profile={profile} recommendations={recommendations} trending={trending} />
        }
        ListEmptyComponent={
          isLoading
            ? (
              <View style={{ paddingHorizontal: Spacing.lg }}>
                <FeedCardSkeleton />
                <FeedCardSkeleton />
              </View>
            )
            : isError
            ? <ErrorState message={(error as Error)?.message} onRetry={refetch} />
            : (
              <EmptyState
                emoji="☕"
                title="Your first cup is waiting."
                subtitle="Find a specialty café nearby and do your first check-in."
                ctaLabel="Start check-in →"
                onCta={() => router.push('/(tabs)/check-in' as any)}
              />
            )
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={Colors.copper}
          />
        }
      />
    </View>
  );
}
