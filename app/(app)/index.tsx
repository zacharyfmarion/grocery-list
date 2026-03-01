import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLists } from "@/hooks/useLists";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { GroceryItem, GroceryList, ListTemplate, TemplateItem } from "@/types";
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
  const { lists, loading, createList, deleteList } = useLists();
  const { templates, loading: templatesLoading, saveAsTemplate } = useTemplates();
  const { user } = useAuth();
  const { accent, isDark } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createTab, setCreateTab] = useState<"manual" | "template">("manual");
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [templateCreatingId, setTemplateCreatingId] = useState<string | null>(null);

  const getInitials = (value?: string | null) => {
    if (!value) return "?";
    const parts = value.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const userLabel = user?.displayName || user?.email || "";

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
    items: Array<GroceryItem | TemplateItem>
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
        ...("note" in item && item.note ? { note: item.note } : {}),
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

  const handleCreateFromTemplate = async (template: ListTemplate) => {
    if (!user) return;
    if (!template.name) return;

    setTemplateCreatingId(template.id);
    try {
      await createListWithItems(template.name, template.items);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setCreateTab("manual");
    } catch {
      Alert.alert("Error", "Failed to create list from template");
    } finally {
      setTemplateCreatingId(null);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("Error", "Failed to delete list");
            }
          },
        },
      ]
    );
  };

  const handleSaveAsTemplate = async (list: GroceryList) => {
    try {
      const items = await fetchListItems(list.id);
      await saveAsTemplate(list.name, items);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to save template");
    }
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

  const handleListActions = (list: GroceryList) => {
    Alert.alert(list.name, "Choose an action", [
      {
        text: "Delete List",
        style: "destructive",
        onPress: () => handleDeleteList(list),
      },
      { text: "Save as Template", onPress: () => handleSaveAsTemplate(list) },
      { text: "Duplicate List", onPress: () => handleDuplicateList(list) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderListItem = ({ item }: { item: GroceryList }) => (
    <TouchableOpacity
      testID={`list-item-${item.id}`}
      onPress={() => router.push(`/(app)/list/${item.id}`)}
      onLongPress={() => handleListActions(item)}
      activeOpacity={0.7}
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-3 shadow-sm"
    >
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50" numberOfLines={1}>
        {item.name}
      </Text>
      <View className="flex-row items-center mt-1">
        <Ionicons name="list-outline" size={14} color={accent[600]} />
        <Text
          className="text-xs ml-1"
          style={{ color: accent[700] }}
        >
          {itemCounts[item.id] ?? 0} items
        </Text>
      </View>
      <Text className="text-sm text-gray-400 dark:text-gray-500 mt-2">
        {item.sharedWith.length > 0 ? "Shared" : "Private"} ·{" "}
        {item.updatedAt
          ? `Updated ${new Date(item.updatedAt.toDate()).toLocaleDateString()}`
          : "Just created"}
      </Text>
    </TouchableOpacity>
  );

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
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">My Lists</Text>
          <IconButton
            icon="settings-outline"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>
      <FlatList
        className="flex-1 bg-gray-50 dark:bg-gray-950"
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
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
      <FAB
        testID="create-list-fab"
        onPress={() => setShowCreate(true)}
      />

      {/* Create List Modal */}
      <BottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="New List"
      >
        <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-4">
          <TouchableOpacity
            onPress={() => setCreateTab("manual")}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${
              createTab === "manual"
                ? "bg-white dark:bg-gray-600 shadow-sm"
                : ""
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold ${
                createTab === "manual"
                  ? "text-gray-900 dark:text-gray-50"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCreateTab("template")}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${
              createTab === "template"
                ? "bg-white dark:bg-gray-600 shadow-sm"
                : ""
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-sm font-semibold ${
                createTab === "template"
                  ? "text-gray-900 dark:text-gray-50"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              From Template
            </Text>
          </TouchableOpacity>
        </View>

        {createTab === "manual" ? (
          <View>
            <AppTextInput
              testID="new-list-name-input"
              placeholder="List name (e.g. Safeway, Costco)"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
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
        ) : (
          <View>
            {templatesLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color={accent[500]} />
              </View>
            ) : templates.length === 0 ? (
              <View className="py-6 items-center justify-center">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  No templates yet. Save one from a list.
                </Text>
              </View>
            ) : (
              <View>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 mb-3"
                    activeOpacity={0.7}
                    onPress={() => handleCreateFromTemplate(template)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
                          {template.name}
                        </Text>
                        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {template.items.length} items
                        </Text>
                      </View>
                      {templateCreatingId === template.id ? (
                        <ActivityIndicator size="small" color={accent[500]} />
                      ) : (
                        <Ionicons
                          name="sparkles-outline"
                          size={20}
                          color={accent[600]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}
