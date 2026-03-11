import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: isDark ? "#030712" : "#f9fafb" },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: isDark ? "#111827" : "#ffffff" },
        headerTintColor: isDark ? "#f9fafb" : "#111827",
        headerTitleStyle: { fontWeight: "600" },
        headerBackButtonDisplayMode: "minimal",
        headerLargeTitleShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="list/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="list-settings/[id]"
        options={{
          title: "List Settings",
        }}
      />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}
