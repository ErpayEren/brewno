import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, SPRING, SPRING_SNAPPY } from '../constants/tokens';
import { haptics } from '../hooks/useHaptics';

const { width: W } = Dimensions.get('window');

// SCA Coffee Taster's Flavor Wheel — simplified 2-tier
export const WHEEL: Record<string, { color: string; notes: string[] }> = {
  FLORAL:    { color: '#d4a0c0', notes: ['Yasemin', 'Gül', 'Papatya', 'Lavanta', 'Portakal Çiçeği'] },
  FRUITY:    { color: Colors.amber, notes: ['Yaban Mersini', 'Şeftali', 'Taş Meyve', 'Narenciye', 'Tropikal', 'Çilek', 'Limon', 'Misket Limonu'] },
  SWEET:     { color: Colors.copper, notes: ['Karamel', 'Bal', 'Vanilya', 'Esmer Şeker', 'Nuga', 'Pekmez'] },
  NUTTY:     { color: '#a07840', notes: ['Fındık', 'Badem', 'Kakao', 'Bitter Çikolata', 'Yer Fıstığı'] },
  SPICE:     { color: '#c08040', notes: ['Bergamot', 'Tarçın', 'Karanfil', 'Biber', 'Anason'] },
  ROASTED:   { color: Colors.fog, notes: ['Tütün', 'Sedir', 'İsli', 'Yanık', 'Kömürleşmiş'] },
  FERMENTED: { color: '#8060a0', notes: ['Şarabımsı', 'Viskimsi', 'Funky', 'Ekşi', 'Kombucha'] },
  EARTHY:    { color: '#607040', notes: ['Mantar', 'Islak Toprak', 'Yosunsu', 'Bitkisel'] },
};

const CATEGORIES = Object.keys(WHEEL) as (keyof typeof WHEEL)[];

interface TastingWheelProps {
  selected: string[];
  onToggle: (note: string) => void;
  maxNotes?: number;
}

// ─── Single note chip ─────────────────────────────────────────────────────────
function NoteChip({ label, active, color, onToggle }: {
  label: string; active: boolean; color: string; onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={s}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSequence(withSpring(0.88, SPRING_SNAPPY), withSpring(1.0, SPRING));
          haptics.light();
          onToggle();
        }}
        style={[
          nc.chip,
          active && { backgroundColor: color + '28', borderColor: color },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: active }}
      >
        {active && <View style={[nc.dot, { backgroundColor: color }]} />}
        <Text style={[nc.label, active && { color: Colors.cream }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const nc = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline,
    backgroundColor: Colors.inkSoft,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontFamily: 'Syne-Regular', fontSize: 12, color: Colors.fog },
});

// ─── Category pill ────────────────────────────────────────────────────────────
function CategoryPill({ label, color, active, count, onPress }: {
  label: string; color: string; active: boolean; count: number; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={s}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSequence(withSpring(0.92, SPRING_SNAPPY), withSpring(1.0, SPRING));
          haptics.selection();
          onPress();
        }}
        style={[
          cp.pill,
          active && { borderColor: color, backgroundColor: color + '18' },
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <View style={[cp.swatch, { backgroundColor: color }]} />
        <Text style={[cp.label, active && { color: Colors.cream }]}>{label}</Text>
        {count > 0 && (
          <View style={[cp.badge, { backgroundColor: color }]}>
            <Text style={cp.badgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
const cp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline,
    backgroundColor: Colors.inkSoft,
  },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  badge: {
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: Colors.ink, fontWeight: '700' as any },
});

// ─── Main TastingWheel component ──────────────────────────────────────────────
export function TastingWheel({ selected, onToggle, maxNotes = 6 }: TastingWheelProps) {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const cat = WHEEL[activeCategory];

  return (
    <View style={tw.container}>
      {/* Category selector — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.catRow}
      >
        {CATEGORIES.map((c) => {
          const count = WHEEL[c].notes.filter(n => selected.includes(n)).length;
          return (
            <CategoryPill
              key={c}
              label={c}
              color={WHEEL[c].color}
              active={activeCategory === c}
              count={count}
              onPress={() => setActiveCategory(c)}
            />
          );
        })}
      </ScrollView>

      {/* Notes grid for active category */}
      <View style={tw.notesGrid}>
        {cat.notes.map((note) => {
          const active = selected.includes(note);
          const atMax = !active && selected.length >= maxNotes;
          return (
            <NoteChip
              key={note}
              label={note}
              active={active}
              color={cat.color}
              onToggle={() => {
                if (atMax) {
                  haptics.warning();
                  return;
                }
                onToggle(note);
              }}
            />
          );
        })}
      </View>

      {/* Selected count indicator */}
      <View style={tw.footer}>
        <View style={tw.footerDots}>
          {Array.from({ length: maxNotes }).map((_, i) => (
            <View
              key={i}
              style={[
                tw.footerDot,
                i < selected.length && { backgroundColor: Colors.copper },
              ]}
            />
          ))}
        </View>
        <Text style={tw.footerText}>
          {selected.length}/{maxNotes} not seçildi
        </Text>
      </View>
    </View>
  );
}

const tw = StyleSheet.create({
  container: { gap: Spacing.lg },
  catRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  notesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm },
  footerDots: { flexDirection: 'row', gap: 4 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.roast, borderWidth: 1, borderColor: Colors.hairline },
  footerText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
});
