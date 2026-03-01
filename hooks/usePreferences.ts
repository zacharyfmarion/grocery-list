import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

    const fetchPreferences = async () => {
      try {
        const prefDoc = await getDoc(doc(db, "userPreferences", user.uid));
        if (prefDoc.exists()) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...prefDoc.data() } as UserPreferences);
        } else {
          // Create default preferences
          await setDoc(doc(db, "userPreferences", user.uid), DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
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
