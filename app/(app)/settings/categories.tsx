import { useCallback } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCategories } from "@/hooks/useCategories";
import { useTheme } from "@/lib/theme-context";

export default function CategoriesSettingsScreen() {
  const { accent, isDark } = useTheme();
  const { allCategories, toggleCategory, isCategoryVisible, reorderCategories, loading } =
    useCategories();

  const chevronColor = isDark ? "#6b7280" : "#9ca3af";
  const accentSurface = isDark ? "#1b2a41" : accent[50];

  const handleMoveCategory = useCallback(
    (index: number, direction: "up" | "down") => {
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === allCategories.length - 1) return;

      const next = [...allCategories];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      reorderCategories(next.map((category) => category.value));
    },
    [allCategories, reorderCategories],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={["bottom"]}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <Text className="text-sm leading-5 text-gray-500 dark:text-gray-400">
          Lists always group by category. Choose what shows and in what order.
        </Text>

        <View className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {allCategories.map((category, index) => {
            const isFirst = index === 0;
            const isLast = index === allCategories.length - 1;
            const isOther = category.value === "other";
            const isVisible = isCategoryVisible(category.value);

            return (
              <View
                key={category.value}
                className={!isLast ? "border-b border-gray-100 dark:border-gray-800" : ""}
              >
                <View className="flex-row items-center px-4 py-4">
                  <View
                    className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: accentSurface }}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={accent[600]}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-50">
                      {category.label}
                    </Text>
                    <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {isOther
                        ? "Always shown as fallback."
                        : isVisible
                          ? "Shown in your list."
                          : "Hidden under Other."}
                    </Text>
                  </View>

                  <View className="mr-3">
                    <Pressable
                      onPress={() => handleMoveCategory(index, "up")}
                      disabled={isFirst || loading}
                      className="items-center py-1"
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={isFirst || loading ? "transparent" : chevronColor}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveCategory(index, "down")}
                      disabled={isLast || loading}
                      className="items-center py-1"
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={isLast || loading ? "transparent" : chevronColor}
                      />
                    </Pressable>
                  </View>

                  <Switch
                    value={isVisible}
                    onValueChange={() => toggleCategory(category.value)}
                    disabled={isOther || loading}
                    trackColor={{
                      false: isDark ? "#374151" : "#e5e7eb",
                      true: accent[600],
                    }}
                    thumbColor={isVisible ? "#f8fafc" : isDark ? "#9ca3af" : "#f9fafb"}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
