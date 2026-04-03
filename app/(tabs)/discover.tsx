import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Platform, RefreshControl, Pressable, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeIn, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useCoffees } from '../../hooks/useData';
import { CoffeeCardSkeleton } from '../../components/Skeleton';
import { EmptyState, ErrorState } from '../../components/EmptyState';
import {
  Colors, Typography, Spacing, Radius, SPRING, SPRING_SNAPPY,
  HERO_GRADIENTS, SHADOWS,
} from '../../constants/tokens';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.lg * 2 - Spacing.md) / 2;

const GROUPS = {
  Process: ['All', 'Washed', 'Natural', 'Honey', 'Anaerobic'],
  Roast:   ['All', 'Light', 'Medium-Light', 'Medium', 'Dark'],
  Origin:  ['All', 'Ethiopia', 'Kenya', 'Colombia', 'Panama', 'Yemen'],
} as const;
type GroupKey = keyof typeof GROUPS;

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    borderColor: `rgba(196,105,58,${interpolate(borderAnim.value, [0, 1], [0.12, 0.7], Extrapolation.CLAMP)})`,
    borderWidth: interpolate(borderAnim.value, [0, 1], [1, 1.5], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[sb.wrap, style]}>
      <Text style={{ fontSize: 15, color: Colors.copper }}>⊙</Text>
      <TextInput
        style={sb.input}
        placeholder="Origin, variety, roastery..."
        placeholderTextColor={Colors.mist}
        value={value}
        onChangeText={onChange}
        onFocus={() => { setFocused(true); borderAnim.value = withTiming(1, { duration: 200 }); }}
        onBlur={() => { setFocused(false); borderAnim.value = withTiming(0, { duration: 200 }); }}
        accessibilityLabel="Search coffees"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} style={sb.clear}>
          <Text style={{ color: Colors.fog, fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.roast, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base, paddingVertical: 12, gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  input: { flex: 1, fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.cream, lineHeight: 18 },
  clear: { padding: 4 },
});

// ─── Coffee card ─────────────────────────────────────────────────────────────
function CoffeeCard({ item, index }: { item: any; index: number }) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const g = HERO_GRADIENTS[index % HERO_GRADIENTS.length];
  const full = Math.floor(parseFloat(item.avg_rating ?? '0'));
  const brewScore = item.brew_score ?? null;
  const brewScoreColor = brewScore !== null
    ? brewScore >= 80 ? '#4CAF50' : brewScore >= 60 ? '#FFC107' : '#FF9800'
    : Colors.fog;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400).springify()}
      style={[cc.card, s, { width: CARD_W }]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, SPRING_SNAPPY); }}
        onPressOut={() => { scale.value = withSpring(1.0, SPRING); }}
        style={{ flex: 1 }}
        accessibilityRole="button"
      >
        {/* Hero */}
        <View style={{ height: 160, position: 'relative' }}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.from }]} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.7, transform: [{ skewY: '-12deg' }, { translateY: 40 }] }]} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.to, opacity: 0.3, borderRadius: CARD_W, transform: [{ scale: 1.8 }, { translateX: CARD_W * 0.3 }, { translateY: -80 }] }]} />
          <Text style={{ position: 'absolute', fontSize: 52, opacity: 0.12, bottom: -4, right: -4, lineHeight: 58 }}>☕</Text>
          {/* Process tag */}
          {item.process_method && (
            <View style={cc.processTag}>
              <Text style={cc.processText}>{item.process_method.toUpperCase()}</Text>
            </View>
          )}
          {/* BrewScore badge */}
          {brewScore !== null && (
            <View style={[cc.brewBadge, { borderColor: brewScoreColor }]}>
              <Text style={[cc.brewScore, { color: brewScoreColor }]}>{brewScore}</Text>
              <Text style={cc.brewLabel}>BREW</Text>
            </View>
          )}
        </View>
        {/* Body */}
        <View style={cc.body}>
          <Text style={cc.origin} numberOfLines={1}>
            {[item.origin_country, item.origin_region].filter(Boolean).join(' ·  ').toUpperCase()}
          </Text>
          <Text style={cc.name} numberOfLines={2}>{item.name}</Text>
          {/* Rating */}
          {item.avg_rating && (
            <View style={cc.ratingRow}>
              <Text style={cc.ratingNum}>{parseFloat(item.avg_rating).toFixed(1)}</Text>
              <Text style={cc.stars}>{'★'.repeat(full)}{'☆'.repeat(5-full)}</Text>
            </View>
          )}
          {/* Roastery */}
          {item.roasteries?.name && (
            <Text style={cc.roastery} numberOfLines={1}>
              {item.roasteries.name}{item.roasteries.is_verified ? ' ✦' : ''}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
const cc = StyleSheet.create({
  card: {
    backgroundColor: Colors.inkSoft, borderRadius: Radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.hairline,
    ...SHADOWS.darkSm,
  },
  processTag: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(8,6,4,0.72)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline,
  },
  processText: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 1 },
  brewBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(8,6,4,0.80)',
    paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: Radius.md, borderWidth: 1, alignItems: 'center',
  },
  brewScore: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 16, lineHeight: 18 },
  brewLabel: { fontFamily: 'SyneMono-Regular', fontSize: 6, color: Colors.fog, letterSpacing: 1.5 },
  body: { padding: Spacing.md },
  origin: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 1.5, marginBottom: 5 },
  name: { fontFamily: 'CormorantGaramond-Italic', fontSize: 18, color: Colors.cream, lineHeight: 22, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
  ratingNum: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 20, color: Colors.gold, lineHeight: 24 },
  stars: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.amber, letterSpacing: 1.5 },
  roastery: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 0.5, marginTop: 2 },
});

// ─── Featured row (horizontal scroll) ────────────────────────────────────────
function FeaturedRoastRow({ coffees }: { coffees: any[] }) {
  if (!coffees || coffees.length === 0) return null;
  return (
    <View style={{ marginBottom: Spacing.xxl }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.md }}>
        <Text style={{ fontFamily: 'CormorantGaramond-LightItalic', fontSize: 22, color: Colors.cream, lineHeight: 26 }}>Exceptional Origins</Text>
        <TouchableOpacity><Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 1 }}>SEE ALL</Text></TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={coffees.slice(0, 5)}
        keyExtractor={i => i.id}
        contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.base }}
        renderItem={({ item, index }) => {
          const g = HERO_GRADIENTS[index % HERO_GRADIENTS.length];
          return (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={fr.card}>
              <View style={[fr.bg, { backgroundColor: g.from }]} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.6, borderRadius: Radius.xl }]} />
              <View style={fr.bottom}>
                <Text style={fr.country}>{item.origin_country?.toUpperCase()}</Text>
                <Text style={fr.name} numberOfLines={2}>{item.name}</Text>
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}
const fr = StyleSheet.create({
  card: { width: 140, height: 180, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.hairline },
  bg: { ...StyleSheet.absoluteFillObject, borderRadius: Radius.xl },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.sm },
  country: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 2, marginBottom: 4 },
  name: { fontFamily: 'CormorantGaramond-Italic', fontSize: 14, color: Colors.cream, lineHeight: 17 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupKey>('Process');
  const [filters, setFilters] = useState<Record<GroupKey, string>>({ Process:'All', Roast:'All', Origin:'All' });

  const { data, isLoading, isError, error, refetch } = useCoffees(query, filters);

  const renderItem = useCallback(({ item, index }: any) => (
    <CoffeeCard item={item} index={index} />
  ), []);

  const Header = (
    <View>
      {/* Title block */}
      <Animated.View entering={FadeIn.duration(500)} style={ds.titleBlock}>
        <Text style={ds.eyebrow}>SPECIALTY COFFEE</Text>
        <Text style={ds.title}>Discover</Text>
        <Text style={ds.subtitle}>Curated origins, processes & roasters.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <SearchBar value={query} onChange={setQuery} />
      </Animated.View>

      {/* Featured horizontal */}
      {!isLoading && data && data.length > 0 && (
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <FeaturedRoastRow coffees={data.filter((c: any) => c.avg_rating && parseFloat(c.avg_rating) >= 4)} />
        </Animated.View>
      )}

      {/* Group tabs */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)} style={ds.tabs}>
        {(Object.keys(GROUPS) as GroupKey[]).map((g) => (
          <TouchableOpacity
            key={g} onPress={() => setGroup(g)}
            style={[ds.tab, group === g && ds.tabActive]}
            accessibilityRole="tab"
          >
            <Text style={[ds.tabLabel, group === g && ds.tabLabelActive]}>{g}</Text>
            {group === g && <View style={ds.tabUnder} />}
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Filter chips */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={ds.chipRow}>
        {GROUPS[group].map((val) => {
          const active = filters[group] === val;
          return (
            <TouchableOpacity
              key={val}
              onPress={() => setFilters(p => ({ ...p, [group]: val }))}
              style={[ds.chip, active && ds.chipActive]}
              accessibilityRole="button"
            >
              {active && <View style={ds.chipGlow} />}
              <Text style={[ds.chipText, active && ds.chipTextActive]}>{val}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Count */}
      <Text style={ds.count}>{data?.length ?? 0} COFFEES · {query ? 'FILTERED' : 'ALL ORIGINS'}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ink }}>
      <FlatList
        data={isLoading ? [] : (data ?? [])}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        numColumns={2}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          isLoading
            ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
                <CoffeeCardSkeleton />
                <CoffeeCardSkeleton />
                <CoffeeCardSkeleton />
                <CoffeeCardSkeleton />
              </View>
            )
            : isError
            ? <ErrorState message={(error as Error)?.message} onRetry={refetch} />
            : <EmptyState emoji="🔍" title="Nothing matches." subtitle="Try a different origin or process filter." />
        }
        columnWrapperStyle={{ gap: Spacing.md, marginBottom: Spacing.md }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.copper} />}
      />
    </View>
  );
}

const ds = StyleSheet.create({
  titleBlock: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    marginBottom: Spacing.xxl,
  },
  eyebrow: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 3, marginBottom: Spacing.sm },
  title: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 56, lineHeight: 60, color: Colors.cream, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.md },
  tab: { paddingBottom: 8, alignItems: 'center' },
  tabActive: {},
  tabLabel: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog, fontWeight: '600' as any },
  tabLabelActive: { color: Colors.cream },
  tabUnder: { position: 'absolute', bottom: 0, width: '100%', height: 2, backgroundColor: Colors.copper, borderRadius: 1, shadowColor: Colors.copper, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.hairline, overflow: 'hidden', position: 'relative',
  },
  chipActive: { borderColor: Colors.copper },
  chipGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.copperGlowSoft },
  chipText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  chipTextActive: { color: Colors.cream },
  count: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.mist, letterSpacing: 2, marginBottom: Spacing.lg },
});
