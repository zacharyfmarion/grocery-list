import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "react-native";
import { OfflineBanner } from "@/components/OfflineBanner";

export { ErrorBoundary } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemedStatusBar />
        <AuthProvider>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />;
}
