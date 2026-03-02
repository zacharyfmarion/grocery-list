import { useMemo, useCallback } from "react";
import { usePreferences } from "./usePreferences";
import { CATEGORIES } from "@/lib/constants";
import { GroceryCategory } from "@/types";

export type CategoryInfo = {
  value: GroceryCategory;
  label: string;
  icon: string;
};

/**
 * Abstraction layer over categories.
 *
 * Currently backed by the hardcoded CATEGORIES list + user preferences
 * for visibility and ordering. Designed so that swapping to a Firestore-backed
 * category store later requires changes only in this file.
 */
export function useCategories() {
  const { preferences, loading, updatePreferences } = usePreferences();

  const hiddenSet = useMemo(
    () => new Set<GroceryCategory>(preferences.hiddenCategories ?? []),
    [preferences.hiddenCategories],
  );

  /**
   * All categories in user-preferred order.
   * Falls back to the default CATEGORIES order when no preference is saved.
   */
  const allCategories = useMemo<CategoryInfo[]>(() => {
    const order = preferences.categoryOrder;
    if (!order?.length) return CATEGORIES;

    // Build a lookup so we can sort by saved order
    const orderIndex = new Map<GroceryCategory, number>();
    order.forEach((cat, i) => orderIndex.set(cat, i));

    // Categories not in the saved order go to the end, keeping their default position
    return [...CATEGORIES].sort((a, b) => {
      const ai = orderIndex.get(a.value) ?? CATEGORIES.length + CATEGORIES.indexOf(a);
      const bi = orderIndex.get(b.value) ?? CATEGORIES.length + CATEGORIES.indexOf(b);
      return ai - bi;
    });
  }, [preferences.categoryOrder]);

  /** Only the categories the user hasn't hidden. */
  const visibleCategories = useMemo<CategoryInfo[]>(
    () => allCategories.filter((c) => !hiddenSet.has(c.value)),
    [allCategories, hiddenSet],
  );

  /** Toggle a single category's visibility. */
  const toggleCategory = useCallback(
    (category: GroceryCategory) => {
      const current = new Set(hiddenSet);
      if (current.has(category)) {
        current.delete(category);
      } else {
        // Don't allow hiding "other" — it's the catch-all
        if (category === "other") return;
        current.add(category);
      }
      updatePreferences({ hiddenCategories: Array.from(current) });
    },
    [hiddenSet, updatePreferences],
  );

  /** Persist a new category display order. */
  const reorderCategories = useCallback(
    (ordered: GroceryCategory[]) => {
      updatePreferences({ categoryOrder: ordered });
    },
    [updatePreferences],
  );

  /** Check if a specific category is visible. */
  const isCategoryVisible = useCallback(
    (category: GroceryCategory) => !hiddenSet.has(category),
    [hiddenSet],
  );

  return {
    /** All categories in user-preferred order (including hidden ones). */
    allCategories,
    /** Only visible categories in user-preferred order. */
    visibleCategories,
    /** Toggle a category between visible/hidden. */
    toggleCategory,
    /** Set a new display order for all categories. */
    reorderCategories,
    /** Check whether a category is currently visible. */
    isCategoryVisible,
    /** True while preferences are loading from Firestore. */
    loading,
  };
}
