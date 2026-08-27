import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SpatialNavigationDeviceTypeProvider, SpatialNavigationRoot } from 'react-tv-space-navigation';

import SplashScreen from '@/components/SplashScreen';
import { LanguageProvider } from '@/contexts/language-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { ThemeProvider, useAppTheme } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ProvidersProvider } from '@/hooks/use-providers';
import { configureTVRemoteControl } from '@/lib/tv-remote-config';

const isTV = Platform.isTV;
const isWebTV = isTV && Platform.OS === 'web';
// configureTVRemoteControl is a no-op on native TV; only active on web TV.
if (isWebTV) configureTVRemoteControl();

// ─── Inner Layout (needs Providers above it) ──────────────────────────────────
function RootLayoutContent() {
  const { resolved } = useAppTheme();
  const { isLoading: authLoading } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);

  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../assets/fonts/NotoKufiArabic-Regular.ttf'),
    'Tajawal-Medium': require('../assets/fonts/NotoKufiArabic-Medium.ttf'),
    'Tajawal-Bold': require('../assets/fonts/NotoKufiArabic-Bold.ttf'),
    'Tajawal-ExtraBold': require('../assets/fonts/NotoKufiArabic-ExtraBold.ttf'),
    'Tajawal-Black': require('../assets/fonts/NotoKufiArabic-Black.ttf'),
    'Tajawal-Light': require('../assets/fonts/NotoKufiArabic-Light.ttf'),
    'Tajawal-ExtraLight': require('../assets/fonts/NotoKufiArabic-ExtraLight.ttf'),
  });

  if (!fontsLoaded || authLoading || !splashComplete) {
    return (
      <SplashScreen onFinish={() => setSplashComplete(true)} />
    );
  }

  const stackContent = (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} initialRouteName='index'>
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add-provider" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="dashboard" options={{ gestureEnabled: false }} />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="watchlater" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    </>
  );

  return (
    <NavThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      {isWebTV ? (
        // Web TV: SpatialNavigation handles keyboard/remote navigation
        <SpatialNavigationDeviceTypeProvider>
          <SpatialNavigationRoot>
            {stackContent}
          </SpatialNavigationRoot>
        </SpatialNavigationDeviceTypeProvider>
      ) : stackContent}
    </NavThemeProvider>
  );
}

// ─── Root — Providers first ───────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProvidersProvider>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <SettingsProvider>
                <RootLayoutContent />
              </SettingsProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </ProvidersProvider>
    </GestureHandlerRootView>
  );
}
