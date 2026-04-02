import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/tokens';

export default function Index() {
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [initialized, user]);

  return <View style={{ flex: 1, backgroundColor: Colors.ink }} />;
}
