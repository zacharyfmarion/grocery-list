import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View className="flex-1 items-center justify-center bg-white p-5">
        <Text className="text-xl font-bold text-gray-900 mb-4">
          Page not found
        </Text>
        <Link href="/" className="text-primary-600 font-semibold">
          Go home
        </Link>
      </View>
    </>
  );
}
