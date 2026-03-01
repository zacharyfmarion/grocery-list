import {
  Text,
  ViewStyle,
  TouchableOpacity,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { useTheme } from "@/lib/theme-context";

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function AppButton({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className,
  ...props
}: AppButtonProps) {
  const { accent, isDark } = useTheme();
  const isDisabled = disabled || loading;

  let bgClass = "";
  let textClass = "text-white";

  if (variant === "primary") {
    bgClass = ""; // Handled by inline style for dynamic accent
    textClass = "text-white";
  } else if (variant === "secondary") {
    bgClass = "bg-gray-200 dark:bg-gray-700";
    textClass = "text-gray-900 dark:text-gray-100";
  } else if (variant === "danger") {
    bgClass = "bg-red-500 dark:bg-red-600";
    textClass = "text-white";
  }

  // Override text color if secondary and disabled
  if (isDisabled && variant === "secondary") {
    textClass = "text-gray-400 dark:text-gray-500";
  }

  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`rounded-xl py-3.5 items-center justify-center ${bgClass} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
      style={[
        variant === "primary" && { backgroundColor: accent[600] },
        props.style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary"
              ? isDark
                ? "#d1d5db"
                : "#374151"
              : "#fff"
          }
        />
      ) : (
        <Text className={`text-base font-semibold ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
