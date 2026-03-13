import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { UserPreferences } from "@/types";
import { DEFAULT_PREFERENCES } from "@/lib/constants";

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "userPreferences", user.uid),
      async (snap) => {
        if (snap.exists()) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...snap.data() } as UserPreferences);
        } else {
          await setDoc(doc(db, "userPreferences", user.uid), DEFAULT_PREFERENCES);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to preferences:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user) return;

      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);

      try {
        await updateDoc(doc(db, "userPreferences", user.uid), updates);
      } catch {
        // If doc doesn't exist yet, create it
        await setDoc(doc(db, "userPreferences", user.uid), newPrefs);
      }
    },
    [user, preferences]
  );

  return { preferences, loading, updatePreferences };
}
