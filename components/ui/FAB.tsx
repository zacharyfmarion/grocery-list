import { TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface FABProps extends TouchableOpacityProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}

export function FAB({
  icon = "add",
  onPress,
  testID,
  className,
  style,
  ...props
}: FABProps) {
  const { accent } = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      className={`absolute bottom-8 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg dark:shadow-gray-900 ${className}`}
      activeOpacity={0.8}
      style={[{ backgroundColor: accent[600] }, style]}
      {...props}
    >
      <Ionicons name={icon} size={32} color="white" />
    </TouchableOpacity>
  );
}
