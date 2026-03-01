import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  className,
}: EmptyStateProps) {
  const { isDark } = useTheme();
  return (
    <View className={`items-center justify-center pt-24 ${className}`}>
      <Ionicons name={icon} size={64} color={isDark ? "#4b5563" : "#d1d5db"} className="mb-4" />
      <Text className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2 mt-4 text-center">
        {title}
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 text-center px-8">
        {subtitle}
      </Text>
    </View>
  );
}
