import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useCategories } from "@/hooks/useCategories";
import { useLists } from "@/hooks/useLists";
import { useTheme } from "@/lib/theme-context";
import * as Haptics from "expo-haptics";

function hasSameOrder<T extends { value: string }>(left: T[], right: T[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.value === right[index]?.value);
}

export default function ListSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accent, isDark } = useTheme();
  const { lists } = useLists();
  const {
    visibleCategories,
    reorderCategoriesForList,
    clearListCategoryOrder,
    hasListOrderOverride,
    loading,
  } = useCategories(id);
  const [orderedCategories, setOrderedCategories] = useState(visibleCategories);

  const list = lists.find((entry) => entry.id === id);
  const mutedColor = isDark ? "#6b7280" : "#9ca3af";
  const accentSurface = isDark ? "#1b2a41" : accent[50];

  useEffect(() => {
    setOrderedCategories((current) =>
      hasSameOrder(current, visibleCategories) ? current : visibleCategories,
    );
  }, [visibleCategories]);

  const handleReorder = useCallback(
    ({ data }: { data: typeof orderedCategories }) => {
      if (!id) return;
      setOrderedCategories(data);
      reorderCategoriesForList(
        id,
        data.map((category) => category.value),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [id, reorderCategoriesForList],
  );

  const handleReset = useCallback(() => {
    if (!id) return;
    clearListCategoryOrder(id);
  }, [clearListCategoryOrder, id]);

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive,
      getIndex,
    }: RenderItemParams<(typeof orderedCategories)[number]>) => {
      const index = getIndex() ?? 0;
      const isFirst = index === 0;
      const isLast = index === orderedCategories.length - 1;

      return (
        <ScaleDecorator activeScale={1.03}>
          <View
            className={`border-x border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${
              isFirst ? "rounded-t-3xl border-t" : ""
            } ${isLast ? "rounded-b-3xl border-b" : "border-b border-gray-100 dark:border-b-gray-800"}`}
          >
            <View className={`flex-row items-center px-4 py-3 ${isActive ? "opacity-95" : ""}`}>
              <Pressable
                onPressIn={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }}
                disabled={loading}
                hitSlop={8}
                className="mr-3"
                accessibilityRole="button"
                accessibilityLabel={`Drag to reorder ${item.label}`}
              >
                <Ionicons name="reorder-three-outline" size={22} color={mutedColor} />
              </Pressable>

              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: accentSurface }}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={accent[600]}
                />
              </View>

              <Text className="flex-1 text-base font-medium text-gray-900 dark:text-gray-50">
                {item.label}
              </Text>
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [accent, accentSurface, loading, mutedColor, orderedCategories.length],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: list?.name ? `${list.name} Settings` : "List Settings",
        }}
      />

      <DraggableFlatList
        data={orderedCategories}
        keyExtractor={(item) => item.value}
        onDragEnd={handleReorder}
        renderItem={renderItem}
        dragItemOverflow
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20 }}
        activationDistance={12}
        ListHeaderComponent={
          <View>
            <Text className="text-sm leading-5 text-gray-500 dark:text-gray-400">
              Adjust how categories are ordered in this list. Hidden categories still come from your
              global settings.
            </Text>
            {hasListOrderOverride ? (
              <Pressable
                onPress={handleReset}
                className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <Text className="text-sm font-semibold" style={{ color: accent[600] }}>
                  Reset to Global Order
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Remove the override for this list and use your default category order again.
                </Text>
              </Pressable>
            ) : (
              <View className="mt-4 rounded-2xl border border-dashed border-gray-200 px-4 py-4 dark:border-gray-800">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  Using global category order
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Dragging here creates a list-specific override.
                </Text>
              </View>
            )}
            <View className="mt-4" />
          </View>
        }
      />
    </SafeAreaView>
  );
}
