import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, withDelay, FadeInDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSubmitCheckin, useCoffees, useCafes } from '../../hooks/useData';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { haptics } from '../../hooks/useHaptics';
import { TastingWheel } from '../../components/TastingWheel';
import { BarcodeScanner } from '../../components/BarcodeScanner';
import { lookupBarcode } from '../../hooks/useData';
import { Colors, Typography, Spacing, Radius, SPRING } from '../../constants/tokens';

const STEPS = ['Coffee', 'Café', 'Flavors', 'Rate'];
const BREW_METHODS = ['Espresso', 'V60', 'Chemex', 'AeroPress', 'French Press', 'Cold Brew'];
const MAX_FLAVORS = 6;

type Step = 0 | 1 | 2 | 3;

// ─── Star Button — isolated component so hooks are valid ─────────────────────
function StarButton({ index, filled, onPress }: { index: number; filled: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={() => {
          scale.value = withSequence(withSpring(1.4, SPRING), withSpring(1.0, SPRING));
          haptics.selection();
          onPress();
        }}
        style={{ padding: 4, minWidth: 44, alignItems: 'center' }}
        accessibilityRole="button"
      >
        <Text style={{ fontSize: 36, color: filled ? Colors.copper : Colors.roast }}>★</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  return (
    <View style={si.row}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && <View style={[si.line, (done || active) && si.lineDone]} />}
            <View style={si.item}>
              <View style={[si.dot, done && si.dotDone, active && si.dotActive]}>
                <Text style={[si.num, done && si.numDone, active && si.numActive]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[si.label, active && si.labelActive, done && si.labelDone]}>{label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  item: { alignItems: 'center', gap: 4 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dotActive: { borderColor: Colors.copper },
  dotDone: { backgroundColor: Colors.copper, borderColor: Colors.copper },
  num: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog },
  numActive: { color: Colors.copper, fontWeight: '700' as any },
  numDone: { color: Colors.ink, fontWeight: '700' as any },
  label: { fontFamily: 'SyneMono-Regular', fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
  labelActive: { color: Colors.cream, fontWeight: '700' as any },
  labelDone: { color: Colors.fog },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 14 },
  lineDone: { backgroundColor: Colors.copper },
});

// ─── Search Bar ──────────────────────────────────────────────────────────────
function StepSearchBar({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[ssb.wrap, { borderColor: focused ? Colors.copper : Colors.hairline, borderWidth: focused ? 1.5 : 1 }]}>
      <Text style={{ color: Colors.copper, fontSize: 14 }}>⊙</Text>
      <TextInput style={ssb.input} placeholder={placeholder} placeholderTextColor={Colors.fog} value={value} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </View>
  );
}
const ssb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: 10, gap: Spacing.sm, marginBottom: Spacing.lg },
  input: { flex: 1, fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.cream },
});

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ visible, coffeeName, onDismiss }: { visible: boolean; coffeeName: string; onDismiss: () => void }) {
  const overlayOp = useSharedValue(0);
  const circleScale = useSharedValue(0);
  const textOp = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      overlayOp.value = withTiming(1, { duration: 300 });
      circleScale.value = withDelay(100, withSpring(1.0, { mass: 0.6, stiffness: 180, damping: 12 }));
      textOp.value = withDelay(400, withTiming(1, { duration: 300 }));
      const t = setTimeout(onDismiss, 1800);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const oStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));
  const cStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const tStyle = useAnimatedStyle(() => ({ opacity: textOp.value }));

  if (!visible) return null;
  return (
    <Animated.View style={[so.overlay, oStyle]}>
      <Animated.View style={[so.circle, cStyle]}><Text style={so.check}>✓</Text></Animated.View>
      <Animated.View style={tStyle}>
        <Text style={so.saved}>Saved!</Text>
        <Text style={so.sub}>{coffeeName}</Text>
      </Animated.View>
    </Animated.View>
  );
}
const so = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  circle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.copper, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  check: { fontSize: 36, color: Colors.ink, fontWeight: '800' as any },
  saved: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 28, color: Colors.cream, textAlign: 'center' },
  sub: { fontFamily: 'SyneMono-Regular', fontSize: 10, color: Colors.fog, textAlign: 'center', marginTop: 4 },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const [step, setStep] = useState<Step>(0);
  const [coffeeSearch, setCoffeeSearch] = useState('');
  const [cafeSearch, setCafeSearch] = useState('');
  const [selectedCoffee, setSelectedCoffee] = useState<any>(null);
  const [selectedCafe, setSelectedCafe] = useState<any>(null);
  const [flavors, setFlavors] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [brewMethod, setBrewMethod] = useState('');
  const [savedVisible, setSavedVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const { width: panelW } = useWindowDimensions();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { data: coffees } = useCoffees(coffeeSearch);
  const { data: cafes } = useCafes(cafeSearch);
  const submitMutation = useSubmitCheckin();

  const panelX = useSharedValue(0);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelX.value }] }));
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const goNext = () => {
    panelX.value = withSpring(-(step + 1) * panelW, { mass: 0.9, stiffness: 180, damping: 20 });
    setStep(s => (s + 1) as Step);
  };
  const goPrev = () => {
    panelX.value = withSpring(-(step - 1) * panelW, { mass: 0.9, stiffness: 180, damping: 20 });
    setStep(s => (s - 1) as Step);
  };

  const toggleFlavor = (f: string) => {
    setFlavors(prev => {
      if (prev.includes(f)) return prev.filter(x => x !== f);
      if (prev.length >= MAX_FLAVORS) {
        haptics.warning();
        showToast({ type: 'info', title: 'Max 6 notes', subtitle: 'Remove one to add another.' });
        return prev;
      }
      return [...prev, f];
    });
  };

  const handleStar = (i: number) => {
    setRating(i + 1);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setScannerVisible(false);
    const { coffee, error } = await lookupBarcode(barcode);
    if (coffee) {
      setSelectedCoffee(coffee);
      showToast({ type: 'success', title: 'Coffee found!', subtitle: coffee.name });
      goNext();
    } else {
      showToast({ type: 'info', title: 'Not in database', subtitle: 'Try searching manually.' });
    }
  };

  const handleSave = async () => {
    if (!user) { showToast({ type: 'error', title: 'Sign in required', subtitle: 'Create an account to save check-ins.' }); return; }
    if (!selectedCoffee) { showToast({ type: 'error', title: 'Select a coffee first' }); return; }
    if (rating === 0) { showToast({ type: 'error', title: 'Add a rating', subtitle: 'Tap the stars to rate.' }); return; }

    btnScale.value = withSequence(withSpring(0.97, SPRING), withSpring(1.0, SPRING));

    const { error } = await submitMutation.mutateAsync({
      coffee_id: selectedCoffee.id,
      cafe_id: selectedCafe?.id ?? null,
      rating,
      notes: note,
      tasting_notes: flavors,
      brew_method: brewMethod || null,
      photo_url: null,
    }).then(() => ({ error: null })).catch((e: any) => ({ error: e }));

    if (error) {
      haptics.error();
      showToast({ type: 'error', title: 'Save failed', subtitle: error.message });
    } else {
      haptics.success();
      setSavedVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        {step > 0 ? (
          <TouchableOpacity onPress={goPrev} style={styles.backBtn} accessibilityRole="button">
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <Text style={styles.navTitle}>New Check-in</Text>
        <View style={styles.backBtn} />
      </View>

      <StepIndicator current={step} />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ flexDirection: 'row', width: '400%', flex: 1 }, panelStyle]}>

          {/* STEP 0 — Coffee */}
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <Text style={styles.stepTitle}>Which coffee?</Text>
            <StepSearchBar placeholder="Search coffee..." value={coffeeSearch} onChange={setCoffeeSearch} />
            <TouchableOpacity
              style={styles.scanRow}
              onPress={() => { haptics.medium(); setScannerVisible(true); }}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode"
            >
              <Text style={{ fontSize: 20 }}>📸</Text>
              <View>
                <Text style={styles.scanName}>Scan Barcode</Text>
                <Text style={styles.scanSub}>Auto-match from our database</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.subLabel}>COFFEES</Text>
            {(coffees ?? []).slice(0, 10).map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.itemRow, selectedCoffee?.id === c.id && styles.itemRowSelected]}
                onPress={() => { setSelectedCoffee(c); goNext(); }}
                accessibilityRole="button"
              >
                <View style={styles.itemThumb}><Text style={{ fontSize: 14 }}>☕</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{c.name}</Text>
                  <Text style={styles.itemSub}>{[c.origin_country, c.process_method].filter(Boolean).join(' · ').toUpperCase()}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* STEP 1 — Café */}
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <Text style={styles.stepTitle}>Where are you?</Text>
            <StepSearchBar placeholder="Search cafés..." value={cafeSearch} onChange={setCafeSearch} />
            <Text style={styles.subLabel}>NEARBY CAFÉS</Text>
            {(cafes ?? []).slice(0, 8).map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.itemRow, selectedCafe?.id === c.id && styles.itemRowSelected]}
                onPress={() => { setSelectedCafe(c); goNext(); }}
                accessibilityRole="button"
              >
                <View style={styles.itemThumb}><Text style={{ fontSize: 14 }}>☕</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{c.name}</Text>
                  <Text style={styles.itemSub}>{c.address ?? 'Specialty Café'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.subLabel}>BREW METHOD</Text>
            <View style={styles.methodRow}>
              {BREW_METHODS.map(m => (
                <TouchableOpacity key={m} onPress={() => setBrewMethod(m)} style={[styles.methodPill, brewMethod === m && styles.methodPillActive]} accessibilityRole="button">
                  <Text style={[styles.methodText, brewMethod === m && styles.methodTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* STEP 2 — Flavors */}
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <Text style={styles.stepTitle}>Tasting notes</Text>
            <Text style={styles.stepSub}>Pick what you taste. Trust your palate.</Text>
            <TastingWheel
              selected={flavors}
              onToggle={(f) => toggleFlavor(f)}
              maxNotes={MAX_FLAVORS}
            />
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* STEP 3 — Rate */}
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            <Text style={styles.stepTitle}>Your verdict</Text>
            {selectedCoffee && <Text style={styles.selectedCoffeeName}>{selectedCoffee.name}</Text>}
            <View style={styles.ratingCard}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                {[0,1,2,3,4].map(i => (
                  <StarButton
                    key={i}
                    index={i}
                    filled={i < rating}
                    onPress={() => handleStar(i)}
                  />
                ))}
                {rating > 0 && <Text style={styles.ratingNum}>{rating}.0</Text>}
              </View>
            </View>
            <Text style={styles.subLabel}>TASTING NOTE</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Jasmine, bergamot, stone fruit..."
              placeholderTextColor={Colors.fog}
              multiline
              value={note}
              onChangeText={setNote}
              accessibilityLabel="Tasting note"
            />
            {flavors.length > 0 && (
              <>
                <Text style={styles.subLabel}>SELECTED NOTES</Text>
                <View style={styles.selectedTags}>
                  {flavors.map(f => (
                    <View key={f} style={styles.selectedTag}><Text style={styles.selectedTagText}>{f}</Text></View>
                  ))}
                </View>
              </>
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>
      </View>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.continueBtn, (step === 2 && flavors.length === 0) && styles.btnDisabled]}
            onPress={goNext}
            disabled={step === 2 && flavors.length === 0}
            accessibilityRole="button"
          >
            <Text style={styles.continueBtnText}>
              {step === 2 ? `Continue with ${flavors.length} notes →` : 'Continue →'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Animated.View style={[{ width: '100%' }, btnStyle]}>
            <TouchableOpacity
              style={[styles.saveBtn, (submitMutation.isPending || rating === 0) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={submitMutation.isPending || rating === 0}
              accessibilityRole="button"
            >
              {submitMutation.isPending
                ? <ActivityIndicator color={Colors.ink} />
                : <Text style={styles.saveBtnText}>Save Check-in ✓</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <SuccessOverlay
        visible={savedVisible}
        coffeeName={selectedCoffee?.name ?? ''}
        onDismiss={() => {
          setSavedVisible(false);
          setStep(0);
          setSelectedCoffee(null);
          setSelectedCafe(null);
          setFlavors([]);
          setRating(0);
          setNote('');
          setBrewMethod('');
          router.replace('/(tabs)' as any);
        }}
      />
    </View>
  );
}

const W500 = 500;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: { width: 60 },
  backText: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.copper },
  navTitle: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 16, color: Colors.cream, textAlign: 'center' },
  panel: { width: '25%' },
  panelContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 40 },
  stepTitle: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 38, lineHeight: 42, color: Colors.cream, marginBottom: Spacing.sm },
  stepSub: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, marginBottom: Spacing.lg },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, marginBottom: Spacing.xl, borderLeftWidth: 3, borderLeftColor: Colors.copper, backgroundColor: Colors.inkSoft, borderRadius: Radius.md },
  scanName: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream, fontWeight: '600' as any },
  scanSub: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, marginTop: 2 },
  subLabel: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 3, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.hairline, minHeight: 60 },
  itemRowSelected: { borderLeftWidth: 2, borderLeftColor: Colors.copper, paddingLeft: Spacing.sm },
  itemThumb: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.roast, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.cream, fontWeight: '600' as any, marginBottom: 2 },
  itemSub: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 1 },
  chevron: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 22, color: Colors.fog, lineHeight: 28 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline },
  methodPillActive: { backgroundColor: Colors.copper, borderColor: Colors.copper },
  methodText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 1 },
  methodTextActive: { color: Colors.ink },
  flavorSection: { marginBottom: Spacing.xl },
  flavorCat: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 3, marginBottom: Spacing.sm },
  flavorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  flavorChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline },
  flavorChipActive: { backgroundColor: Colors.copper, borderColor: Colors.copper },
  flavorChipText: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog },
  flavorChipTextActive: { color: Colors.white, fontWeight: '700' as any },
  selectedCoffeeName: { fontFamily: 'CormorantGaramond-Italic', fontSize: 18, color: Colors.fog, marginBottom: Spacing.lg },
  ratingCard: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Spacing.xl, marginBottom: Spacing.xl },
  ratingNum: { fontFamily: 'CormorantGaramond-SemiBold', fontSize: 48, color: Colors.gold, lineHeight: 52, marginLeft: Spacing.md },
  noteInput: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.hairline, padding: Spacing.base, fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.cream, minHeight: 100, textAlignVertical: 'top', marginBottom: Spacing.xl },
  selectedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  selectedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.roast, borderWidth: 1, borderColor: Colors.amber },
  selectedTagText: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.amber, letterSpacing: 1 },
  bottomBar: { position: 'absolute', bottom: Platform.OS === 'ios' ? 32 : Platform.OS === 'web' ? 86 : 16, left: Spacing.lg, right: Spacing.lg },
  continueBtn: { backgroundColor: Colors.copper, borderRadius: Radius.xl, paddingVertical: Spacing.base, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  continueBtnText: { fontFamily: 'Syne-Regular', fontSize: 15, color: Colors.ink, fontWeight: '700' as any },
  saveBtn: { backgroundColor: Colors.copper, borderRadius: Radius.xl, paddingVertical: Spacing.base, alignItems: 'center', shadowColor: Colors.copper, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  saveBtnText: { fontFamily: 'Syne-Bold', fontSize: 15, color: Colors.ink },
});
