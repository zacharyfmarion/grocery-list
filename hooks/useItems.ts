import { useEffect, useState, useMemo } from "react";
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

export function useItems(listId: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId || !user) {
      setItems([]);
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
        setItems(results);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to items:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [listId, user]);

  // Sort: unchecked first (by category then order/name), then checked
  const sortedItems = useMemo(() => {
    const unchecked = items.filter((i) => !i.checked);
    const checked = items.filter((i) => i.checked);
    return [...unchecked, ...checked];
  }, [items]);

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

  const toggleItem = async (itemId: string, currentChecked: boolean) => {
    await updateDoc(doc(db, "lists", listId, "items", itemId), {
      checked: !currentChecked,
      updatedAt: serverTimestamp(),
    });
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    await updateDoc(doc(db, "lists", listId, "items", itemId), {
      quantity,
      updatedAt: serverTimestamp(),
    });
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

    await updateDoc(doc(db, "lists", listId, "items", itemId), data);
  };

  const deleteItem = async (itemId: string) => {
    await deleteDoc(doc(db, "lists", listId, "items", itemId));
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
