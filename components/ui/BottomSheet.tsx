import { View, Text, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  className,
}: BottomSheetProps) {
  const { isDark } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={onClose}
        >
          <Pressable
            className={`bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10 max-h-[85%] ${className || ''}`}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-50">
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                className="p-2"
                accessibilityLabel="Close"
                accessibilityRole="button"
                testID="bottom-sheet-close"
              >
                <Ionicons name="close" size={24} color={isDark ? "#6b7280" : "#9ca3af"} />
              </Pressable>
            </View>
            {subtitle && (
              <Text className="text-gray-500 dark:text-gray-400 mb-4">
                {subtitle}
              </Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-shrink">
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
