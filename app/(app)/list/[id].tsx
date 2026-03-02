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
  ScrollView,
  Keyboard,
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
import { useCategories } from "@/hooks/useCategories";
import { GroceryCategory, GroceryItem, UserProfile } from "@/types";
import {
  parseItemInput,
  formatQuantityUnit,
  UNITS,
  suggestCategory,
} from "@/lib/constants";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { AppButton } from "@/components/ui/AppButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/lib/theme-context";

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
onReorder,
}: ListItemRowProps) => {
  const { accent, isDark } = useTheme();
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
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-3 mx-5 mb-1.5 shadow-sm ${
        item.checked ? "opacity-60" : ""
      }`}
    >
      <View className="flex-row items-center">
        {reorderMode && !section.isCompleted ? (
          <View className="mr-2.5">
            <Ionicons name="reorder-two" size={20} color={isDark ? "#6b7280" : "#9ca3af"} />
          </View>
        ) : (
          <TouchableOpacity
            testID={`item-checkbox-${item.id}`}
            onPress={() => onToggle(item)}
            className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-2.5 ${
              item.checked ? "" : "border-gray-300 dark:border-gray-600"
            }`}
            style={
              item.checked
                ? { backgroundColor: accent[600], borderColor: accent[600] }
                : undefined
            }
          >
            {item.checked && (
              <Ionicons name="checkmark" size={14} color="white" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onToggle(item)}
          className="flex-1 justify-center"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-wrap">
            <Text
              className={`text-sm font-semibold ${
                item.checked ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-50"
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 ml-1.5" numberOfLines={1}>
              {formatQuantityDisplay(item)} · {addedBy}
            </Text>
          </View>
          {item.note ? (
            <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5" numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </TouchableOpacity>

        {!reorderMode && (
          <TouchableOpacity
            onPress={() => onEdit(item)}
            className="ml-2 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
          >
            <Ionicons name="pencil" size={13} color={isDark ? "#9ca3af" : "#4b5563"} />
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
            className="rounded-2xl mx-1 px-5 py-4"
            style={{ backgroundColor: accent[500] }}
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
  const { accent, isDark } = useTheme();
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
  const { visibleCategories, allCategories } = useCategories();
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
  const [showNoteField, setShowNoteField] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

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
    if (editingItem && !isNewItem) {
      setEditName(editingItem.name);
      setEditQuantity(String(editingItem.quantity ?? 1));
      setEditUnit(editingItem.unit);
      setEditCategory(editingItem.category ?? suggestCategory(editingItem.name));
      setEditNote(editingItem.note ?? "");
      setShowNoteField(!!editingItem.note);
      setCategoryOpen(false);
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
    const visibleValues = new Set(visibleCategories.map((c) => c.value));

    // 1. Create sections for visible categories
    visibleCategories.forEach((category) => {
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

    // 2. Collect items from hidden categories (or unknown categories)
    const hiddenItems = uncheckedItems.filter(
      (item) => !visibleValues.has(item.category ?? "other")
    );

    // 3. Add hidden items to "Other" section (create or merge)
    if (hiddenItems.length) {
      const otherIndex = sections.findIndex((s) => s.category === "other");
      if (otherIndex >= 0) {
        // Merge with existing "Other" section
        const existing = sections[otherIndex];
        sections[otherIndex] = {
          ...existing,
          data: sortItems([...existing.data, ...hiddenItems]),
        };
      } else {
        // Create new "Other" section
        sections.push({
          title: "Other",
          category: "other",
          data: sortItems(hiddenItems),
        });
      }
    }

    if (showCompleted && checkedItems.length) {
      sections.push({
        title: "Completed",
        data: sortItems(checkedItems),
        isCompleted: true,
      });
    }

    return sections;
  }, [checkedItems, showCompleted, sortItems, uncheckedItems, visibleCategories]);

  useEffect(() => {
    if (reorderMode) {
      setOrderedSections(sectionData);
    }
  }, [reorderMode, sectionData]);

  const displaySections = reorderMode ? orderedSections : sectionData;



  const handleAddItem = async () => {
    const parsed = parseItemInput(newItemName);
    const name = parsed.name.trim();
    if (!name) return;

    setAdding(true);
    try {
      const category = suggestCategory(name);
      await addItem({ name, quantity: parsed.quantity || 1, unit: parsed.unit ?? null, category });
      await recordItemUsage({ name, quantity: parsed.quantity || 1, unit: parsed.unit ?? null, category });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNewItemName("");
      Keyboard.dismiss();
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleAddItemDetailed = () => {
    const parsed = parseItemInput(newItemName);
    const name = parsed.name.trim();

    setEditName(name);
    setEditQuantity(String(parsed.quantity || 1));
    setEditUnit(parsed.unit);
    setEditCategory(name ? suggestCategory(name) : undefined);
    setEditNote("");
    setShowNoteField(false);
    setIsNewItem(true);
    setCategoryOpen(false);
    setEditingItem({} as GroceryItem);
    setNewItemName("");
    setIsNewItem(true);
    setEditingItem({} as GroceryItem);
    setNewItemName("");
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
    if (!editingItem && !isNewItem) return;
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
      if (isNewItem) {
        await addItem({ name: trimmed, quantity, unit: editUnit ?? null, category: editCategory ?? suggestCategory(trimmed) });
        await recordItemUsage({ name: trimmed, quantity, unit: editUnit ?? null, category: editCategory ?? suggestCategory(trimmed) });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await updateItem(editingItem!.id, {
          name: trimmed,
          quantity,
          unit: editUnit ?? null,
          category: editCategory ?? suggestCategory(trimmed),
          note: editNote.trim() ? editNote.trim() : null,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setEditingItem(null);
      setIsNewItem(false);
    } catch {
      Alert.alert("Error", "Failed to save item");
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
      onReorder={handleReorder}
    />
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={accent[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-900 px-2 py-2 border-b border-gray-100 dark:border-gray-800 z-10">
        <View className="flex-row items-center justify-between min-h-[44px]">
          {/* Left: Back */}
          <View className="flex-none w-[20%] items-start">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800 -ml-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color={isDark ? "#f3f4f6" : "#1f2937"} />
            </TouchableOpacity>
          </View>

          {/* Center: Title & Members */}
          <View className="flex-1 items-center justify-center mx-2 max-w-[60%]">
            {isRenaming ? (
              <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden w-full">
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  className="flex-1 py-1.5 px-3 text-sm font-semibold text-gray-900 dark:text-gray-50 text-center"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRename}
                  placeholder="List Name"
                  clearButtonMode="while-editing"
                  selectTextOnFocus
                />
                <View className="flex-row border-l border-gray-200 dark:border-gray-700">
                  <TouchableOpacity onPress={handleRename} className="p-2 active:bg-gray-200 dark:active:bg-gray-700">
                    <Ionicons name="checkmark" size={16} color={accent[600]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsRenaming(false);
                      setNameDraft(list?.name ?? "");
                    }}
                    className="p-2 active:bg-gray-200 dark:active:bg-gray-700"
                  >
                    <Ionicons name="close" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsRenaming(true)}
                className="items-center justify-center w-full py-1"
                activeOpacity={0.6}
              >
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-50 text-center leading-tight" numberOfLines={1}>
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
                            className={`w-4 h-4 rounded-full items-center justify-center border border-white dark:border-gray-900 -ml-1 ${
                              uid === list?.ownerUid ? "" : "bg-gray-100 dark:bg-gray-800"
                            } ${index === 0 ? "ml-0" : ""}`}
                            style={uid === list?.ownerUid ? { backgroundColor: accent[100] } : undefined}
                          >
                            <Text
                              className={`text-[9px] font-bold ${
                                uid === list?.ownerUid ? "" : "text-gray-600 dark:text-gray-300"
                              }`}
                              style={uid === list?.ownerUid ? { color: accent[700] } : undefined}
                            >
                              {getInitials(profile?.displayName, profile?.email).charAt(0)}
                            </Text>
                          </View>
                        );
                      })}
                      {memberUids.length > 3 && (
                        <View className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center border border-white dark:border-gray-900 -ml-1">
                          <Text className="text-[8px] font-bold text-gray-600 dark:text-gray-300">
                            +{memberUids.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
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
                  color={showCompleted ? (isDark ? "#9ca3af" : "#4b5563") : (isDark ? "#6b7280" : "#9ca3af")}
                  size={20}
                  className="p-1.5"
                />
                <IconButton
                  icon="reorder-three"
                  onPress={() => setReorderMode((prev) => !prev)}
                  color={reorderMode ? accent[600] : (isDark ? "#9ca3af" : "#4b5563")}
                  size={22}
                  className="p-1.5"
                />
                <IconButton
                  icon="share-outline"
                  onPress={() => setShowShare(true)}
                  color={isDark ? "#9ca3af" : "#4b5563"}
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
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        keyboardVerticalOffset={0}
      >
        {totalCount > 0 && (
          <View className="px-5 py-2">
            <Text className="text-sm text-gray-400 dark:text-gray-500">
              {uncheckedCount} of {totalCount} remaining
            </Text>
          </View>
        )}

        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View
              className="px-5 py-2"
            >
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {section.title}
              </Text>
            </View>
          )}
          contentContainerClassName="pb-6"
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Empty list"
              subtitle="Add your first item below"
            />
          }
        />

        <View className="px-4 pb-3 pt-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 h-12">
              <TextInput
                testID="add-item-input"
                placeholder="Add an item..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={newItemName}
                onChangeText={setNewItemName}
                onSubmitEditing={handleAddItem}
                returnKeyType="done"
                blurOnSubmit={false}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 120)}
                className="flex-1 text-base text-gray-900 dark:text-gray-100 h-12"
              />
              {newItemName.trim() ? (
                <TouchableOpacity
                  onPress={handleAddItemDetailed}
                  className="p-1.5"
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={18} color={accent[500]} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              testID="add-item-submit"
              onPress={handleAddItem}
              disabled={adding || !newItemName.trim()}
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: !newItemName.trim() ? (isDark ? '#374151' : '#d1d5db') : accent[500] }}
              activeOpacity={0.7}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <BottomSheet
          visible={showShare}
          onClose={() => setShowShare(false)}
          title="Share List"
          subtitle="Invite someone or manage members"
        >
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">
              Members
            </Text>
            <View className="gap-2">
              {memberUids.map((uid) => {
                const profile = memberProfiles[uid];
                const label = profile?.displayName || profile?.email || "Member";
                const isOwner = uid === list?.ownerUid;
                return (
                  <View
                    key={uid}
                    className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2"
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                          isOwner ? "" : "bg-white dark:bg-gray-700"
                        }`}
                        style={isOwner ? { backgroundColor: accent[100] } : undefined}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isOwner ? "" : "text-gray-600 dark:text-gray-300"
                          }`}
                          style={isOwner ? { color: accent[700] } : undefined}
                        >
                          {getInitials(profile?.displayName, profile?.email)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                          {label}
                        </Text>
                        <Text className="text-xs text-gray-400 dark:text-gray-500">
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
          visible={!!editingItem || isNewItem}
          onClose={() => {
            setEditingItem(null);
            setIsNewItem(false);
            setCategoryOpen(false);
          }}
          title={isNewItem ? "Add Item" : "Edit Item"}
        >
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <AppTextInput
                label="Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Item name"
              />
            </View>
            <View className="w-20">
              <AppTextInput
                label="Qty"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unit</Text>
            <View className="flex-row flex-wrap gap-2">
              {UNITS.map((unit) => {
                const active = editUnit === unit.value;
                return (
                  <TouchableOpacity
                    key={unit.value}
                    onPress={() => setEditUnit(active ? undefined : unit.value)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active
                        ? ""
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                    style={
                      active
                        ? { backgroundColor: accent[500], borderColor: accent[500] }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? "text-white" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</Text>
            
            <TouchableOpacity
              onPress={() => setCategoryOpen(!categoryOpen)}
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <View className="flex-row items-center">
                {(() => {
                  const selectedCat = allCategories.find((c) => c.value === editCategory);
                  if (selectedCat) {
                    return (
                      <>
                        <View className="mr-2">
                          <Ionicons
                            name={selectedCat.icon as keyof typeof Ionicons.glyphMap}
                            size={16}
                            color={accent[500]}
                          />
                        </View>
                        <Text className="text-sm font-medium" style={{ color: accent[500] }}>
                          {selectedCat.label}
                        </Text>
                      </>
                    );
                  }
                  return (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Select category
                    </Text>
                  );
                })()}
              </View>
              <Ionicons
                name={categoryOpen ? "chevron-up-outline" : "chevron-down-outline"}
                size={16}
                color={isDark ? "#9ca3af" : "#6b7280"}
              />
            </TouchableOpacity>

            {categoryOpen && (
              <ScrollView
                style={{ maxHeight: 200 }}
                nestedScrollEnabled
                className="rounded-xl border border-gray-200 dark:border-gray-700 mt-1 overflow-hidden"
              >
                {allCategories.map((category, index) => {
                  const isSelected = editCategory === category.value;
                  const isLast = index === allCategories.length - 1;
                  
                  return (
                    <TouchableOpacity
                      key={category.value}
                      onPress={() => {
                        setEditCategory(category.value);
                        setCategoryOpen(false);
                      }}
                      className={`flex-row items-center px-3 py-2.5 ${
                        !isLast ? "border-b border-gray-100 dark:border-gray-700" : ""
                      } ${isSelected ? "" : "bg-white dark:bg-gray-800"}`}
                      style={isSelected ? { backgroundColor: accent[500] } : undefined}
                    >
                      <View className="mr-2.5 w-5 items-center">
                        <Ionicons
                          name={category.icon as keyof typeof Ionicons.glyphMap}
                          size={16}
                          color={isSelected ? "#fff" : (isDark ? "#9ca3af" : "#6b7280")}
                        />
                      </View>
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? "font-medium text-white"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {showNoteField ? (
            <AppTextInput
              label="Note"
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Optional notes"
              multiline
              className="mb-3"
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowNoteField(true)}
              className="mb-3"
            >
              <Text className="text-sm" style={{ color: accent[500] }}>+ Add note</Text>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <AppButton
                title="Save changes"
                onPress={handleSaveEdit}
                loading={savingEdit}
              />
            </View>
            {!!editingItem && (
              <TouchableOpacity
                onPress={() => handleDelete(editingItem)}
                className="w-10 h-10 rounded-full items-center justify-center bg-red-100 dark:bg-red-900/30"
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
