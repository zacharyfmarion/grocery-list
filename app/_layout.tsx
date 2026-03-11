import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "react-native";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppToaster } from "@/lib/toast";
import {
  ThemeProvider as NavThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";

export { ErrorBoundary } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      <RootContent />
    </ThemeProvider>
  );
}

function RootContent() {
  const { isDark } = useTheme();
  const backgroundColor = isDark ? "#111827" : "#ffffff";

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [backgroundColor]);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: backgroundColor } }
    : DefaultTheme;

  return (
    <NavThemeProvider value={navTheme}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? "#111827" : "#ffffff" }}>
        <ThemedStatusBar />
        <KeyboardProvider>
          <AuthProvider>
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
            <AppToaster />
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </NavThemeProvider>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />;
}
