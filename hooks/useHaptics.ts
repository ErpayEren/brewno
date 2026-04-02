import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Graceful no-op on web/unsupported platforms
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const haptics = {
  // Light tap — chip select, toggle, nav
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // Medium — button press, card tap
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // Heavy — like, save, destructive
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  // Success — check-in saved, badge earned
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  // Error — validation fail
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  // Warning — max flavors reached
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  // Selection — star rating, filter chip
  selection: () => safe(() => Haptics.selectionAsync()),
};
