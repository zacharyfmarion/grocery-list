import { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SectionList,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Swipeable, Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useItems } from "@/hooks/useItems";
import { useLists } from "@/hooks/useLists";
import { useItemHistory } from "@/hooks/useItemHistory";
import { GroceryCategory, GroceryItem, UserProfile } from "@/types";
import {
  parseItemInput,
  formatQuantityUnit,
  UNITS,
  CATEGORIES,
  suggestCategory,
} from "@/lib/constants";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { AppButton } from "@/components/ui/AppButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";

const ITEM_HEIGHT = 72;

type ListSection = {
  title: string;
  category?: GroceryCategory;
  data: GroceryItem[];
  isCompleted?: boolean;
};

type ListItemRowProps = {
  item: GroceryItem;
  section: ListSection;
  reorderMode: boolean;
  userId?: string;
  memberProfiles: Record<string, UserProfile | null>;
  onToggle: (item: GroceryItem) => void;
  onDelete: (item: GroceryItem) => void;
  onEdit: (item: GroceryItem) => void;
  onQuickAdd: (item: GroceryItem) => void;
  onReorder: (sectionTitle: string, itemId: string, offset: number) => void;
};

const getInitials = (name?: string, email?: string) => {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const buildSuggestionText = (item: {
  name: string;
  quantity: number;
  unit?: string;
}) => {
  if (item.unit) {
    const unitLabel = UNITS.find((u) => u.value === item.unit)?.label ?? item.unit;
    return `${item.quantity} ${unitLabel} ${item.name}`.trim();
  }
  if (item.quantity && item.quantity !== 1) {
    return `${item.quantity} ${item.name}`.trim();
  }
  return item.name;
};

const formatQuantityDisplay = (item: GroceryItem) => {
  const base = formatQuantityUnit(item.quantity, item.unit);
  if (!item.unit) return base;
  return base.replace(`${item.quantity} `, `${item.quantity} × `);
};

const ListItemRow = ({
  item,
  section,
  reorderMode,
  userId,
  memberProfiles,
  onToggle,
  onDelete,
  onEdit,
  onQuickAdd,
  onReorder,
}: ListItemRowProps) => {
  const addedBy =
    item.addedBy === userId
      ? "You"
      : memberProfiles[item.addedBy]?.displayName ||
        memberProfiles[item.addedBy]?.email ||
        "Member";

  const row = (
    <Animated.View
      entering={FadeIn.duration(200)}
      layout={Layout.springify().damping(15)}
      className={`bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-2 shadow-sm min-h-[72px] ${
        item.checked ? "opacity-60" : ""
      }`}
    >
      <View className="flex-row items-center">
        {reorderMode && !section.isCompleted ? (
          <View className="mr-3">
            <Ionicons name="reorder-two" size={22} color="#9ca3af" />
          </View>
        ) : (
          <TouchableOpacity
            testID={`item-checkbox-${item.id}`}
            onPress={() => onToggle(item)}
            className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
              item.checked
                ? "bg-primary-600 border-primary-600"
                : "border-gray-300"
            }`}
          >
            {item.checked && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onEdit(item)}
          className="flex-1"
          activeOpacity={0.7}
        >
          <Text
            className={`text-base font-semibold ${
              item.checked ? "text-gray-400 line-through" : "text-gray-900"
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
            {formatQuantityDisplay(item)} · Added by {addedBy}
          </Text>
          {item.note ? (
            <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </TouchableOpacity>

        {!reorderMode && (
          <TouchableOpacity
            onPress={() => onQuickAdd(item)}
            className="ml-3 w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="add" size={16} color="#4b5563" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  if (reorderMode && !section.isCompleted) {
    const translateY = useSharedValue(0);
    const dragging = useSharedValue(false);
    const pan = Gesture.Pan()
      .onBegin(() => {
        dragging.value = true;
      })
      .onUpdate((event) => {
        translateY.value = event.translationY;
      })
      .onEnd(() => {
        const offset = Math.round(translateY.value / ITEM_HEIGHT);
        runOnJS(onReorder)(section.title, item.id, offset);
        translateY.value = withSpring(0);
        dragging.value = false;
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
      zIndex: dragging.value ? 10 : 1,
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>{row}</Animated.View>
      </GestureDetector>
    );
  }

  return (
    <Swipeable
      renderLeftActions={() => (
        <View className="flex-1 justify-center">
          <TouchableOpacity
            onPress={() => onToggle(item)}
            className="bg-emerald-500 rounded-2xl mx-1 px-5 py-4"
          >
            <Text className="text-white font-semibold">
              {item.checked ? "Restore" : "Done"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      renderRightActions={() => (
        <View className="flex-1 justify-center items-end">
          <TouchableOpacity
            onPress={() => onDelete(item)}
            className="bg-red-500 rounded-2xl mx-1 px-5 py-4"
          >
            <Text className="text-white font-semibold">Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === "right") {
          onToggle(item);
        }
        if (direction === "left") {
          onDelete(item);
        }
      }}
    >
      {row}
    </Swipeable>
  );
};

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    items,
    loading,
    addItem,
    toggleItem,
    updateQuantity,
    updateItem,
    deleteItem,
    reorderItems,
    uncheckedCount,
    totalCount,
  } = useItems(id);
  const { lists, shareList, renameList } = useLists();
  const { getSuggestions, recordItemUsage } = useItemHistory();
  const list = lists.find((l) => l.id === id);

  const [newItemName, setNewItemName] = useState("");
  const [adding, setAdding] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedSections, setOrderedSections] = useState<ListSection[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, UserProfile | null>
  >({});

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(list?.name ?? "");

  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState<string | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<GroceryCategory | undefined>(
    undefined
  );
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setNameDraft(list?.name ?? "");
  }, [list?.name]);

  const memberUids = useMemo(() => {
    if (!list) return [];
    return Array.from(new Set([list.ownerUid, ...list.sharedWith]));
  }, [list?.ownerUid, list?.sharedWith]);

  useEffect(() => {
    if (!memberUids.length) {
      setMemberProfiles({});
      return;
    }

    let active = true;
    const loadProfiles = async () => {
      const entries = await Promise.all(
        memberUids.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          return {
            uid,
            profile: snap.exists() ? (snap.data() as UserProfile) : null,
          };
        })
      );
      if (!active) return;
      const next: Record<string, UserProfile | null> = {};
      entries.forEach(({ uid, profile }) => {
        next[uid] = profile;
      });
      setMemberProfiles(next);
    };

    loadProfiles();
    return () => {
      active = false;
    };
  }, [memberUids]);

  useEffect(() => {
    if (editingItem) {
      setEditName(editingItem.name);
      setEditQuantity(String(editingItem.quantity ?? 1));
      setEditUnit(editingItem.unit);
      setEditCategory(editingItem.category ?? suggestCategory(editingItem.name));
      setEditNote(editingItem.note ?? "");
    }
  }, [editingItem]);

  const uncheckedItems = useMemo(
    () => items.filter((item) => !item.checked),
    [items]
  );
  const checkedItems = useMemo(
    () => items.filter((item) => item.checked),
    [items]
  );

  const sortItems = useCallback((listItems: GroceryItem[]) => {
    return [...listItems].sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.createdAt?.toMillis?.() ?? 0;
      const timeB = b.createdAt?.toMillis?.() ?? 0;
      return timeA - timeB;
    });
  }, []);

  const sectionData = useMemo<ListSection[]>(() => {
    const sections: ListSection[] = [];
    CATEGORIES.forEach((category) => {
      const data = uncheckedItems.filter(
        (item) => (item.category ?? "other") === category.value
      );
      if (data.length) {
        sections.push({
          title: category.label,
          category: category.value,
          data: sortItems(data),
        });
      }
    });

    if (showCompleted && checkedItems.length) {
      sections.push({
        title: "Completed",
        data: sortItems(checkedItems),
        isCompleted: true,
      });
    }

    return sections;
  }, [checkedItems, showCompleted, sortItems, uncheckedItems]);

  useEffect(() => {
    if (reorderMode) {
      setOrderedSections(sectionData);
    }
  }, [reorderMode, sectionData]);

  const displaySections = reorderMode ? orderedSections : sectionData;

  const suggestions = useMemo(
    () => getSuggestions(newItemName),
    [getSuggestions, newItemName]
  );
  const showSuggestions = inputFocused && suggestions.length > 0;


  const handleAddItem = async () => {
    const parsed = parseItemInput(newItemName);
    const name = parsed.name.trim();
    if (!name) return;

    setAdding(true);
    try {
      const quantity = parsed.quantity || 1;
      const category = suggestCategory(name);
      await addItem({ name, quantity, unit: parsed.unit, category });
      await recordItemUsage({ name, quantity, unit: parsed.unit, category });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNewItemName("");
    } catch {
      Alert.alert("Error", "Failed to add item");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: GroceryItem) => {
    try {
      await toggleItem(item.id, item.checked);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to toggle item:", error);
    }
  };

  const handleDelete = (item: GroceryItem) => {
    Alert.alert("Delete Item", `Remove "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteItem(item.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const handleQuantityChange = async (item: GroceryItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    try {
      await updateQuantity(item.id, newQty);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) return;

    setSharing(true);
    try {
      await shareList(id, shareEmail.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "List shared successfully!");
      setShareEmail("");
      setShowShare(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not share list";
      Alert.alert("Share Failed", message);
    } finally {
      setSharing(false);
    }
  };

  const handleRename = async () => {
    if (!list) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setIsRenaming(false);
      setNameDraft(list.name);
      return;
    }
    if (trimmed === list.name) {
      setIsRenaming(false);
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await renameList(list.id, trimmed);
    } catch {
      Alert.alert("Rename Failed", "Could not rename the list");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!list) return;
    if (uid === list.ownerUid) return;
    Alert.alert("Remove Member", "Remove this member from the list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const newSharedWith = list.sharedWith.filter((member) => member !== uid);
            const newMembers = [list.ownerUid, ...newSharedWith];
            await updateDoc(doc(db, "lists", list.id), {
              sharedWith: newSharedWith,
              members: newMembers,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to remove member");
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Item name cannot be empty.");
      return;
    }
    const quantity = Number(editQuantity) || 1;
    if (quantity <= 0) {
      Alert.alert("Invalid quantity", "Quantity must be greater than 0.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateItem(editingItem.id, {
        name: trimmed,
        quantity,
        unit: editUnit ?? null,
        category: editCategory ?? suggestCategory(trimmed),
        note: editNote.trim() ? editNote.trim() : null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingItem(null);
    } catch {
      Alert.alert("Error", "Failed to update item");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReorder = useCallback(
    (sectionTitle: string, itemId: string, offset: number) => {
      if (!offset) return;
      setOrderedSections((prev) => {
        const next = prev.map((section) => ({ ...section, data: [...section.data] }));
        const sectionIndex = next.findIndex((section) => section.title === sectionTitle);
        if (sectionIndex === -1) return prev;
        const targetSection = next[sectionIndex];
        const currentIndex = targetSection.data.findIndex((item) => item.id === itemId);
        if (currentIndex === -1) return prev;
        const newIndex = Math.max(
          0,
          Math.min(targetSection.data.length - 1, currentIndex + offset)
        );
        if (currentIndex === newIndex) return prev;
        const [moved] = targetSection.data.splice(currentIndex, 1);
        targetSection.data.splice(newIndex, 0, moved);

        const reorderedUnchecked = next
          .filter((section) => !section.isCompleted)
          .flatMap((section) => section.data);
        const reordered = [...reorderedUnchecked, ...checkedItems];
        reorderItems(reordered).catch(() => {
          Alert.alert("Reorder failed", "Could not update item order.");
        });

        return next;
      });
    },
    [checkedItems, reorderItems]
  );

  const renderItem = ({ item, section }: { item: GroceryItem; section: ListSection }) => (
    <ListItemRow
      item={item}
      section={section}
      reorderMode={reorderMode}
      userId={user?.uid}
      memberProfiles={memberProfiles}
      onToggle={handleToggle}
      onDelete={handleDelete}
      onEdit={setEditingItem}
      onQuickAdd={(target) => handleQuantityChange(target, 1)}
      onReorder={handleReorder}
    />
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
      <View className="bg-white px-2 py-2 border-b border-gray-100 z-10">
        <View className="flex-row items-center justify-between min-h-[44px]">
          {/* Left: Back */}
          <View className="flex-none w-[20%] items-start">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100 -ml-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {/* Center: Title & Members */}
          <View className="flex-1 items-center justify-center mx-2 max-w-[60%]">
            {isRenaming ? (
              <View className="flex-row items-center bg-gray-100 rounded-lg overflow-hidden w-full">
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  className="flex-1 py-1.5 px-3 text-sm font-semibold text-gray-900 text-center"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRename}
                  placeholder="List Name"
                  clearButtonMode="while-editing"
                  selectTextOnFocus
                />
                <View className="flex-row border-l border-gray-200">
                  <TouchableOpacity onPress={handleRename} className="p-2 active:bg-emerald-50">
                    <Ionicons name="checkmark" size={16} color="#16a34a" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsRenaming(false);
                      setNameDraft(list?.name ?? "");
                    }}
                    className="p-2 active:bg-gray-200"
                  >
                    <Ionicons name="close" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsRenaming(true)}
                className="items-center justify-center w-full py-1"
                activeOpacity={0.6}
              >
                <Text className="text-lg font-bold text-gray-900 text-center leading-tight" numberOfLines={1}>
                  {list?.name || "List"}
                </Text>

                {memberUids.length > 0 && (
                  <View className="flex-row items-center justify-center mt-0.5 opacity-80 gap-1">
                    <View className="flex-row items-center">
                      {memberUids.slice(0, 3).map((uid, index) => {
                        const profile = memberProfiles[uid];
                        return (
                          <View
                            key={uid}
                            className={`w-4 h-4 rounded-full items-center justify-center border border-white -ml-1 ${
                              uid === list?.ownerUid ? "bg-emerald-100" : "bg-gray-100"
                            } ${index === 0 ? "ml-0" : ""}`}
                          >
                            <Text
                              className={`text-[9px] font-bold ${
                                uid === list?.ownerUid ? "text-emerald-700" : "text-gray-600"
                              }`}
                            >
                              {getInitials(profile?.displayName, profile?.email).charAt(0)}
                            </Text>
                          </View>
                        );
                      })}
                      {memberUids.length > 3 && (
                        <View className="w-4 h-4 rounded-full bg-gray-100 items-center justify-center border border-white -ml-1">
                          <Text className="text-[8px] font-bold text-gray-600">
                            +{memberUids.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[10px] font-medium text-gray-500">
                      {memberUids.length} {memberUids.length === 1 ? "member" : "members"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Right: Actions */}
          <View className="flex-none w-[20%] flex-row items-center justify-end gap-0.5">
            {!isRenaming && (
              <>
                <IconButton
                  icon={showCompleted ? "eye" : "eye-off"}
                  onPress={() => setShowCompleted((prev) => !prev)}
                  color={showCompleted ? "#4b5563" : "#9ca3af"}
                  size={20}
                  className="p-1.5"
                />
                <IconButton
                  icon="reorder-three"
                  onPress={() => setReorderMode((prev) => !prev)}
                  color={reorderMode ? "#16a34a" : "#4b5563"}
                  size={22}
                  className="p-1.5"
                />
                <IconButton
                  icon="share-outline"
                  onPress={() => setShowShare(true)}
                  color="#4b5563"
                  size={20}
                  className="p-1.5"
                />
              </>
            )}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-gray-50"
        keyboardVerticalOffset={0}
      >
        {totalCount > 0 && (
          <View className="px-4 py-2">
            <Text className="text-sm text-gray-400">
              {uncheckedCount} of {totalCount} remaining
            </Text>
          </View>
        )}

        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <Animated.View
              entering={FadeIn.duration(200)}
              layout={Layout.springify().damping(15)}
              className="px-4 py-2"
            >
              <Text className="text-xs uppercase tracking-widest text-gray-400">
                {section.title}
              </Text>
            </Animated.View>
          )}
          contentContainerClassName="px-5 pb-6"
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Empty list"
              subtitle="Add your first item below"
            />
          }
        />

        <View className="px-4 pb-3 pt-2 bg-white border-t border-gray-100">
          <View className="flex-row items-end gap-3">
            <View className="flex-1">
              <AppTextInput
                testID="add-item-input"
                placeholder="Add an item..."
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                returnKeyType="done"
                blurOnSubmit={false}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 120)}
              />
              {showSuggestions && (
                <View className="mt-2 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={`${suggestion.name}-${suggestion.unit ?? "none"}-${
                        suggestion.quantity
                      }`}
                      onPress={() => setNewItemName(buildSuggestionText(suggestion))}
                      className="px-4 py-3 border-b border-gray-100"
                    >
                      <Text className="text-sm font-semibold text-gray-900">
                        {suggestion.name}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {formatQuantityUnit(suggestion.quantity, suggestion.unit)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <AppButton
              testID="add-item-submit"
              onPress={handleAddItem}
              disabled={adding || !newItemName.trim()}
              loading={adding}
              title="Add"
              className="px-6"
            />
          </View>
        </View>

        <BottomSheet
          visible={showShare}
          onClose={() => setShowShare(false)}
          title="Share List"
          subtitle="Invite someone or manage members"
        >
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Members
            </Text>
            <View className="space-y-2">
              {memberUids.map((uid) => {
                const profile = memberProfiles[uid];
                const label = profile?.displayName || profile?.email || "Member";
                const isOwner = uid === list?.ownerUid;
                return (
                  <View
                    key={uid}
                    className="flex-row items-center justify-between bg-gray-50 rounded-xl px-3 py-2"
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                          isOwner ? "bg-emerald-100" : "bg-white"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isOwner ? "text-emerald-700" : "text-gray-600"
                          }`}
                        >
                          {getInitials(profile?.displayName, profile?.email)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-gray-900">
                          {label}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {isOwner ? "Owner" : "Member"}
                        </Text>
                      </View>
                    </View>
                    {user?.uid === list?.ownerUid && !isOwner && (
                      <TouchableOpacity onPress={() => handleRemoveMember(uid)}>
                        <Ionicons name="remove-circle" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <AppTextInput
            testID="share-email-input"
            placeholder="partner@email.com"
            value={shareEmail}
            onChangeText={setShareEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
            onSubmitEditing={handleShare}
            className="mb-4"
          />
          <AppButton
            testID="share-submit"
            onPress={handleShare}
            disabled={sharing || !shareEmail.trim()}
            loading={sharing}
            title="Share"
          />
        </BottomSheet>

        <BottomSheet
          visible={!!editingItem}
          onClose={() => setEditingItem(null)}
          title="Edit Item"
          subtitle={editingItem?.name}
        >
          <AppTextInput
            label="Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            className="mb-3"
          />
          <AppTextInput
            label="Quantity"
            value={editQuantity}
            onChangeText={setEditQuantity}
            keyboardType="numeric"
            className="mb-3"
          />
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Unit</Text>
            <View className="flex-row flex-wrap gap-2">
              {UNITS.map((unit) => {
                const active = editUnit === unit.value;
                return (
                  <TouchableOpacity
                    key={unit.value}
                    onPress={() => setEditUnit(active ? undefined : unit.value)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const active = editCategory === category.value;
                return (
                  <TouchableOpacity
                    key={category.value}
                    onPress={() => setEditCategory(category.value)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                      active
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <View className="mr-1">
                      <Ionicons
                        name={category.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={active ? "#fff" : "#6b7280"}
                      />
                    </View>
                    <Text
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <AppTextInput
            label="Note"
            value={editNote}
            onChangeText={setEditNote}
            placeholder="Optional notes"
            multiline
            className="mb-4"
          />

          <AppButton
            title="Save changes"
            onPress={handleSaveEdit}
            loading={savingEdit}
          />
          {!!editingItem && (
            <AppButton
              title="Delete item"
              variant="danger"
              onPress={() => handleDelete(editingItem)}
              className="mt-3"
            />
          )}
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
