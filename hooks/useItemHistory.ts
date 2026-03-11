import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ItemHistoryEntry, GroceryCategory } from "@/types";

export function useItemHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ItemHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, "userHistory", user.uid, "items");
        const q = query(historyRef, orderBy("useCount", "desc"), limit(50));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((d) => ({
          ...d.data(),
        })) as ItemHistoryEntry[];
        setHistory(results);
      } catch (error) {
        console.error("Error fetching item history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const recordItemUsage = useCallback(
    async (item: {
      name: string;
      quantity: number;
      unit?: string;
      category?: GroceryCategory;
    }) => {
      if (!user) return;

      const docId = item.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const ref = doc(db, "userHistory", user.uid, "items", docId);

      try {
        await setDoc(
          ref,
          {
            name: item.name,
            quantity: item.quantity,
            ...(item.unit && { unit: item.unit }),
            ...(item.category && { category: item.category }),
            lastUsed: serverTimestamp(),
            useCount: increment(1),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Error recording item usage:", error);
      }
    },
    [user]
  );

  const getSuggestions = useCallback(
    (searchText: string): ItemHistoryEntry[] => {
      if (!searchText.trim()) return history.slice(0, 10);

      const lower = searchText.toLowerCase();
      return history
        .filter((item) => item.name.toLowerCase().includes(lower))
        .slice(0, 10);
    },
    [history]
  );

  return { history, loading, recordItemUsage, getSuggestions };
}
