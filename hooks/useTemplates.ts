import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ListTemplate, TemplateItem, GroceryItem } from "@/types";

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const templatesRef = collection(db, "templates");
    const q = query(
      templatesRef,
      where("ownerUid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ListTemplate[];
        setTemplates(results);
        setLoading(false);
      },
      (error) => {
        console.warn("Templates not available:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const saveAsTemplate = useCallback(
    async (name: string, items: GroceryItem[]) => {
      if (!user) throw new Error("Not authenticated");

      const templateItems: TemplateItem[] = items
        .filter((i) => !i.checked)
        .map((i) => ({
          name: i.name,
          quantity: i.quantity,
          ...(i.unit && { unit: i.unit }),
          ...(i.category && { category: i.category }),
        }));

      await addDoc(collection(db, "templates"), {
        name,
        ownerUid: user.uid,
        items: templateItems,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    [user]
  );

  const deleteTemplate = useCallback(async (templateId: string) => {
    await deleteDoc(doc(db, "templates", templateId));
  }, []);

  return { templates, loading, saveAsTemplate, deleteTemplate };
}
