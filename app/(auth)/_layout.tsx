import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { ActivityIndicator, View } from "react-native";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    />
  );
}
