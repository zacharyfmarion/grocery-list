import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
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
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "600" },
        headerBackButtonDisplayMode: "minimal",
        headerLargeTitleShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="list/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
