import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../constants/tokens';
import { useAuthStore } from '../stores/authStore';
import { ToastContainer } from '../components/Toast';

import {
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Syne_400Regular,
  Syne_700Bold,
  Syne_600SemiBold,
} from '@expo-google-fonts/syne';
import { SyneMono_400Regular } from '@expo-google-fonts/syne-mono';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'CormorantGaramond-LightItalic': CormorantGaramond_300Light_Italic,
    'CormorantGaramond-SemiBold':    CormorantGaramond_600SemiBold,
    'CormorantGaramond-Italic':      CormorantGaramond_500Medium_Italic,
    'Syne-Regular':                  Syne_400Regular,
    'Syne-Bold':                     Syne_700Bold,
    'Syne-SemiBold':                 Syne_600SemiBold,
    'SyneMono-Regular':              SyneMono_400Regular,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.ink }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppInitializer>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.ink } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="coffee/[id]" />
            <Stack.Screen name="brew/[method]" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="taste-quiz" />
          </Stack>
          {/* Global Toast Overlay */}
          <ToastContainer />
        </AppInitializer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
