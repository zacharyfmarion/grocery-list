import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { MenuView } from "@react-native-menu/menu";
import { useLists } from "@/hooks/useLists";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { usePreferences } from "@/hooks/usePreferences";
import { reconcileListOrder } from "@/lib/listOrderUtils";
import { GroceryItem, GroceryList } from "@/types";
import { IconButton } from "@/components/ui/IconButton";
import * as Haptics from "expo-haptics";
import { FAB } from "@/components/ui/FAB";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { AppButton } from "@/components/ui/AppButton";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { suggestCategory } from "@/lib/constants";

export default function ListsScreen() {
  const { lists, loading, createList, deleteList, renameList, shareList } =
    useLists();
  const { user } = useAuth();
  const { accent } = useTheme();
  const { preferences, updatePreferences } = usePreferences();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const createInputRef = useRef<TextInput>(null);

  // On Android, autoFocus doesn't work inside a Modal. Focus manually after a short delay.
  useEffect(() => {
    if (showCreate && Platform.OS === 'android') {
      const timer = setTimeout(() => {
        createInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showCreate]);
  const [renameValue, setRenameValue] = useState("");

  const getInitials = (value?: string | null) => {
    if (!value) return "?";
    const parts = value.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const userLabel = user?.displayName || user?.email || "";

  // Compute display order: reconcile saved order with current list IDs
  const orderedLists = useMemo(() => {
    const savedOrder = preferences.listOrder ?? [];
    const currentIds = lists.map((l) => l.id);
    const reconciledOrder = reconcileListOrder(savedOrder, currentIds);
    const listMap = new Map(lists.map((l) => [l.id, l]));
    return reconciledOrder
      .map((id) => listMap.get(id)!)
      .filter(Boolean);
  }, [lists, preferences.listOrder]);

  useEffect(() => {
    setItemCounts((prev) => {
      const next: Record<string, number> = {};
      lists.forEach((list) => {
        next[list.id] = prev[list.id] ?? 0;
      });
      return next;
    });

    const unsubscribes = lists.map((list) =>
      onSnapshot(collection(db, "lists", list.id, "items"), (snapshot) => {
        setItemCounts((prev) => ({ ...prev, [list.id]: snapshot.size }));
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [lists]);

  const fetchListItems = async (listId: string) => {
    const itemsSnap = await getDocs(collection(db, "lists", listId, "items"));
    return itemsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as GroceryItem[];
  };

  const createListWithItems = async (
    name: string,
    items: GroceryItem[]
  ) => {
    if (!user) throw new Error("Not authenticated");

    const listDoc = await addDoc(collection(db, "lists"), {
      name,
      ownerUid: user.uid,
      sharedWith: [],
      members: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);
    items.forEach((item) => {
      const itemRef = doc(collection(db, "lists", listDoc.id, "items"));
      const category = item.category ?? suggestCategory(item.name);
      batch.set(itemRef, {
        name: item.name,
        quantity: item.quantity ?? 1,
        ...(item.unit && { unit: item.unit }),
        category,
        ...(item.note ? { note: item.note } : {}),
        checked: false,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return listDoc.id;
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      await createList(newListName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewListName("");
      setShowCreate(false);
    } catch {
      Alert.alert("Error", "Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = (list: GroceryList) => {
    Alert.alert(
      "Delete List",
      `Are you sure you want to delete "${list.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteList(list.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (e) {
              console.error('Failed to delete list:', e);
              Alert.alert("Error", "Failed to delete list");
            }
          },
        },
      ]
    );
  };

  const handleDuplicateList = async (list: GroceryList) => {
    try {
      const items = await fetchListItems(list.id);
      await createListWithItems(`${list.name} (copy)`, items);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to duplicate list");
    }
  };

  const handleShareList = (list: GroceryList) => {
    Alert.prompt(
      "Share List",
      "Enter the email of the person to share with:",
      async (email) => {
        if (!email?.trim()) return;
        try {
          await shareList(list.id, email.trim());
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Shared!", `List shared with ${email.trim()}`);
        } catch (e: unknown) {
          const message =
            e instanceof Error ? e.message : "Failed to share list";
          Alert.alert("Error", message);
        }
      },
      "plain-text"
    );
  };

  const handleStartRename = (list: GroceryList) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
  };

  const handleSubmitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await renameList(renamingId, renameValue.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to rename list");
    } finally {
      setRenamingId(null);
    }
  };

  // Auto-save rename when keyboard is dismissed
  useEffect(() => {
    if (!renamingId) return;
    // Wait for keyboard to open before listening for dismiss
    let sub: ReturnType<typeof Keyboard.addListener> | null = null;
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      showSub.remove();
      sub = Keyboard.addListener('keyboardDidHide', () => {
        handleSubmitRename();
      });
    });
    return () => {
      showSub.remove();
      sub?.remove();
    };
  }, [renamingId]);

  const handleReorder = ({ data }: { data: GroceryList[] }) => {
    const newOrder = data.map((l) => l.id);
    updatePreferences({ listOrder: newOrder });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderListItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<GroceryList>) => {
    const isRenaming = renamingId === item.id;

    return (
      <ScaleDecorator>
        <View className="relative">
          <TouchableOpacity
            testID={`list-item-${item.id}`}
            onPress={() => {
              if (!isRenaming) router.push(`/(app)/list/${item.id}`);
            }}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            disabled={isActive}
            activeOpacity={0.7}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-3 shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-10">
                {isRenaming ? (
                  <AppTextInput
                    value={renameValue}
                    onChangeText={setRenameValue}
                    autoFocus
                    onSubmitEditing={handleSubmitRename}
                    onBlur={handleSubmitRename}
                    returnKeyType="done"
                  />
                ) : (
                  <Text
                    className="text-lg font-semibold text-gray-900 dark:text-gray-50"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                )}
                <View className="flex-row items-center mt-1">
                  <Ionicons name="list-outline" size={14} color={accent[600]} />
                  <Text className="text-xs ml-1" style={{ color: accent[700] }}>
                    {itemCounts[item.id] ?? 0} items
                  </Text>
                </View>
                <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {item.sharedWith.length > 0 ? "Shared" : "Private"} ·{" "}
                  {item.updatedAt
                    ? `Updated ${new Date(item.updatedAt.toDate()).toLocaleDateString()}`
                    : "Just created"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View className="absolute top-4 right-4 z-10" style={{ elevation: 5 }}>
            <MenuView
              isAnchoredToRight
              themeVariant="dark"
              onPressAction={({ nativeEvent }) => {
                if (nativeEvent.event === "rename") handleStartRename(item);
                else if (nativeEvent.event === "duplicate") handleDuplicateList(item);
                else if (nativeEvent.event === "share") handleShareList(item);
                else if (nativeEvent.event === "delete") handleDeleteList(item);
              }}
              actions={[
                {
                  id: "rename",
                  title: "Rename",
                  image: "pencil",
                },
                {
                  id: "duplicate",
                  title: "Duplicate",
                  image: "doc.on.doc",
                },
                {
                  id: "share",
                  title: "Share",
                  image: "square.and.arrow.up",
                },
                ...(item.ownerUid === user?.uid
                  ? [
                      {
                        id: "delete",
                        title: "Delete",
                        attributes: { destructive: true } as const,
                        image: "trash",
                      },
                    ]
                  : []),
              ]}
            >
              <View className="p-2" hitSlop={8}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color="#9ca3af"
                />
              </View>
            </MenuView>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
        <ActivityIndicator size="large" color={accent[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={["top"]}>
      {/* Header */}
      <View className="px-4 pt-3 pb-2 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: accent[600] }}
          >
            <Text className="text-white text-sm font-semibold">
              {getInitials(userLabel)}
            </Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            My Lists
          </Text>
          <IconButton
            icon="settings-outline"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>
      <DraggableFlatList
        containerStyle={{ flex: 1 }}
        className="bg-gray-50 dark:bg-gray-950"
        data={orderedLists}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        onDragBegin={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        onDragEnd={handleReorder}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title="No lists yet"
            subtitle="Create your first grocery list to get started"
          />
        }
      />

      {/* FAB */}
      <FAB testID="create-list-fab" onPress={() => setShowCreate(true)} />

      {/* Create List Modal */}
      <BottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="New List"
      >
        <View>
          <AppTextInput
            ref={createInputRef}
            testID="new-list-name-input"
            placeholder="List name (e.g. Safeway, Costco)"
            value={newListName}
            onChangeText={setNewListName}
            autoFocus={Platform.OS === 'ios'}
            onSubmitEditing={handleCreateList}
            returnKeyType="done"
            className="mb-4"
          />
          <AppButton
            testID="create-list-submit"
            onPress={handleCreateList}
            disabled={creating || !newListName.trim()}
            loading={creating}
            title="Create List"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
