import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Platform, Dimensions, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withDelay, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, SPRING, HERO_GRADIENTS } from '../../constants/tokens';

const { width: W } = Dimensions.get('window');

const CAFES = [
  { id:'1', name:'Petra Roasting', distance:'180m', open:true, score:4.8, lat:41.06, lng:29.01 },
  { id:'2', name:'Café Moda',      distance:'340m', open:true, score:4.6, lat:41.055, lng:29.015 },
  { id:'3', name:'Norm Coffee',    distance:'510m', open:true, score:4.5, lat:41.065, lng:29.02 },
];

const MAP_STYLE = [
  { elementType:'geometry', stylers:[{ color:'#1a1208' }] },
  { elementType:'labels.text.fill', stylers:[{ color:'#8a7260' }] },
  { elementType:'labels.text.stroke', stylers:[{ color:'#0e0c0b' }] },
  { featureType:'road', elementType:'geometry', stylers:[{ color:'#2b1d14' }] },
  { featureType:'road.arterial', elementType:'geometry', stylers:[{ color:'#3d2518' }] },
  { featureType:'water', elementType:'geometry', stylers:[{ color:'#0d1520' }] },
  { featureType:'poi', stylers:[{ visibility:'off' }] },
  { featureType:'transit', stylers:[{ visibility:'off' }] },
  { featureType:'administrative', elementType:'geometry', stylers:[{ color:'#3d2518' }] },
];

// ─── Native Map (lazy loaded for web safety) ──────────────────────────────────
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

// ─── Web Fallback Map ──────────────────────────────────────────────────────────
function WebMapFallback() {
  return (
    <View style={wm.container}>
      <Text style={wm.emoji}>🗺️</Text>
      <Text style={wm.title}>Map View</Text>
      <Text style={wm.sub}>Interactive map available on the mobile app.{'\n'}Specialty cafés nearby are listed below.</Text>
    </View>
  );
}
const wm = StyleSheet.create({
  container: { flex: 1, alignItems:'center', justifyContent:'center', backgroundColor: Colors.roast },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  title: { ...Typography.h1, color: Colors.cream, marginBottom: Spacing.sm },
  sub: { ...Typography.body, color: Colors.fog, textAlign:'center', lineHeight: 22 },
});

// ─── Custom Marker ─────────────────────────────────────────────────────────────
function CaféPin({ selected }: { selected: boolean }) {
  const scale = useSharedValue(selected ? 1.15 : 1);
  useEffect(() => {
    scale.value = withSpring(selected ? 1.15 : 1, SPRING);
  }, [selected]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[pin.wrap, selected && pin.wrapSelected, s]}>
      <Text style={pin.emoji}>☕</Text>
    </Animated.View>
  );
}
const pin = StyleSheet.create({
  wrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.roast, borderWidth: 2, borderColor: Colors.copper, alignItems:'center', justifyContent:'center' },
  wrapSelected: { backgroundColor: Colors.copper, borderColor: Colors.white },
  emoji: { fontSize: 16 },
});

// ─── Café Row ──────────────────────────────────────────────────────────────────
function CaféRow({ item, last, onPress }: { item: typeof CAFES[0]; last: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={s}>
      <TouchableOpacity
        style={[cr.row, !last && cr.border]}
        onPressIn={() => { scale.value = withSpring(0.98, SPRING); }}
        onPressOut={() => { scale.value = withSpring(1.0, SPRING); }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.name}`}
      >
        <View style={cr.dot} />
        <View style={{ flex: 1 }}>
          <Text style={cr.name}>{item.name}</Text>
          <Text style={cr.meta}>
            {item.distance} · <Text style={{ color: item.open ? Colors.amber : Colors.fog }}>{item.open ? 'Open' : 'Closed'}</Text>
          </Text>
        </View>
        <Text style={cr.score}>{item.score.toFixed(1)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cr = StyleSheet.create({
  row: { flexDirection:'row', alignItems:'center', paddingVertical: Spacing.md, minHeight: 56, gap: Spacing.md },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.copper },
  name: { ...Typography.body, color: Colors.cream, fontWeight:'700' as any, marginBottom: 2 },
  meta: { ...Typography.labelSm, color: Colors.fog },
  score: { fontFamily:'CormorantGaramond-SemiBold', fontSize: 24, color: Colors.gold, lineHeight: 28 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [selectedCafe, setSelectedCafe] = useState<string | null>('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const mapRef = useRef<any>(null);

  const drawerOpacity = useSharedValue(0);
  const drawerY = useSharedValue(60);

  useEffect(() => {
    drawerOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    drawerY.value = withDelay(300, withSpring(0, SPRING));
  }, []);

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: drawerOpacity.value,
    transform: [{ translateY: drawerY.value }],
  }));

  const handleCafeSelect = (cafe: typeof CAFES[0]) => {
    setSelectedCafe(cafe.id);
    if (mapRef.current && Platform.OS !== 'web') {
      mapRef.current.animateToRegion({ latitude: cafe.lat, longitude: cafe.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
    }
  };

  // ─── Web Layout ──────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    const filtered = searchQuery.trim()
      ? CAFES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : CAFES;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: Colors.ink }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Page header */}
        <Animated.View entering={FadeIn.duration(500)} style={webStyles.header}>
          <Text style={webStyles.eyebrow}>SPECIALTY CAFÉS</Text>
          <Text style={webStyles.title}>Nearby</Text>
          <Text style={webStyles.subtitle}>Discover specialty coffee shops around you.</Text>
        </Animated.View>

        {/* Search bar */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={webStyles.searchWrap}>
          <View style={[webStyles.searchBar, { borderColor: searchFocused ? Colors.copper : Colors.hairline, borderWidth: searchFocused ? 1.5 : 1 }]}>
            <Text style={{ color: Colors.copper, fontSize: 15 }}>⊙</Text>
            <TextInput
              style={webStyles.searchInput}
              placeholder="Search specialty cafés..."
              placeholderTextColor={Colors.fog}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              accessibilityLabel="Search cafés"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Text style={{ color: Colors.fog, fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Map placeholder card */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={webStyles.mapPlaceholder}>
          <Text style={webStyles.mapEmoji}>🗺️</Text>
          <Text style={webStyles.mapTitle}>Interactive Map</Text>
          <Text style={webStyles.mapSub}>Full interactive map is available on the mobile app.{'\n'}Specialty cafés nearby are listed below.</Text>
        </Animated.View>

        {/* Section label */}
        <Text style={webStyles.sectionLabel}>{filtered.length} SPECIALTY CAFÉS NEARBY</Text>

        {/* Café list */}
        <View style={webStyles.listWrap}>
          {filtered.length === 0 ? (
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.fog, letterSpacing: 1 }}>No cafés match your search.</Text>
            </View>
          ) : (
            filtered.map((cafe, i) => (
              <Animated.View key={cafe.id} entering={FadeInDown.delay(160 + i * 60).duration(400)}>
                <CaféRow
                  item={cafe}
                  last={i === filtered.length - 1}
                  onPress={() => handleCafeSelect(cafe)}
                />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // ─── Native Layout ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Map */}
      {MapView ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ latitude: 41.06, longitude: 29.01, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          userInterfaceStyle="dark"
          customMapStyle={MAP_STYLE}
          showsUserLocation
          userLocationAnnotationTitle=""
        >
          {CAFES.map(cafe => (
            <Marker
              key={cafe.id}
              coordinate={{ latitude: cafe.lat, longitude: cafe.lng }}
              onPress={() => handleCafeSelect(cafe)}
            >
              <CaféPin selected={selectedCafe === cafe.id} />
            </Marker>
          ))}
        </MapView>
      ) : (
        <WebMapFallback />
      )}

      {/* Floating Search */}
      <View style={styles.searchFloat}>
        <View style={[styles.searchBar, { borderColor: searchFocused ? Colors.copper : Colors.hairline, borderWidth: searchFocused ? 1.5 : 1 }]}>
          <Text style={{ color: Colors.copper }}>⊙</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialty cafés..."
            placeholderTextColor={Colors.fog}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            accessibilityLabel="Search cafés"
          />
        </View>
      </View>

      {/* Bottom Drawer */}
      <Animated.View style={[styles.drawer, drawerStyle]}>
        <View style={styles.handle} />
        <Text style={styles.drawerLabel}>{CAFES.length} SPECIALTY CAFÉS NEARBY</Text>
        {CAFES.map((cafe, i) => (
          <CaféRow
            key={cafe.id}
            item={cafe}
            last={i === CAFES.length - 1}
            onPress={() => handleCafeSelect(cafe)}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  header: {
    paddingTop: 44,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  eyebrow: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.copper, letterSpacing: 3, marginBottom: Spacing.sm },
  title: { fontFamily: 'CormorantGaramond-LightItalic', fontSize: 48, lineHeight: 52, color: Colors.cream, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'Syne-Regular', fontSize: 13, color: Colors.fog, lineHeight: 18 },
  searchWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.roast, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.cream, lineHeight: 18 },
  mapPlaceholder: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xl,
    backgroundColor: Colors.roast, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.hairline,
    paddingVertical: Spacing.xxl, alignItems: 'center',
  },
  mapEmoji: { fontSize: 52, marginBottom: Spacing.md },
  mapTitle: { fontFamily: 'CormorantGaramond-Italic', fontSize: 24, color: Colors.cream, lineHeight: 28, marginBottom: Spacing.sm },
  mapSub: { fontFamily: 'Syne-Regular', fontSize: 12, color: Colors.fog, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.xl },
  sectionLabel: { fontFamily: 'SyneMono-Regular', fontSize: 9, color: Colors.fog, letterSpacing: 3, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  listWrap: {
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(14,12,11,0.95)',
    borderRadius: Radius.xl, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.hairline,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ink },
  searchFloat: { position:'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: Spacing.base, right: Spacing.base },
  searchBar: { flexDirection:'row', alignItems:'center', gap: Spacing.sm, backgroundColor: Platform.OS === 'ios' ? Colors.glass : 'rgba(14,12,11,0.92)', borderRadius: Radius.lg, paddingHorizontal: Spacing.base, paddingVertical: 10 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.cream },
  drawer: {
    position:'absolute', bottom: Platform.OS === 'ios' ? 88 : 72,
    left: Spacing.base, right: Spacing.base,
    backgroundColor: 'rgba(14,12,11,0.95)',
    borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.hairline,
    shadowColor: '#000', shadowOffset:{ width:0, height:-4 }, shadowOpacity:0.5, shadowRadius:20, elevation:20,
  },
  handle: { width: 32, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, alignSelf:'center', marginBottom: Spacing.lg },
  drawerLabel: { ...Typography.labelSm, color: Colors.fog, letterSpacing: 3, marginBottom: Spacing.md },
});
