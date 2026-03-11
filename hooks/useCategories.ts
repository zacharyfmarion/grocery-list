import { useMemo, useCallback } from "react";
import { usePreferences } from "./usePreferences";
import { CATEGORIES } from "@/lib/constants";
import { GroceryCategory } from "@/types";

export type CategoryInfo = {
  value: GroceryCategory;
  label: string;
  icon: string;
};

function orderCategories(
  baseCategories: CategoryInfo[],
  preferredOrder?: GroceryCategory[],
): CategoryInfo[] {
  if (!preferredOrder?.length) return baseCategories;

  const seen = new Set<GroceryCategory>();
  const mergedOrder = preferredOrder.filter((category) => {
    if (seen.has(category)) return false;
    seen.add(category);
    return true;
  });

  baseCategories.forEach((category) => {
    if (!seen.has(category.value)) {
      mergedOrder.push(category.value);
      seen.add(category.value);
    }
  });

  const orderIndex = new Map<GroceryCategory, number>();
  mergedOrder.forEach((category, index) => orderIndex.set(category, index));

  return [...baseCategories].sort((a, b) => {
    const ai = orderIndex.get(a.value) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.value) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

/**
 * Abstraction layer over categories.
 *
 * Currently backed by the hardcoded CATEGORIES list + user preferences
 * for visibility and ordering. Designed so that swapping to a Firestore-backed
 * category store later requires changes only in this file.
 */
export function useCategories(listId?: string) {
  const { preferences, loading, updatePreferences } = usePreferences();

  const hiddenSet = useMemo(
    () => new Set<GroceryCategory>(preferences.hiddenCategories ?? []),
    [preferences.hiddenCategories],
  );

  const listOrderOverride = useMemo(
    () => (listId ? preferences.listCategoryOrderOverrides?.[listId] : undefined),
    [listId, preferences.listCategoryOrderOverrides],
  );

  /**
   * All categories in user-preferred order.
   * Falls back to the default CATEGORIES order when no preference is saved.
   */
  const allCategories = useMemo<CategoryInfo[]>(() => {
    const globalOrder = preferences.categoryOrder;
    const baseOrder = orderCategories(CATEGORIES, globalOrder);
    return orderCategories(baseOrder, listOrderOverride);
  }, [listOrderOverride, preferences.categoryOrder]);

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

  /** Persist a new category display order for a single list. */
  const reorderCategoriesForList = useCallback(
    (targetListId: string, ordered: GroceryCategory[]) => {
      const currentOverrides = preferences.listCategoryOrderOverrides ?? {};
      updatePreferences({
        listCategoryOrderOverrides: {
          ...currentOverrides,
          [targetListId]: ordered,
        },
      });
    },
    [preferences.listCategoryOrderOverrides, updatePreferences],
  );

  /** Remove a list-specific category order override. */
  const clearListCategoryOrder = useCallback(
    (targetListId: string) => {
      const currentOverrides = { ...(preferences.listCategoryOrderOverrides ?? {}) };
      delete currentOverrides[targetListId];
      updatePreferences({ listCategoryOrderOverrides: currentOverrides });
    },
    [preferences.listCategoryOrderOverrides, updatePreferences],
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
    /** Set a new display order for a single list. */
    reorderCategoriesForList,
    /** Clear a list-specific category order override. */
    clearListCategoryOrder,
    /** Check whether a category is currently visible. */
    isCategoryVisible,
    /** Whether the current list is using its own order override. */
    hasListOrderOverride: !!(listId && listOrderOverride?.length),
    /** True while preferences are loading from Firestore. */
    loading,
  };
}
