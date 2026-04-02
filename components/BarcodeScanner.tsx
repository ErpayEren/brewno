import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius, SHADOWS } from '../constants/tokens';
import { haptics } from '../hooks/useHaptics';

const { width: W } = Dimensions.get('window');
const FRAME = W * 0.68;

// Lazy-load barcode scanner to avoid web crashes
let BarCodeScanner: any = null;
if (Platform.OS !== 'web') {
  try {
    BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
  } catch {}
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  // Animated scan line
  const lineY = useSharedValue(0);
  useEffect(() => {
    lineY.value = withRepeat(
      withSequence(
        withTiming(FRAME - 4, { duration: 1800 }),
        withTiming(0, { duration: 1800 }),
      ),
      -1,
      false,
    );
  }, []);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lineY.value }] }));

  useEffect(() => {
    if (Platform.OS === 'web' || !BarCodeScanner) {
      setHasPermission(false);
      return;
    }
    BarCodeScanner.requestPermissionsAsync().then(({ status }: any) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    haptics.success();
    onScan(data);
  };

  if (Platform.OS === 'web' || !BarCodeScanner) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.notAvailable}>Camera not available on web.</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.permText}>Requesting camera access...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.permText}>Camera permission denied.</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.topOverlay} />
      <View style={styles.sideRow}>
        <View style={styles.sideOverlay} />
        {/* Scan frame */}
        <View style={styles.frame}>
          {/* Corner marks */}
          {[
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 },
          ].map((pos, i) => (
            <View key={i} style={[styles.corner, pos]} />
          ))}
          {/* Animated scan line */}
          <Animated.View style={[styles.scanLine, lineStyle]} />
        </View>
        <View style={styles.sideOverlay} />
      </View>
      <View style={styles.bottomOverlay}>
        <Text style={styles.hint}>Point at a coffee bag barcode</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
          <Text style={styles.closeBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const SIDE = (W - FRAME) / 2;
const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 200 },
  overlay: { flex: 1, backgroundColor: 'rgba(8,6,4,0.92)', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  topOverlay: { height: '20%', backgroundColor: 'rgba(8,6,4,0.82)' },
  sideRow: { flexDirection: 'row', height: FRAME },
  sideOverlay: { width: SIDE, backgroundColor: 'rgba(8,6,4,0.82)' },
  frame: {
    width: FRAME, height: FRAME,
    borderRadius: Radius.md, overflow: 'hidden',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: Colors.copper, borderWidth: 3,
    borderRadius: 3,
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: Colors.copper,
    shadowColor: Colors.copper, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  bottomOverlay: {
    flex: 1, backgroundColor: 'rgba(8,6,4,0.82)',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  hint: { fontFamily: 'SyneMono-Regular', fontSize: 11, color: Colors.fog, letterSpacing: 2 },
  closeBtn: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.hairline,
  },
  closeBtnText: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.cream },
  permText: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog, textAlign: 'center' },
  notAvailable: { fontFamily: 'Syne-Regular', fontSize: 14, color: Colors.fog },
});
