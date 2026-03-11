import { useMemo, useState, useEffect, useCallback, useRef, type RefObject } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  TextInput,
  ScrollView,
  Keyboard,
  Modal,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { GroceryCategory, GroceryItem, ItemHistoryEntry, UserProfile } from "@/types";
import { parseItemInput, formatQuantityUnit, UNITS, suggestCategory } from "@/lib/constants";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { AppButton } from "@/components/ui/AppButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";
import { FAB } from "@/components/ui/FAB";
import { dismissToast, showErrorToast } from "@/lib/toast";
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

type AddSuggestion = {
  key: string;
  type: "completed_match" | "active_match" | "history";
  name: string;
  quantity: number;
  unit?: string;
  category?: GroceryCategory;
  itemId?: string;
  matchRank: number;
  updatedAtMs?: number;
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

type ItemFormFieldsProps = {
  name: string;
  quantity: string;
  unit?: string;
  category?: GroceryCategory;
  note: string;
  showNoteField: boolean;
  categoryOpen: boolean;
  allCategories: ReturnType<typeof useCategories>["allCategories"];
  submitLabel: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  submitTestID?: string;
  nameInputRef?: RefObject<TextInput | null>;
  nameLabel?: string;
  nameAutoFocus?: boolean;
  onNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value?: string) => void;
  onCategoryToggle: () => void;
  onCategorySelect: (category: GroceryCategory) => void;
  onNoteChange: (value: string) => void;
  onShowNoteField: () => void;
  onSubmit: () => void;
  footerAction?: React.ReactNode;
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

const normalizeItemName = (value: string) => value.trim().toLowerCase();

const getMatchRank = (query: string, candidate: string) => {
  if (!query) return 0;
  if (candidate === query) return 3;
  if (candidate.startsWith(query)) return 2;
  if (candidate.includes(query)) return 1;
  return 0;
};

const formatSuggestionMeta = (
  quantity: number,
  unit?: string,
  categoryLabel?: string,
  options?: { prefix?: string },
) => {
  const pieces: string[] = [];

  if (options?.prefix) {
    pieces.push(options.prefix);
  }

  const quantityLabel = formatQuantityUnit(quantity, unit);
  if (quantityLabel) {
    pieces.push(quantityLabel);
  }

  if (categoryLabel) {
    pieces.push(categoryLabel);
  }

  return pieces.join(" • ");
};

function ItemFormFields({
  name,
  quantity,
  unit,
  category,
  note,
  showNoteField,
  categoryOpen,
  allCategories,
  submitLabel,
  submitDisabled,
  submitLoading,
  submitTestID,
  nameInputRef,
  nameLabel = "Name",
  nameAutoFocus,
  onNameChange,
  onQuantityChange,
  onUnitChange,
  onCategoryToggle,
  onCategorySelect,
  onNoteChange,
  onShowNoteField,
  onSubmit,
  footerAction,
}: ItemFormFieldsProps) {
  const { accent, isDark } = useTheme();

  return (
    <>
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <AppTextInput
            ref={nameInputRef}
            label={nameLabel}
            value={name}
            onChangeText={onNameChange}
            placeholder="Item name"
            autoFocus={nameAutoFocus}
          />
        </View>
        <View className="w-20">
          <AppTextInput
            label="Qty"
            value={quantity}
            onChangeText={onQuantityChange}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unit</Text>
        <View className="flex-row flex-wrap gap-2">
          {UNITS.map((nextUnit) => {
            const active = unit === nextUnit.value;
            return (
              <TouchableOpacity
                key={nextUnit.value}
                onPress={() => onUnitChange(active ? undefined : nextUnit.value)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? "" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                }`}
                style={
                  active ? { backgroundColor: accent[500], borderColor: accent[500] } : undefined
                }
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {nextUnit.label}
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
          onPress={onCategoryToggle}
          activeOpacity={0.7}
          className="flex-row items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <View className="flex-row items-center">
            {(() => {
              const selectedCat = allCategories.find((c) => c.value === category);
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
                <Text className="text-sm text-gray-500 dark:text-gray-400">Select category</Text>
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
            {allCategories.map((nextCategory, index) => {
              const isSelected = category === nextCategory.value;
              const isLast = index === allCategories.length - 1;

              return (
                <TouchableOpacity
                  key={nextCategory.value}
                  onPress={() => onCategorySelect(nextCategory.value)}
                  className={`flex-row items-center px-3 py-2.5 ${
                    !isLast ? "border-b border-gray-100 dark:border-gray-700" : ""
                  } ${isSelected ? "" : "bg-white dark:bg-gray-800"}`}
                  style={isSelected ? { backgroundColor: accent[500] } : undefined}
                >
                  <View className="mr-2.5 w-5 items-center">
                    <Ionicons
                      name={nextCategory.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={isSelected ? "#fff" : isDark ? "#9ca3af" : "#6b7280"}
                    />
                  </View>
                  <Text
                    className={`text-sm ${
                      isSelected ? "font-medium text-white" : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {nextCategory.label}
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
          value={note}
          onChangeText={onNoteChange}
          placeholder="Optional notes"
          multiline
          className="mb-3"
        />
      ) : (
        <TouchableOpacity onPress={onShowNoteField} className="mb-3">
          <Text className="text-sm" style={{ color: accent[500] }}>
            + Add note
          </Text>
        </TouchableOpacity>
      )}

      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <AppButton
            title={submitLabel}
            onPress={onSubmit}
            disabled={submitDisabled}
            loading={submitLoading}
            testID={submitTestID}
          />
        </View>
        {footerAction}
      </View>
    </>
  );
}

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
  const insets = useSafeAreaInsets();
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
  const { getSuggestions, recordItemUsage } = useItemHistory();
  const { visibleCategories, allCategories } = useCategories(id);
  const list = lists.find((l) => l.id === id);

  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile | null>>({});

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(list?.name ?? "");

  const [showAddItemTray, setShowAddItemTray] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftQuantity, setDraftQuantity] = useState("1");
  const [draftUnit, setDraftUnit] = useState<string | undefined>(undefined);
  const [draftCategory, setDraftCategory] = useState<GroceryCategory | undefined>(undefined);
  const [draftNote, setDraftNote] = useState("");
  const [showAddNoteField, setShowAddNoteField] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSuggestionCategoryFilter, setAddSuggestionCategoryFilter] = useState<
    GroceryCategory | undefined
  >(undefined);
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState<string | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<GroceryCategory | undefined>(undefined);
  const [editNote, setEditNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [inlineEditingItemId, setInlineEditingItemId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTargetCategory, setDragTargetCategory] = useState<GroceryCategory | null>(null);
  const [sectionMeasurements, setSectionMeasurements] = useState<SectionMeasure[]>([]);
  const addNameInputRef = useRef<TextInput>(null);
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
    if (editingItem) {
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
    if (!showAddItemTray || Platform.OS !== "android") {
      return;
    }

    const timer = setTimeout(() => {
      addNameInputRef.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, [showAddItemTray]);

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

  const resetAddItemDraft = useCallback(() => {
    setDraftName("");
    setDraftQuantity("1");
    setDraftUnit(undefined);
    setDraftCategory(undefined);
    setDraftNote("");
    setShowAddNoteField(false);
    setAddCategoryOpen(false);
    setAddSuggestionCategoryFilter(undefined);
    setShowAddDetails(false);
    setAddSaving(false);
  }, []);

  const closeAddItemTray = useCallback(() => {
    setShowAddItemTray(false);
    resetAddItemDraft();
  }, [resetAddItemDraft]);

  const openEditItemSheet = useCallback((item: GroceryItem) => {
    dismissToast();
    setCategoryOpen(false);
    setEditingItem(item);
    setInlineEditingItemId(null);
    setInlineNameDraft("");
    Keyboard.dismiss();
  }, []);

  const openAddItemTrayWithDefaults = useCallback(
    (initialName = "", category?: GroceryCategory) => {
      dismissToast();
      const parsed = parseItemInput(initialName);
      const name = parsed.name.trim();

      setDraftName(name);
      setDraftQuantity(String(parsed.quantity || 1));
      setDraftUnit(parsed.unit);
      setDraftCategory(category ?? (name ? suggestCategory(name) : undefined));
      setDraftNote("");
      setShowAddNoteField(false);
      setAddCategoryOpen(false);
      setAddSuggestionCategoryFilter(category);
      setShowAddDetails(false);
      setAddSaving(false);
      setShowAddItemTray(true);
      setEditingItem(null);
      setInlineEditingItemId(null);
      setInlineNameDraft("");
      Keyboard.dismiss();
    },
    [],
  );

  const normalizedDraftName = useMemo(() => normalizeItemName(draftName), [draftName]);

  const addSuggestions = useMemo<AddSuggestion[]>(() => {
    const currentListSuggestions = new Map<string, AddSuggestion>();

    items.forEach((item) => {
      const itemCategory = item.category ?? suggestCategory(item.name);
      if (addSuggestionCategoryFilter && itemCategory !== addSuggestionCategoryFilter) {
        return;
      }

      const normalizedName = normalizeItemName(item.name);
      const matchRank = normalizedDraftName ? getMatchRank(normalizedDraftName, normalizedName) : 0;

      if (normalizedDraftName && !matchRank) {
        return;
      }

      if (!normalizedDraftName && !item.checked) {
        return;
      }

      const nextSuggestion: AddSuggestion = {
        key: `${item.checked ? "completed" : "active"}-${item.id}`,
        type: item.checked ? "completed_match" : "active_match",
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        itemId: item.id,
        matchRank,
        updatedAtMs: item.updatedAt?.toMillis?.() ?? item.createdAt?.toMillis?.() ?? 0,
      };

      const existing = currentListSuggestions.get(normalizedName);
      if (!existing) {
        currentListSuggestions.set(normalizedName, nextSuggestion);
        return;
      }

      const nextIsBetter =
        nextSuggestion.matchRank > existing.matchRank ||
        (nextSuggestion.matchRank === existing.matchRank &&
          existing.type === "completed_match" &&
          nextSuggestion.type === "active_match") ||
        (nextSuggestion.matchRank === existing.matchRank &&
          nextSuggestion.type === existing.type &&
          (nextSuggestion.updatedAtMs ?? 0) > (existing.updatedAtMs ?? 0));

      if (nextIsBetter) {
        currentListSuggestions.set(normalizedName, nextSuggestion);
      }
    });

    const sortedCurrentSuggestions = Array.from(currentListSuggestions.values()).sort((a, b) => {
      if (!normalizedDraftName) {
        return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
      }
      if (a.matchRank !== b.matchRank) return b.matchRank - a.matchRank;
      if (a.type !== b.type) {
        return a.type === "active_match" ? -1 : 1;
      }
      return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
    });

    const seenNames = new Set(
      sortedCurrentSuggestions.map((suggestion) => normalizeItemName(suggestion.name)),
    );

    const historySuggestions = getSuggestions(draftName)
      .filter(
        (entry) =>
          !addSuggestionCategoryFilter || (entry.category ?? suggestCategory(entry.name)) === addSuggestionCategoryFilter,
      )
      .filter((entry) => !seenNames.has(normalizeItemName(entry.name)))
      .map((entry: ItemHistoryEntry) => ({
        key: `history-${normalizeItemName(entry.name)}`,
        type: "history" as const,
        name: entry.name,
        quantity: entry.quantity,
        unit: entry.unit,
        category: entry.category,
        matchRank: normalizedDraftName
          ? getMatchRank(normalizedDraftName, normalizeItemName(entry.name))
          : 0,
        updatedAtMs: entry.lastUsed?.toMillis?.() ?? 0,
      }));

    return [...sortedCurrentSuggestions, ...historySuggestions].slice(0, 10);
  }, [addSuggestionCategoryFilter, draftName, getSuggestions, items, normalizedDraftName]);

  const exactActiveSuggestion = useMemo(
    () =>
      addSuggestions.find(
        (suggestion) =>
          suggestion.type === "active_match" && normalizeItemName(suggestion.name) === normalizedDraftName,
      ),
    [addSuggestions, normalizedDraftName],
  );

  const applyHistorySuggestion = useCallback((suggestion: AddSuggestion) => {
    setDraftName(suggestion.name);
    setDraftQuantity(String(suggestion.quantity || 1));
    setDraftUnit(suggestion.unit);
    setDraftCategory(suggestion.category ?? suggestCategory(suggestion.name));
  }, []);

  const handleProceedToAddDetails = useCallback(() => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      return;
    }

    setDraftCategory((currentCategory) => currentCategory ?? suggestCategory(trimmed));
    setShowAddDetails(true);
  }, [draftName]);

  const enqueueNewItemAdd = useCallback(
    (
      item: {
        name: string;
        quantity: number;
        unit?: string;
        category: GroceryCategory;
        note?: string;
      },
      options?: {
        errorMessage?: string;
      },
    ) => {
      closeAddItemTray();

      void (async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await addItem(item);
          await recordItemUsage({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
          });
        } catch (error) {
          console.error("Failed to add item:", error);
          showErrorToast(options?.errorMessage ?? "Couldn't add item");
        }
      })();
    },
    [addItem, closeAddItemTray, recordItemUsage],
  );

  const handleUseSuggestion = useCallback(
    async (suggestion: AddSuggestion) => {
      if (suggestion.type === "active_match") {
        const matchingItem = items.find((item) => item.id === suggestion.itemId);
        if (!matchingItem) return;
        closeAddItemTray();
        openEditItemSheet(matchingItem);
        return;
      }

      if (suggestion.type === "completed_match") {
        const matchingItem = items.find((item) => item.id === suggestion.itemId);
        if (!matchingItem) return;
        closeAddItemTray();
        await handleToggle(matchingItem);
        return;
      }

      enqueueNewItemAdd(
        {
          name: suggestion.name,
          quantity: suggestion.quantity,
          unit: suggestion.unit,
          category: suggestion.category ?? suggestCategory(suggestion.name),
        },
        { errorMessage: "Couldn't add item" },
      );
    },
    [enqueueNewItemAdd, items, openEditItemSheet],
  );

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

  const handleSaveNewItem = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Item name cannot be empty.");
      return;
    }

    if (exactActiveSuggestion) {
      Alert.alert("Already on list", `"${exactActiveSuggestion.name}" is already active on this list.`);
      return;
    }

    const quantity = Number(draftQuantity) || 1;
    if (quantity <= 0) {
      Alert.alert("Invalid quantity", "Quantity must be greater than 0.");
      return;
    }

    const category = draftCategory ?? suggestCategory(trimmed);
    const note = draftNote.trim() ? draftNote.trim() : undefined;

    enqueueNewItemAdd(
      {
        name: trimmed,
        quantity,
        unit: draftUnit,
        category,
        note,
      },
      { errorMessage: "Couldn't add item" },
    );
  };

  const handleCreateTypedItem = useCallback(() => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      return;
    }

    if (exactActiveSuggestion) {
      Alert.alert("Already on list", `"${exactActiveSuggestion.name}" is already active on this list.`);
      return;
    }

    enqueueNewItemAdd(
      {
        name: trimmed,
        quantity: Number(draftQuantity) || 1,
        unit: draftUnit,
        category: draftCategory ?? suggestCategory(trimmed),
        note: draftNote.trim() ? draftNote.trim() : undefined,
      },
      { errorMessage: "Couldn't add item" },
    );
  }, [draftCategory, draftName, draftNote, draftQuantity, draftUnit, enqueueNewItemAdd, exactActiveSuggestion]);

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
    const category = editCategory ?? suggestCategory(trimmed);
    const note = editNote.trim() ? editNote.trim() : null;

    setEditingItem(null);
    setInlineEditingItemId(null);

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
      onEdit={openEditItemSheet}
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
      <View className="bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
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
                icon="settings-outline"
                onPress={() => router.push(`/(app)/list-settings/${id}`)}
                color={isDark ? "#9ca3af" : "#4b5563"}
                size={20}
                className="p-1.5"
                accessibilityLabel="Open list settings"
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
      </View>

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
                  onPress={() => openAddItemTrayWithDefaults("", section.category)}
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
          onPress={() => openAddItemTrayWithDefaults("")}
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

        <Modal
          visible={showAddItemTray}
          transparent
          animationType="slide"
          onRequestClose={closeAddItemTray}
        >
          <RNKeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <Pressable className="flex-1 bg-black/40 justify-end" onPress={closeAddItemTray}>
              <Pressable
                className="bg-white dark:bg-gray-900 rounded-t-3xl h-[92%]"
                onPress={(event) => event.stopPropagation()}
              >
                <View className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                      {showAddDetails ? (
                        <Text className="text-xl font-bold text-gray-900 dark:text-gray-50">
                          Add Item
                        </Text>
                      ) : (
                        <AppTextInput
                          ref={addNameInputRef}
                          value={draftName}
                          onChangeText={setDraftName}
                          placeholder="Search or add item"
                          autoFocus={Platform.OS !== "android"}
                          onSubmitEditing={handleProceedToAddDetails}
                          returnKeyType="next"
                          testID="add-item-name-input"
                        />
                      )}
                    </View>
                    <Pressable
                      onPress={closeAddItemTray}
                      className="p-2"
                      accessibilityLabel="Close add item tray"
                      accessibilityRole="button"
                      testID="add-item-close"
                    >
                      <Ionicons name="close" size={24} color={isDark ? "#6b7280" : "#9ca3af"} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {!showAddDetails ? (
                    <View className="gap-3 min-h-full">
                      {draftName.trim() ? (
                        <View className="rounded-2xl border px-4 py-4 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <View className="flex-row items-center justify-between gap-3">
                            <TouchableOpacity
                              onPress={handleProceedToAddDetails}
                              activeOpacity={0.8}
                              className="flex-1"
                            >
                              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                                {draftName.trim()}
                              </Text>
                              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Press return or tap to continue with details
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={handleCreateTypedItem}
                              className="px-3 py-1.5 rounded-full"
                              style={{ backgroundColor: accent[50] }}
                            >
                              <Text className="text-xs font-semibold" style={{ color: accent[700] }}>
                                Create
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {addSuggestions.map((suggestion) => {
                        const categoryLabel = allCategories.find(
                          (category) => category.value === suggestion.category,
                        )?.label;
                        const meta =
                          suggestion.type === "completed_match"
                            ? formatSuggestionMeta(suggestion.quantity, suggestion.unit, categoryLabel, {
                                prefix: "Completed earlier",
                              })
                            : suggestion.type === "active_match"
                              ? formatSuggestionMeta(
                                  suggestion.quantity,
                                  suggestion.unit,
                                  categoryLabel,
                                  { prefix: "Already on this list" },
                                )
                              : formatSuggestionMeta(
                                  suggestion.quantity,
                                  suggestion.unit,
                                  categoryLabel,
                                );

                        return (
                          <View
                            key={suggestion.key}
                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
                          >
                            <View className="flex-row items-center justify-between gap-3">
                              <View className="flex-1">
                                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                                  {suggestion.name}
                                </Text>
                                {meta ? (
                                  <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {meta}
                                  </Text>
                                ) : null}
                              </View>

                              <TouchableOpacity
                                onPress={() => {
                                  void handleUseSuggestion(suggestion);
                                }}
                                className="px-3 py-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    suggestion.type === "completed_match" ? accent[500] : accent[50],
                                }}
                              >
                                <Text
                                  className={`text-xs font-semibold ${
                                    suggestion.type === "completed_match" ? "text-white" : ""
                                  }`}
                                  style={
                                    suggestion.type === "completed_match"
                                      ? undefined
                                      : { color: accent[700] }
                                  }
                                >
                                  {suggestion.type === "active_match"
                                    ? "Edit"
                                    : "Reuse"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <>
                      {exactActiveSuggestion ? (
                        <View className="mb-4">
                          <Text className="text-sm text-amber-600 dark:text-amber-400">
                            This item is already active on the list. Edit the existing item instead
                            of adding a duplicate.
                          </Text>
                        </View>
                      ) : null}

                      <ItemFormFields
                        name={draftName}
                        quantity={draftQuantity}
                        unit={draftUnit}
                        category={draftCategory}
                        note={draftNote}
                        showNoteField={showAddNoteField}
                        categoryOpen={addCategoryOpen}
                        allCategories={allCategories}
                        submitLabel={exactActiveSuggestion ? "Already on list" : "Add item"}
                        submitDisabled={!draftName.trim() || !!exactActiveSuggestion}
                        submitLoading={addSaving}
                        onNameChange={setDraftName}
                        onQuantityChange={setDraftQuantity}
                        onUnitChange={setDraftUnit}
                        onCategoryToggle={() => setAddCategoryOpen((current) => !current)}
                        onCategorySelect={(category) => {
                          setDraftCategory(category);
                          setAddCategoryOpen(false);
                        }}
                        onNoteChange={setDraftNote}
                        onShowNoteField={() => setShowAddNoteField(true)}
                        onSubmit={() => {
                          void handleSaveNewItem();
                        }}
                      />
                    </>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </RNKeyboardAvoidingView>
        </Modal>

        <BottomSheet
          visible={!!editingItem}
          onClose={() => {
            setEditingItem(null);
            setCategoryOpen(false);
          }}
          title="Edit Item"
        >
          <ItemFormFields
            name={editName}
            quantity={editQuantity}
            unit={editUnit}
            category={editCategory}
            note={editNote}
            showNoteField={showNoteField}
            categoryOpen={categoryOpen}
            allCategories={allCategories}
            submitLabel="Save changes"
            nameInputRef={editNameInputRef}
            nameAutoFocus
            onNameChange={setEditName}
            onQuantityChange={setEditQuantity}
            onUnitChange={setEditUnit}
            onCategoryToggle={() => setCategoryOpen((current) => !current)}
            onCategorySelect={(category) => {
              setEditCategory(category);
              setCategoryOpen(false);
            }}
            onNoteChange={setEditNote}
            onShowNoteField={() => setShowNoteField(true)}
            onSubmit={handleSaveEdit}
            footerAction={
              !!editingItem ? (
                <TouchableOpacity
                  onPress={() => handleDelete(editingItem)}
                  className="w-10 h-10 rounded-full items-center justify-center bg-red-100 dark:bg-red-900/30"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              ) : null
            }
          />
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
