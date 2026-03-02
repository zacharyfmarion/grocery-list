import { View, Text, TextInput, type TextInputProps } from "react-native";
import { useTheme } from "@/lib/theme-context";

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AppTextInput({
  label,
  error,
  className,
  style,
  ...props
}: AppTextInputProps) {
  const { isDark } = useTheme();
  return (
    <View className={className}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={`border rounded-xl px-4 text-base text-gray-900 dark:text-gray-50 bg-gray-50 dark:bg-gray-950 ${
          error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"
        } ${props.multiline ? "py-3" : ""}`}
        style={[{ lineHeight: 20, ...(!props.multiline ? { height: 48, textAlignVertical: "center" as const } : {}) }, style]}
        placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
        {...props}
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1.5">{error}</Text>
      )}
    </View>
  );
}
