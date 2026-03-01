import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected !== false) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      className="bg-amber-500 dark:bg-amber-600 px-4 py-2 flex-row items-center justify-center"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="white" />
      <Text className="text-white text-sm font-medium ml-2">
        You&apos;re offline. Changes will sync when reconnected.
      </Text>
    </Animated.View>
  );
}
