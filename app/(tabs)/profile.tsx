import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, FadeInDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useProfile } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ProfileSkeleton, ListRowSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Colors, Typography, Spacing, Radius, SPRING, HERO_GRADIENTS } from '../../constants/tokens';

const { width: W } = require('react-native').Dimensions.get('window');

const TABS = ['Check-ins', 'Wishlist', 'Badges'];

const DNA_CATS: { label: string; keys: string[]; color: string }[] = [
  { label: 'FLORAL',   keys: ['jasmine','rose','chamomile','lavender','floral'],                    color: Colors.gold },
  { label: 'FRUITY',   keys: ['blueberry','peach','citrus','tropical','strawberry','stone fruit'],  color: Colors.amber },
  { label: 'SWEET',    keys: ['caramel','honey','vanilla','brown sugar','nougat'],                  color: Colors.copper },
  { label: 'NUTTY',    keys: ['hazelnut','almond','cocoa','dark choc'],                             color: '#a07840' },
  { label: 'ROASTED',  keys: ['tobacco','cedar','smoky','burnt'],                                   color: Colors.fog },
];

function buildDna(checkins: any[]) {
  const freq: Record<string, number> = {};
  for (const c of checkins ?? []) {
    for (const n of (c.tasting_notes ?? []) as string[]) {
      freq[n.toLowerCase()] = (freq[n.toLowerCase()] ?? 0) + 1;
    }
  }
  const total = Object.values(freq).reduce((a, b) => a + b, 0) || 1;
  return DNA_CATS.map(cat => ({
    label: cat.label,
    pct: Math.min(99, Math.round((cat.keys.reduce((a, k) => a + (freq[k] ?? 0), 0) / total) * 100)),
    color: cat.color,
  })).filter(b => b.pct > 0);
}

// ─── Animated DNA Bar ─────────────────────────────────────────────────────────
function DnaBar({ label, pct, index, color }: { label: string; pct: number; index: number; color: string }) {
  const width = useSharedValue(0);
  useEffect(() => { width.value = withDelay(index * 80, withTiming(pct, { duration: 600 })); }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));
  return (
    <View style={db.row}>
      <Text style={db.label}>{label}</Text>
      <View style={db.track}><Animated.View style={[db.fill, { backgroundColor: color }, barStyle]} /></View>
      <Text style={[db.pct, { color }]}>{pct}</Text>
    </View>
  );
}
const db = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, width: 56, letterSpacing: 1 },
  track: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  pct: { fontFamily: 'SyneMono-Regular', fontSize: 10, width: 24, textAlign: 'right' },
});

// ─── Avatar (initial-based gradient) ─────────────────────────────────────────
function Avatar({ url, name, size = 72 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = name?.[0]?.toUpperCase() ?? '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.mahogany, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: Colors.copper }}>
      <Text style={{ fontFamily: 'CormorantGaramond-SemiBold', fontSize: size * 0.38, color: Colors.cream }}>{initial}</Text>
    </View>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
function ProfileTabs({ active, onPress }: { active: number; onPress: (i: number) => void }) {
  const indicator = useSharedValue(0);
  return (
    <View style={pt.wrap}>
      {TABS.map((t, i) => (
        <TouchableOpacity key={t} onPress={() => { indicator.value = withSpring(i, SPRING); onPress(i); }} style={pt.tab} accessibilityRole="tab">
          <Text style={[pt.label, active === i && pt.labelActive]}>{t}</Text>
          {active === i && <View style={pt.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const pt = StyleSheet.create({
  wrap: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.hairline, marginBottom: Spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingBottom: Spacing.sm },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 1 },
  labelActive: { color: Colors.cream },
  underline: { position: 'absolute', bottom: 0, width: '100%', height: 2, backgroundColor: Colors.copper, borderRadius: 1 },
});

// ─── Grid Check-in Card ───────────────────────────────────────────────────────
function GridCard({ item, index }: { item: any; index: number }) {
  const g = HERO_GRADIENTS[index % HERO_GRADIENTS.length];
  const coffee = item.coffees;
  return (
    <View style={{ width: (W - Spacing.lg * 2 - Spacing.sm) / 2, backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.sm }}>
      <View style={{ height: 100, position: 'relative' }}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.from }]} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: g.mid, opacity: 0.6 }]} />
        <Text style={{ position: 'absolute', fontSize: 28, opacity: 0.3, top: 30, alignSelf: 'center' }}>☕</Text>
      </View>
      <View style={{ padding: Spacing.md }}>
        <Text style={{ fontFamily: 'CormorantGaramond-Italic', fontSize: 13, color: Colors.cream, lineHeight: 16, marginBottom: 3 }} numberOfLines={2}>{coffee?.name ?? '—'}</Text>
        <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.copper, letterSpacing: 1 }}>{coffee?.origin_country?.toUpperCase() ?? ''}</Text>
        <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.amber, marginTop: 2 }}>{item.rating?.toFixed(1)} ★</Text>
      </View>
    </View>
  );
}

// ─── Wishlist Row ─────────────────────────────────────────────────────────────
function WishRow({ item, onRemove }: { item: any; onRemove: () => void }) {
  const coffee = item.coffees;
  return (
    <View style={wr.row}>
      <View style={[wr.thumb, { backgroundColor: Colors.roast }]}><Text style={{ fontSize: 16 }}>☕</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={wr.name}>{coffee?.name ?? '—'}</Text>
        <Text style={wr.sub}>{coffee?.origin_country ?? ''}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={wr.remove} accessibilityRole="button">
        <Text style={{ fontSize: 11, color: Colors.copper }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
const wr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.hairline, minHeight: 60 },
  thumb: { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream, fontWeight: '700' as any, marginBottom: 2 },
  sub: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog },
  remove: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.inkSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.hairline },
});

// ─── Badge Cell ───────────────────────────────────────────────────────────────
function BadgeCell({ badge, earnedAt }: { badge: any; earnedAt?: string | null }) {
  const earned = !!earnedAt;
  return (
    <View style={{ width: (W - Spacing.lg * 2 - Spacing.sm * 2) / 3, alignItems: 'center', backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm }}>
      <View style={[bc.circle, !earned && bc.circleLocked]}>
        <Text style={[{ fontSize: 26 }, !earned && { opacity: 0.25 }]}>{badge.icon ?? '🏅'}</Text>
      </View>
      <Text style={[bc.name, !earned && { color: Colors.fog }]}>{badge.name}</Text>
      {earned
        ? <Text style={bc.date}>{new Date(earnedAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
        : <Text style={bc.locked}>LOCKED</Text>
      }
    </View>
  );
}
const bc = StyleSheet.create({
  circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.mahogany, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, shadowColor: Colors.copper, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  circleLocked: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowOpacity: 0 },
  name: { fontFamily: 'Syne-Regular', fontSize: 10, color: Colors.cream, textAlign: 'center', fontWeight: '600' as any, marginBottom: 2 },
  date: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog },
  locked: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.fog, letterSpacing: 2 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { user, profile: authProfile, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const { data: profile, isLoading, refetch } = useProfile();

  const headerScale = useSharedValue(0.95);
  const headerOp = useSharedValue(0);
  useEffect(() => {
    headerScale.value = withSpring(1.0, SPRING);
    headerOp.value = withTiming(1, { duration: 500 });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: headerOp.value, transform: [{ scale: headerScale.value }] }));

  const handleSignOut = async () => {
    await signOut();
    showToast({ type: 'success', title: 'Signed out.', subtitle: 'See you next cup.' });
    router.replace('/(auth)/login');
  };

  if (isLoading) return <View style={{ flex: 1, backgroundColor: Colors.ink }}><ProfileSkeleton /></View>;

  const displayName = profile?.full_name ?? authProfile?.full_name ?? 'Coffee Lover';
  const username = profile?.username ?? authProfile?.username ?? '—';
  const checkins = profile?.checkins ?? [];
  const wishlist = profile?.wishlists ?? [];
  const earnedBadges: any[] = profile?.user_badges ?? [];
  const followers = profile?.followers?.length ?? 0;
  const following = profile?.following?.length ?? 0;
  const origins = new Set(checkins.map((c: any) => c.coffees?.origin_country).filter(Boolean)).size;
  const avgRating = checkins.length
    ? (checkins.reduce((a: number, c: any) => a + (c.rating ?? 0), 0) / checkins.length).toFixed(1)
    : '—';
  const dnaBars = buildDna(checkins);


  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.ink }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.copper} />}>
      {/* Hero */}
      <Animated.View style={[styles.hero, heroStyle]}>
        <Avatar url={profile?.avatar_url} name={displayName} />
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.handle}>@{username}{profile?.location ? ` · ${profile.location}` : ''}</Text>
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.editBtn} accessibilityRole="button" accessibilityLabel="Edit profile">
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out">
            <Text style={{ fontSize: 14, color: Colors.fog }}>↩</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[{n: String(checkins.length), l:'Check-ins'}, {n: String(origins), l:'Origins'}, {n: String(followers), l:'Followers'}, {n: String(following), l:'Following'}].map((s, i) => (
          <React.Fragment key={s.l}>
            {i > 0 && <View style={styles.statDiv} />}
            <TouchableOpacity style={styles.statItem} accessibilityRole="button">
              <Text style={styles.statNum}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* DNA */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FLAVOR DNA</Text>
        <View style={styles.dnaCard}>
          {dnaBars.length > 0
            ? dnaBars.map((b, i) => <DnaBar key={b.label} label={b.label} pct={b.pct} index={i} color={b.color} />)
            : <Text style={{ fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, textAlign: 'center', paddingVertical: Spacing.md }}>
                Check in coffees to build your flavor DNA.
              </Text>
          }
        </View>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <ProfileTabs active={activeTab} onPress={setActiveTab} />

        {activeTab === 0 && (
          checkins.length === 0
            ? <EmptyState emoji="☕" title="No check-ins yet." subtitle="Your first cup is waiting." ctaLabel="Start check-in" onCta={() => router.push('/(tabs)/check-in')} />
            : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{checkins.map((c: any, i: number) => <GridCard key={c.id} item={c} index={i} />)}</View>
        )}

        {activeTab === 1 && (
          wishlist.length === 0
            ? <EmptyState emoji="☕" title="No coffees saved yet." subtitle="Browse Discover and save coffees to try." />
            : wishlist.map((w: any) => <WishRow key={w.coffee_id} item={w} onRemove={() => {}} />)
        )}

        {activeTab === 2 && (
          earnedBadges.length === 0
            ? <EmptyState emoji="🏅" title="Earn your first badge." subtitle="Check in 5 coffees from different origins." />
            : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{earnedBadges.map((ub: any) => <BadgeCell key={ub.badges?.id} badge={ub.badges} earnedAt={ub.earned_at} />)}</View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.lg, backgroundColor: Colors.inkSoft, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, marginBottom: Spacing.xl },
  name: { fontFamily: 'CormorantGaramond-Italic', fontSize: 26, color: Colors.cream, marginTop: Spacing.md, marginBottom: 4 },
  handle: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, letterSpacing: 2, marginBottom: Spacing.lg },
  heroActions: { flexDirection: 'row', gap: Spacing.sm },
  editBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline },
  editBtnText: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream },
  signOutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inkSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.hairline },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, borderBottomWidth: 1, borderColor: Colors.hairline, marginBottom: Spacing.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 28, color: Colors.cream, lineHeight: 32 },
  statLabel: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog },
  statDiv: { width: 1, height: 32, backgroundColor: Colors.hairline },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionLabel: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 3, marginBottom: Spacing.md },
  dnaCard: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Spacing.base },
});
