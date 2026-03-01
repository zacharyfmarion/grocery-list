import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { GroceryList } from "@/types";

export function useLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }

    // Listen to lists where user is owner or shared with
    const listsRef = collection(db, "lists");
    const q = query(
      listsRef,
      where("members", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: GroceryList[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GroceryList[];
        setLists(results);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to lists:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const createList = async (name: string) => {
    if (!user) throw new Error("Not authenticated");

    await addDoc(collection(db, "lists"), {
      name,
      ownerUid: user.uid,
      sharedWith: [],
      members: [user.uid], // Combined field for querying
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const deleteList = async (listId: string) => {
    // Delete all items in the list first
    const itemsRef = collection(db, "lists", listId, "items");
    const itemsSnap = await getDocs(itemsRef);
    const deletePromises = itemsSnap.docs.map((itemDoc) =>
      deleteDoc(doc(db, "lists", listId, "items", itemDoc.id))
    );
    await Promise.all(deletePromises);

    // Then delete the list
    await deleteDoc(doc(db, "lists", listId));
  };

  const renameList = async (listId: string, newName: string) => {
    await updateDoc(doc(db, "lists", listId), {
      name: newName,
      updatedAt: serverTimestamp(),
    });
  };

  const shareList = async (listId: string, email: string) => {
    // Look up user by email
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("email", "==", email.toLowerCase())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(
        "No account found with that email. They need to sign up first."
      );
    }

    const targetUser = snapshot.docs[0];
    const targetUid = targetUser.id;

    if (targetUid === user?.uid) {
      throw new Error("You can't share a list with yourself");
    }

    // Find the current list to get existing members
    const listDoc = lists.find((l) => l.id === listId);
    if (!listDoc) throw new Error("List not found");

    const newSharedWith = [...listDoc.sharedWith, targetUid];
    const newMembers = [listDoc.ownerUid, ...newSharedWith];

    await updateDoc(doc(db, "lists", listId), {
      sharedWith: newSharedWith,
      members: newMembers,
      updatedAt: serverTimestamp(),
    });
  };

  return { lists, loading, createList, deleteList, renameList, shareList };
}
