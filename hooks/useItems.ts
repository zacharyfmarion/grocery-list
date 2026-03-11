import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { GroceryItem, GroceryCategory } from "@/types";
import { suggestCategory } from "@/lib/constants";
import { showErrorToast, showUndoToast } from "@/lib/toast";

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
  const deleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!listId || !user) {
      setServerItems([]);
      setPendingUpdates({});
      setPendingDeletes({});
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
  }, [serverItems]);

  const renderedItems = useMemo(() => {
    return serverItems
      .filter((item) => !pendingDeletes[item.id])
      .map((item) => pendingUpdates[item.id]?.item ?? item);
  }, [pendingDeletes, pendingUpdates, serverItems]);

  // Sort: unchecked first (by category then order/name), then checked
  const sortedItems = useMemo(() => {
    const unchecked = renderedItems.filter((i) => !i.checked);
    const checked = renderedItems.filter((i) => i.checked);
    return [...unchecked, ...checked];
  }, [renderedItems]);

  const getRenderedItem = useCallback(
    (itemId: string) => renderedItems.find((item) => item.id === itemId),
    [renderedItems],
  );

  const addItem = async (params: string | AddItemParams) => {
    if (!user || !listId) throw new Error("Not authenticated");

    const input = typeof params === "string" ? { name: params } : params;
    const category = input.category ?? suggestCategory(input.name);

    await addDoc(collection(db, "lists", listId, "items"), {
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

    // Update list's updatedAt
    await updateDoc(doc(db, "lists", listId), {
      updatedAt: serverTimestamp(),
    });
  };

  const commitOptimisticUpdate = useCallback(
    (
      itemId: string,
      buildNextItem: (currentItem: GroceryItem) => GroceryItem,
      commit: () => Promise<void>,
      errorMessage: string,
    ) => {
      const currentItem = getRenderedItem(itemId);
      if (!currentItem) return;

      const mutationId = createMutationId();
      const nextItem = buildNextItem(currentItem);

      setPendingUpdates((prev) => ({
        ...prev,
        [itemId]: {
          mutationId,
          item: nextItem,
        },
      }));

      void (async () => {
        try {
          await commit();
        } catch (error) {
          console.error("Optimistic item update failed:", error);
          setPendingUpdates((prev) => {
            if (prev[itemId]?.mutationId !== mutationId) return prev;
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          showErrorToast(errorMessage);
        }
      })();
    },
    [getRenderedItem],
  );

  const toggleItem = async (itemId: string, currentChecked: boolean) => {
    await commitOptimisticUpdate(
      itemId,
      (currentItem) => ({
        ...currentItem,
        checked: !currentChecked,
      }),
      () =>
        updateDoc(doc(db, "lists", listId, "items", itemId), {
          checked: !currentChecked,
          updatedAt: serverTimestamp(),
        }),
      "Couldn't update item",
    );
  };

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

    showUndoToast({
      message: `Removed ${currentItem.name}`,
      onUndo: undoDelete,
      durationMs: DELETE_UNDO_MS,
    });

    deleteTimeoutsRef.current[itemId] = setTimeout(async () => {
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
      } finally {
        delete deleteTimeoutsRef.current[itemId];
      }
    }, DELETE_UNDO_MS);
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
    deleteItem,
    reorderItems,
    uncheckedCount,
    totalCount,
  };
}
