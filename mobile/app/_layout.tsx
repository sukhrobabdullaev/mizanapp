import { Ionicons } from '@expo/vector-icons';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/hooks/useAuth';
import { flush } from '../src/lib/offlineQueue';
import { persister, queryClient } from '../src/lib/queryClient';
import { useTheme } from '../src/theme/useTheme';

// Icon glyphs render blank if the first paint happens before Ionicons.ttf is
// registered, and they do not re-render once it lands. Hold the splash until
// the font is ready.
void SplashScreen.preventAutoHideAsync();

/** Replays queued offline mutations whenever the app comes to the foreground. */
function useOfflineReplay(): void {
  useEffect(() => {
    const replay = () => {
      void flush().then((result) => {
        if (result.sent > 0) void queryClient.invalidateQueries();
      });
    };
    replay();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') replay();
    });
    return () => subscription.remove();
  }, []);
}

function RootStack() {
  const { isDark, palette } = useTheme();
  useOfflineReplay();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="goal/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="muhosaba/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="muhosaba/natija" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Render nothing rather than a half-painted UI; a font failure still lets the
  // app through, just without glyphs.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
        >
          <AuthProvider>
            <RootStack />
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
