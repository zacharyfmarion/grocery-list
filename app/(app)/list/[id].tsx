import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  SectionList,
  TextInput,
  ScrollView,
  Keyboard,
  Modal,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
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
import { parseItemInput, formatQuantityUnit, UNITS, suggestCategory } from "@/lib/constants";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { AppButton } from "@/components/ui/AppButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";
import { FAB } from "@/components/ui/FAB";
import { showErrorToast } from "@/lib/toast";
import { useTheme } from "@/lib/theme-context";

type ListSection = {
  title: string;
  category?: GroceryCategory;
  data: GroceryItem[];
  isCompleted?: boolean;
};

type SectionMeasure = {
  category: GroceryCategory;
  y: number;
};

type ListItemRowProps = {
  item: GroceryItem;
  section: ListSection;
  inlineEditingItemId: string | null;
  inlineNameDraft: string;
  inlineSaving: boolean;
  isDragging: boolean;
  isActiveDropSection: boolean;
  onToggle: (item: GroceryItem) => void;
  onEdit: (item: GroceryItem) => void;
  onStartInlineEdit: (item: GroceryItem) => void;
  onInlineNameChange: (value: string) => void;
  onSaveInlineEdit: (item: GroceryItem) => void;
  onDragStart: (item: GroceryItem) => void;
  onDragMove: (absoluteY: number) => void;
  onDragEnd: (item: GroceryItem) => void;
};

const getInitials = (name?: string, email?: string) => {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const formatQuantityDisplay = (item: GroceryItem) => {
  const base = formatQuantityUnit(item.quantity, item.unit);
  if (!item.unit) return base;
  return base.replace(`${item.quantity} `, `${item.quantity} × `);
};

const ListItemRow = ({
  item,
  section,
  inlineEditingItemId,
  inlineNameDraft,
  inlineSaving,
  isDragging,
  isActiveDropSection,
  onToggle,
  onEdit,
  onStartInlineEdit,
  onInlineNameChange,
  onSaveInlineEdit,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ListItemRowProps) => {
  const { accent, isDark } = useTheme();
  const isInlineEditing = inlineEditingItemId === item.id;
  const canDrag = !section.isCompleted && !item.checked && !isInlineEditing;

  const row = (
    <View
      className={`rounded-xl border px-3.5 py-3.5 mx-5 mb-2 shadow-sm ${
        isActiveDropSection
          ? "border-transparent"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      } ${item.checked ? "opacity-60" : ""}`}
      style={isActiveDropSection ? { backgroundColor: isDark ? "#142033" : accent[50] } : undefined}
    >
      {isActiveDropSection ? (
        <View
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
          style={{ backgroundColor: accent[500] }}
        />
      ) : null}
      <View className="flex-row items-center">
        <TouchableOpacity
          testID={`item-checkbox-${item.id}`}
          onPress={() => onToggle(item)}
          className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center mr-2.5 ${
            item.checked ? "" : "border-gray-300 dark:border-gray-600"
          }`}
          style={
            item.checked ? { backgroundColor: accent[600], borderColor: accent[600] } : undefined
          }
        >
          {item.checked && <Ionicons name="checkmark" size={15} color="white" />}
        </TouchableOpacity>

        {isInlineEditing ? (
          <View className="flex-1 justify-center">
            <View className={`flex-row gap-3 ${item.note ? "items-start" : "items-center"}`}>
              <View className="flex-1">
                <TextInput
                  value={inlineNameDraft}
                  onChangeText={onInlineNameChange}
                  onEndEditing={() => onSaveInlineEdit(item)}
                  autoFocus
                  returnKeyType="done"
                  className="text-[15px] font-semibold text-gray-900 dark:text-gray-50 py-0"
                />

                {item.note ? (
                  <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
                    {item.note}
                  </Text>
                ) : null}
              </View>

              <View
                className={`min-w-[64px] rounded-full px-3 py-1 items-center justify-center ${
                  item.checked ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
                style={
                  !item.checked ? { backgroundColor: isDark ? "#1b2a41" : accent[50] } : undefined
                }
              >
                <Text
                  className={`text-[13px] font-bold ${
                    item.checked ? "text-gray-500 dark:text-gray-400" : ""
                  }`}
                  style={!item.checked ? { color: accent[700] } : undefined}
                  numberOfLines={1}
                >
                  {formatQuantityDisplay(item)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onStartInlineEdit(item)}
            className="flex-1 justify-center"
            activeOpacity={0.7}
            disabled={isDragging}
          >
            <View className={`flex-row gap-3 ${item.note ? "items-start" : "items-center"}`}>
              <View className="flex-1">
                <Text
                  className={`text-[15px] font-semibold ${
                    item.checked
                      ? "text-gray-400 dark:text-gray-500 line-through"
                      : "text-gray-900 dark:text-gray-50"
                  }`}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                {item.note ? (
                  <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
                    {item.note}
                  </Text>
                ) : null}
              </View>

              <View
                className={`min-w-[64px] rounded-full px-3 py-1 items-center justify-center ${
                  item.checked ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
                style={
                  !item.checked ? { backgroundColor: isDark ? "#1b2a41" : accent[50] } : undefined
                }
              >
                <Text
                  className={`text-[13px] font-bold ${
                    item.checked ? "text-gray-500 dark:text-gray-400" : ""
                  }`}
                  style={!item.checked ? { color: accent[700] } : undefined}
                  numberOfLines={1}
                >
                  {formatQuantityDisplay(item)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onEdit(item)}
          disabled={isInlineEditing || inlineSaving || isDragging}
          className="ml-2 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
        >
          <Ionicons name="pencil" size={14} color={isDark ? "#9ca3af" : "#4b5563"} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (canDrag) {
    const translateY = useSharedValue(0);
    const dragging = useSharedValue(false);
    const pan = Gesture.Pan()
      .activateAfterLongPress(220)
      .onStart((event) => {
        dragging.value = true;
        runOnJS(onDragStart)(item);
        runOnJS(onDragMove)(event.absoluteY);
      })
      .onUpdate((event) => {
        translateY.value = event.translationY;
        runOnJS(onDragMove)(event.absoluteY);
      })
      .onFinalize(() => {
        runOnJS(onDragEnd)(item);
        translateY.value = withSpring(0);
        dragging.value = false;
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
      zIndex: dragging.value ? 20 : 1,
      opacity: dragging.value ? 0.95 : 1,
      shadowOpacity: dragging.value ? 0.18 : 0,
      shadowRadius: dragging.value ? 16 : 0,
      elevation: dragging.value ? 8 : 0,
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>{row}</Animated.View>
      </GestureDetector>
    );
  }

  return row;
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
    updateItem,
    moveItemToCategory,
    deleteItem,
    uncheckedCount,
    totalCount,
  } = useItems(id);
  const { lists, shareList, renameList } = useLists();
  const { recordItemUsage } = useItemHistory();
  const { visibleCategories, allCategories } = useCategories();
  const list = lists.find((l) => l.id === id);

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile | null>>({});

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(list?.name ?? "");

  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState<string | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<GroceryCategory | undefined>(undefined);
  const [editNote, setEditNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [autoFocusItemName, setAutoFocusItemName] = useState(false);
  const [inlineEditingItemId, setInlineEditingItemId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTargetCategory, setDragTargetCategory] = useState<GroceryCategory | null>(null);
  const [sectionMeasurements, setSectionMeasurements] = useState<SectionMeasure[]>([]);
  const editNameInputRef = useRef<TextInput>(null);
  const sectionHeaderRefs = useRef<Partial<Record<GroceryCategory, View | null>>>({});

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
        }),
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

  useEffect(() => {
    if (!(isNewItem && autoFocusItemName) || Platform.OS !== "android") {
      return;
    }

    const timer = setTimeout(() => {
      editNameInputRef.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, [autoFocusItemName, editNameInputRef, isNewItem]);

  const uncheckedItems = useMemo(() => items.filter((item) => !item.checked), [items]);
  const checkedItems = useMemo(() => items.filter((item) => item.checked), [items]);

  const sortItems = useCallback((listItems: GroceryItem[]) => {
    return [...listItems].sort((a, b) => {
      const normalizedNameA = a.name.trim().toLowerCase();
      const normalizedNameB = b.name.trim().toLowerCase();
      const nameCompare = normalizedNameA.localeCompare(normalizedNameB);
      if (nameCompare !== 0) return nameCompare;
      const timeA = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
      const timeB = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, []);

  const sectionData = useMemo<ListSection[]>(() => {
    const sections: ListSection[] = [];
    const visibleValues = new Set(visibleCategories.map((c) => c.value));

    // 1. Create sections for visible categories
    visibleCategories.forEach((category) => {
      const data = uncheckedItems.filter((item) => (item.category ?? "other") === category.value);
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
      (item) => !visibleValues.has(item.category ?? "other"),
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
  const displaySections = sectionData;

  const openNewItemEditor = (
    initialName = "",
    category?: GroceryCategory,
    options?: { autoFocusName?: boolean },
  ) => {
    const parsed = parseItemInput(initialName);
    const name = parsed.name.trim();

    setEditName(name);
    setEditQuantity(String(parsed.quantity || 1));
    setEditUnit(parsed.unit);
    setEditCategory(category ?? (name ? suggestCategory(name) : undefined));
    setEditNote("");
    setShowNoteField(false);
    setIsNewItem(true);
    setCategoryOpen(false);
    setAutoFocusItemName(options?.autoFocusName ?? false);
    setEditingItem(null);
    setInlineEditingItemId(null);
    setInlineNameDraft("");
    Keyboard.dismiss();
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
            setEditingItem(null);
            setIsNewItem(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
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
    const category = editCategory ?? suggestCategory(trimmed);
    const note = editNote.trim() ? editNote.trim() : null;

    setEditingItem(null);
    setIsNewItem(false);
    setAutoFocusItemName(false);
    setInlineEditingItemId(null);

    if (isNewItem) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void (async () => {
        try {
          await addItem({
            name: trimmed,
            quantity,
            unit: editUnit,
            category,
          });
          await recordItemUsage({
            name: trimmed,
            quantity,
            unit: editUnit,
            category,
          });
        } catch (error) {
          console.error("Failed to add item:", error);
          showErrorToast("Couldn't add item");
        }
      })();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateItem(editingItem!.id, {
      name: trimmed,
      quantity,
      unit: editUnit ?? null,
      category,
      note,
    });
  };

  const handleStartInlineEdit = useCallback(
    (item: GroceryItem) => {
      if (draggingItemId) return;
      setInlineEditingItemId(item.id);
      setInlineNameDraft(item.name);
    },
    [draggingItemId],
  );

  const handleSaveInlineEdit = useCallback(
    async (item: GroceryItem) => {
      if (inlineSaving || inlineEditingItemId !== item.id) return;

      const trimmed = inlineNameDraft.trim();
      if (!trimmed || trimmed === item.name) {
        setInlineEditingItemId(null);
        setInlineNameDraft("");
        return;
      }

      setInlineSaving(true);
      try {
        await updateItem(item.id, { name: trimmed });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        Alert.alert("Rename failed", "Could not update the item name.");
      } finally {
        setInlineSaving(false);
        setInlineEditingItemId(null);
        setInlineNameDraft("");
      }
    },
    [inlineEditingItemId, inlineNameDraft, inlineSaving, updateItem],
  );

  const measureSectionHeaders = useCallback(() => {
    const categoriesToMeasure = displaySections
      .filter((section) => !section.isCompleted && section.category)
      .map((section) => section.category as GroceryCategory);

    if (!categoriesToMeasure.length) {
      setSectionMeasurements([]);
      return;
    }

    Promise.all(
      categoriesToMeasure.map(
        (category) =>
          new Promise<SectionMeasure | null>((resolve) => {
            const ref = sectionHeaderRefs.current[category];
            if (!ref?.measureInWindow) {
              resolve(null);
              return;
            }

            ref.measureInWindow((_x, y) => {
              resolve({ category, y });
            });
          }),
      ),
    ).then((measures) => {
      setSectionMeasurements(
        measures
          .filter((measure): measure is SectionMeasure => measure !== null)
          .sort((a, b) => a.y - b.y),
      );
    });
  }, [displaySections]);

  const handleDragStart = useCallback(
    (item: GroceryItem) => {
      setInlineEditingItemId(null);
      setInlineNameDraft("");
      setDraggingItemId(item.id);
      setDragTargetCategory(item.category ?? "other");
      measureSectionHeaders();
    },
    [measureSectionHeaders],
  );

  const handleDragMove = useCallback(
    (absoluteY: number) => {
      if (!sectionMeasurements.length) return;

      for (let index = 0; index < sectionMeasurements.length; index += 1) {
        const current = sectionMeasurements[index];
        const next = sectionMeasurements[index + 1];
        const lowerBound = current.y;
        const upperBound = next?.y ?? Number.POSITIVE_INFINITY;

        if (absoluteY >= lowerBound && absoluteY < upperBound) {
          setDragTargetCategory(current.category);
          return;
        }
      }
    },
    [sectionMeasurements],
  );

  const handleDragEnd = useCallback(
    (item: GroceryItem) => {
      const nextCategory = dragTargetCategory;
      setDraggingItemId(null);
      setDragTargetCategory(null);

      if (!nextCategory) return;

      const currentCategory = item.category ?? "other";
      if (currentCategory === nextCategory) return;

      void moveItemToCategory(item.id, nextCategory);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [dragTargetCategory, moveItemToCategory],
  );

  const renderItem = ({ item, section }: { item: GroceryItem; section: ListSection }) => (
    <ListItemRow
      item={item}
      section={section}
      inlineEditingItemId={inlineEditingItemId}
      inlineNameDraft={inlineNameDraft}
      inlineSaving={inlineSaving}
      isDragging={draggingItemId === item.id}
      isActiveDropSection={!!section.category && dragTargetCategory === section.category}
      onToggle={handleToggle}
      onEdit={setEditingItem}
      onStartInlineEdit={handleStartInlineEdit}
      onInlineNameChange={setInlineNameDraft}
      onSaveInlineEdit={handleSaveInlineEdit}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
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
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <SafeAreaView edges={["top"]} className="bg-white dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-900 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 z-10">
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
              <TouchableOpacity
                onPress={() => setIsRenaming(true)}
                className="items-center justify-center w-full py-1"
                activeOpacity={0.6}
              >
                <Text
                  className="text-lg font-bold text-gray-900 dark:text-gray-50 text-center leading-tight"
                  numberOfLines={1}
                >
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
                              uid === list?.ownerUid ? "" : "bg-white dark:bg-gray-800"
                            } ${index === 0 ? "ml-0" : ""}`}
                            style={
                              uid === list?.ownerUid ? { backgroundColor: accent[100] } : undefined
                            }
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
                        <View className="w-4 h-4 rounded-full bg-white dark:bg-gray-800 items-center justify-center border border-white dark:border-gray-900 -ml-1">
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
            </View>

            {/* Right: Actions */}
            <View className="flex-none w-[20%] flex-row items-center justify-end gap-0.5">
              <IconButton
                icon={showCompleted ? "eye" : "eye-off"}
                onPress={() => setShowCompleted((prev) => !prev)}
                color={
                  showCompleted ? (isDark ? "#9ca3af" : "#4b5563") : isDark ? "#6b7280" : "#9ca3af"
                }
                size={20}
                className="p-1.5"
              />
              <IconButton
                icon="share-outline"
                onPress={() => setShowShare(true)}
                color={isDark ? "#9ca3af" : "#4b5563"}
                size={20}
                className="p-1.5"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View className="flex-1 bg-gray-50 dark:bg-gray-950">
        {totalCount > 0 && (
          <View className="px-5 py-2.5">
            <Text className="text-[15px] text-gray-400 dark:text-gray-500">
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
              ref={(ref) => {
                if (section.category) {
                  sectionHeaderRefs.current[section.category] = ref;
                }
              }}
              onLayout={(_event: LayoutChangeEvent) => {
                if (draggingItemId) {
                  measureSectionHeaders();
                }
              }}
              className="px-5 py-2.5 flex-row items-center justify-between"
            >
              <Text className="text-[13px] uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {section.title}
              </Text>
              {!section.isCompleted && section.category ? (
                <IconButton
                  icon="add"
                  size={18}
                  color={accent[500]}
                  onPress={() => openNewItemEditor("", section.category)}
                  accessibilityLabel={`Add item to ${section.title}`}
                  className="p-1"
                />
              ) : null}
            </View>
          )}
          contentContainerClassName="pb-6"
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={undefined}
          SectionSeparatorComponent={() => <View className="h-1" />}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="Empty list"
              subtitle="Add your first item with the button"
            />
          }
          contentContainerStyle={{ paddingBottom: 96 }}
          scrollEnabled={!draggingItemId}
        />

        <FAB
          testID="add-item-fab"
          onPress={() => openNewItemEditor("", undefined, { autoFocusName: true })}
        />

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
            setAutoFocusItemName(false);
          }}
          title={isNewItem ? "Add Item" : "Edit Item"}
        >
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <AppTextInput
                ref={editNameInputRef}
                label="Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Item name"
                autoFocus={autoFocusItemName}
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
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Unit
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {UNITS.map((unit) => {
                const active = editUnit === unit.value;
                return (
                  <TouchableOpacity
                    key={unit.value}
                    onPress={() => setEditUnit(active ? undefined : unit.value)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? "" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </Text>

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
                          color={isSelected ? "#fff" : isDark ? "#9ca3af" : "#6b7280"}
                        />
                      </View>
                      <Text
                        className={`text-sm ${
                          isSelected ? "font-medium text-white" : "text-gray-700 dark:text-gray-300"
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
            <TouchableOpacity onPress={() => setShowNoteField(true)} className="mb-3">
              <Text className="text-sm" style={{ color: accent[500] }}>
                + Add note
              </Text>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <AppButton title="Save changes" onPress={handleSaveEdit} />
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
        <Modal
          visible={isRenaming}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsRenaming(false);
            setNameDraft(list?.name ?? "");
          }}
        >
          <RNKeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 items-center justify-center bg-black/50 px-4"
          >
            <TouchableOpacity
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
              activeOpacity={1}
              onPress={() => {
                setIsRenaming(false);
                setNameDraft(list?.name ?? "");
              }}
            />
            <View className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl max-w-sm">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-50 text-center mb-6">
                Rename List
              </Text>

              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-gray-50 mb-6"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleRename}
                placeholder="List Name"
                placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setIsRenaming(false);
                    setNameDraft(list?.name ?? "");
                  }}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl items-center active:opacity-70"
                >
                  <Text className="font-semibold text-gray-900 dark:text-gray-50">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRename}
                  className="flex-1 py-3 rounded-xl items-center active:opacity-70"
                  style={{ backgroundColor: accent[500] }}
                >
                  <Text className="font-semibold text-white">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </RNKeyboardAvoidingView>
        </Modal>
      </View>
    </View>
  );
}
