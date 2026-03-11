import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { GroceryItem, GroceryCategory } from "@/types";
import { CATEGORY_LABEL_MAP, suggestCategory } from "@/lib/constants";
import { showErrorToast } from "@/lib/toast";
import { registerUndo } from "@/lib/undo";

interface AddItemParams {
  name: string;
  quantity?: number;
  unit?: string;
  category?: GroceryCategory;
  note?: string;
}

interface UpdateItemParams {
  name?: string;
  quantity?: number;
  unit?: string | null;
  category?: GroceryCategory;
  note?: string | null;
  order?: number;
}

interface PendingItemUpdate {
  mutationId: string;
  item: GroceryItem;
}

interface PendingDelete {
  mutationId: string;
  item: GroceryItem;
  status: "scheduled" | "committing";
}

interface PendingCreate {
  mutationId: string;
  item: GroceryItem;
}

const DELETE_UNDO_MS = 4000;

function createMutationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeValue(value?: string | null) {
  return value ?? "";
}

function areItemsEquivalent(serverItem: GroceryItem, optimisticItem: GroceryItem) {
  return (
    serverItem.name === optimisticItem.name &&
    serverItem.quantity === optimisticItem.quantity &&
    normalizeValue(serverItem.unit) === normalizeValue(optimisticItem.unit) &&
    normalizeValue(serverItem.note) === normalizeValue(optimisticItem.note) &&
    normalizeValue(serverItem.category) === normalizeValue(optimisticItem.category) &&
    serverItem.checked === optimisticItem.checked &&
    (serverItem.order ?? null) === (optimisticItem.order ?? null)
  );
}

export function useItems(listId: string) {
  const { user } = useAuth();
  const [serverItems, setServerItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, PendingItemUpdate>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, PendingDelete>>({});
  const [pendingCreates, setPendingCreates] = useState<Record<string, PendingCreate>>({});
  const deleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const renderedItemsRef = useRef<GroceryItem[]>([]);

  useEffect(() => {
    if (!listId || !user) {
      setServerItems([]);
      setPendingUpdates({});
      setPendingDeletes({});
      setPendingCreates({});
      setLoading(false);
      return;
    }

    const itemsRef = collection(db, "lists", listId, "items");
    const q = query(itemsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: GroceryItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as GroceryItem[];
        setServerItems(results);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to items:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId, user]);

  useEffect(() => {
    return () => {
      Object.values(deleteTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
      deleteTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    setPendingUpdates((prev) => {
      let changed = false;
      const next: Record<string, PendingItemUpdate> = {};

      Object.entries(prev).forEach(([itemId, pending]) => {
        const serverItem = serverItems.find((item) => item.id === itemId);
        if (!serverItem) {
          changed = true;
          return;
        }
        if (areItemsEquivalent(serverItem, pending.item)) {
          changed = true;
          return;
        }
        next[itemId] = pending;
      });

      return changed ? next : prev;
    });

    setPendingDeletes((prev) => {
      let changed = false;
      const next: Record<string, PendingDelete> = {};

      Object.entries(prev).forEach(([itemId, pending]) => {
        const stillExistsOnServer = serverItems.some((item) => item.id === itemId);
        if (!stillExistsOnServer) {
          changed = true;
          return;
        }
        next[itemId] = pending;
      });

      return changed ? next : prev;
    });

    setPendingCreates((prev) => {
      let changed = false;
      const next: Record<string, PendingCreate> = {};

      Object.entries(prev).forEach(([itemId, pending]) => {
        const existsOnServer = serverItems.some((item) => item.id === itemId);
        if (existsOnServer) {
          changed = true;
          return;
        }
        next[itemId] = pending;
      });

      return changed ? next : prev;
    });
  }, [serverItems]);

  const renderedItems = useMemo(() => {
    const optimisticCreates = Object.values(pendingCreates)
      .map((entry) => entry.item)
      .filter((item) => !pendingDeletes[item.id]);
    const dedupedItems = new Map<string, GroceryItem>();

    [...serverItems, ...optimisticCreates].forEach((item) => {
      if (!dedupedItems.has(item.id)) {
        dedupedItems.set(item.id, item);
      }
    });

    return Array.from(dedupedItems.values())
      .filter((item) => !pendingDeletes[item.id])
      .map((item) => pendingUpdates[item.id]?.item ?? item);
  }, [pendingCreates, pendingDeletes, pendingUpdates, serverItems]);

  useEffect(() => {
    renderedItemsRef.current = renderedItems;
  }, [renderedItems]);

  // Sort: unchecked first (by category then order/name), then checked
  const sortedItems = useMemo(() => {
    const unchecked = renderedItems.filter((i) => !i.checked);
    const checked = renderedItems.filter((i) => i.checked);
    return [...unchecked, ...checked];
  }, [renderedItems]);

  const getRenderedItem = useCallback(
    (itemId: string) => renderedItemsRef.current.find((item) => item.id === itemId),
    [],
  );

  const addItem = async (params: string | AddItemParams) => {
    if (!user || !listId) throw new Error("Not authenticated");

    const input = typeof params === "string" ? { name: params } : params;
    const category = input.category ?? suggestCategory(input.name);
    const itemsCollectionRef = collection(db, "lists", listId, "items");
    const itemRef = doc(itemsCollectionRef);
    const mutationId = createMutationId();
    const now = Timestamp.now();
    const optimisticItem: GroceryItem = {
      id: itemRef.id,
      name: input.name,
      quantity: input.quantity ?? 1,
      ...(input.unit ? { unit: input.unit } : {}),
      category,
      ...(input.note ? { note: input.note } : {}),
      checked: false,
      addedBy: user.uid,
      createdAt: now,
      updatedAt: now,
    };

    setPendingCreates((prev) => ({
      ...prev,
      [itemRef.id]: {
        mutationId,
        item: optimisticItem,
      },
    }));

    try {
      await setDoc(itemRef, {
        name: input.name,
        quantity: input.quantity ?? 1,
        ...(input.unit && { unit: input.unit }),
        category,
        ...(input.note && { note: input.note }),
        checked: false,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "lists", listId), {
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      setPendingCreates((prev) => {
        if (prev[itemRef.id]?.mutationId !== mutationId) return prev;
        const next = { ...prev };
        delete next[itemRef.id];
        return next;
      });
      showErrorToast("Couldn't add item");
      throw error;
    }

    registerUndo({
      kind: "create",
      message: `Added ${optimisticItem.name}`,
      resourceKey: `list:${listId}:item:${itemRef.id}:create`,
      undo: async () => {
        setPendingCreates((prev) => {
          const next = { ...prev };
          delete next[itemRef.id];
          return next;
        });
        await deleteDoc(doc(db, "lists", listId, "items", itemRef.id));
      },
    });

    return itemRef.id;
  };

  const commitOptimisticUpdate = useCallback(
    async (
      itemId: string,
      buildNextItem: (currentItem: GroceryItem) => GroceryItem,
      commit: () => Promise<void>,
      errorMessage: string,
    ) => {
      const currentItem = getRenderedItem(itemId);
      if (!currentItem) {
        const missingItemError = new Error(`Missing rendered item for optimistic update: ${itemId}`);
        console.error(missingItemError.message);
        throw missingItemError;
      }

      const mutationId = createMutationId();
      const nextItem = buildNextItem(currentItem);

      setPendingUpdates((prev) => ({
        ...prev,
        [itemId]: {
          mutationId,
          item: nextItem,
        },
      }));

      try {
        await commit();
      } catch (error) {
        console.error("Optimistic item update failed:", {
          itemId,
          mutationId,
          error,
        });
        setPendingUpdates((prev) => {
          if (prev[itemId]?.mutationId !== mutationId) return prev;
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        showErrorToast(errorMessage);
        throw error;
      }
    },
    [getRenderedItem],
  );

  const toggleItem = async (itemId: string, currentChecked: boolean) => {
    await setItemCheckedState(itemId, !currentChecked, {
      errorMessage: "Couldn't update item",
    });

    if (!currentChecked) {
      const currentItem = getRenderedItem(itemId);
      const itemName = currentItem?.name ?? "item";

      registerUndo({
        kind: "toggle",
        message: `Checked off ${itemName}`,
        resourceKey: `list:${listId}:item:${itemId}:toggle`,
        undo: async () => {
          await setItemCheckedState(itemId, false, {
            errorMessage: "Couldn't undo check off",
          });
        },
      });
    }
  };

  const setItemCheckedState = useCallback(
    async (
      itemId: string,
      nextChecked: boolean,
      options?: {
        errorMessage?: string;
      },
    ) => {
      await commitOptimisticUpdate(
        itemId,
        (currentItem) => ({
          ...currentItem,
          checked: nextChecked,
        }),
        () =>
          updateDoc(doc(db, "lists", listId, "items", itemId), {
            checked: nextChecked,
            updatedAt: serverTimestamp(),
          }),
        options?.errorMessage ?? "Couldn't update item",
      );
    },
    [commitOptimisticUpdate, listId],
  );

  const updateQuantity = async (itemId: string, quantity: number) => {
    await commitOptimisticUpdate(
      itemId,
      (currentItem) => ({
        ...currentItem,
        quantity,
      }),
      () =>
        updateDoc(doc(db, "lists", listId, "items", itemId), {
          quantity,
          updatedAt: serverTimestamp(),
        }),
      "Couldn't update item",
    );
  };

  const updateItem = async (itemId: string, updates: UpdateItemParams) => {
    const data: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) data.name = updates.name;
    if (updates.quantity !== undefined) data.quantity = updates.quantity;
    if (updates.unit !== undefined) data.unit = updates.unit === null ? "" : updates.unit;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.note !== undefined) data.note = updates.note === null ? "" : updates.note;
    if (updates.order !== undefined) data.order = updates.order;

    await commitOptimisticUpdate(
      itemId,
      (currentItem) => ({
        ...currentItem,
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
        ...(updates.unit !== undefined ? { unit: updates.unit ?? undefined } : {}),
        ...(updates.category !== undefined ? { category: updates.category } : {}),
        ...(updates.note !== undefined ? { note: updates.note ?? undefined } : {}),
        ...(updates.order !== undefined ? { order: updates.order } : {}),
      }),
      () => updateDoc(doc(db, "lists", listId, "items", itemId), data),
      updates.name !== undefined && Object.keys(updates).length === 1
        ? "Couldn't rename item"
        : "Couldn't save item",
    );
  };

  const moveItemToCategory = async (
    itemId: string,
    nextCategory: GroceryCategory,
    options?: { registerUndo?: boolean; errorMessage?: string },
  ) => {
    const currentItem = getRenderedItem(itemId);
    if (!currentItem) {
      const missingItemError = new Error(`Cannot move missing item: ${itemId}`);
      console.error(missingItemError.message);
      throw missingItemError;
    }

    const previousCategory = currentItem.category ?? "other";
    if (previousCategory === nextCategory) return;

    await commitOptimisticUpdate(
      itemId,
      (item) => ({
        ...item,
        category: nextCategory,
      }),
      () =>
        updateDoc(doc(db, "lists", listId, "items", itemId), {
          category: nextCategory,
          updatedAt: serverTimestamp(),
        }),
      options?.errorMessage ?? "Couldn't move item",
    );

    if (options?.registerUndo !== false) {
      registerUndo({
        kind: "edit",
        message: `Moved ${currentItem.name} to ${CATEGORY_LABEL_MAP[nextCategory]}`,
        resourceKey: `list:${listId}:item:${itemId}:category`,
        undo: async () => {
          await moveItemToCategory(itemId, previousCategory, {
            registerUndo: false,
            errorMessage: "Couldn't undo move",
          });
        },
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    const currentItem = getRenderedItem(itemId);
    if (!currentItem) return;

    const mutationId = createMutationId();

    const undoDelete = () => {
      const timeout = deleteTimeoutsRef.current[itemId];
      if (timeout) {
        clearTimeout(timeout);
        delete deleteTimeoutsRef.current[itemId];
      }

      setPendingDeletes((prev) => {
        if (prev[itemId]?.mutationId !== mutationId) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    };

    setPendingDeletes((prev) => ({
      ...prev,
      [itemId]: {
        mutationId,
        item: currentItem,
        status: "scheduled",
      },
    }));

    deleteTimeoutsRef.current[itemId] = setTimeout(() => {
      delete deleteTimeoutsRef.current[itemId];
    }, DELETE_UNDO_MS);

    registerUndo({
      kind: "delete",
      message: `Removed ${currentItem.name}`,
      durationMs: DELETE_UNDO_MS,
      resourceKey: `list:${listId}:item:${itemId}:delete`,
      undo: async () => {
        undoDelete();
      },
      commit: async () => {
        setPendingDeletes((prev) => {
          const pendingDelete = prev[itemId];
          if (!pendingDelete || pendingDelete.mutationId !== mutationId) return prev;

          return {
            ...prev,
            [itemId]: {
              ...pendingDelete,
              status: "committing",
            },
          };
        });

        try {
          await deleteDoc(doc(db, "lists", listId, "items", itemId));
        } catch (error) {
          console.error("Optimistic delete failed:", error);
          setPendingDeletes((prev) => {
            if (prev[itemId]?.mutationId !== mutationId) return prev;
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          showErrorToast("Couldn't delete item");
          throw error;
        } finally {
          delete deleteTimeoutsRef.current[itemId];
        }
      },
    });
  };

  const reorderItems = async (reorderedItems: GroceryItem[]) => {
    const batch = writeBatch(db);
    reorderedItems.forEach((item, index) => {
      const ref = doc(db, "lists", listId, "items", item.id);
      batch.update(ref, { order: index });
    });
    await batch.commit();
  };

  const uncheckedCount = sortedItems.filter((i) => !i.checked).length;
  const totalCount = sortedItems.length;

  return {
    items: sortedItems,
    loading,
    addItem,
    toggleItem,
    updateQuantity,
    updateItem,
    moveItemToCategory,
    deleteItem,
    reorderItems,
    uncheckedCount,
    totalCount,
  };
}
