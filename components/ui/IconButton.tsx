import { TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface IconButtonProps extends TouchableOpacityProps {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

export function IconButton({
  icon,
  size = 24,
  color,
  className,
  style,
  ...props
}: IconButtonProps) {
  const { isDark } = useTheme();
  const resolvedColor = color ?? (isDark ? "#9ca3af" : "#4b5563");
  return (
    <TouchableOpacity
      className={`p-2 items-center justify-center ${className}`}
      style={style}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={icon} size={size} color={resolvedColor} />
    </TouchableOpacity>
  );
}
