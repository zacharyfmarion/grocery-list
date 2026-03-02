/**
 * Reconcile a saved list order with the current set of list IDs.
 *
 * Handles:
 * - Deleted/unshared lists (filtered out of saved order)
 * - Newly created/shared lists (prepended so they appear at top)
 * - Duplicate IDs (deduped)
 */
export function reconcileListOrder(
  savedOrder: string[],
  currentListIds: string[]
): string[] {
  const currentSet = new Set(currentListIds);

  // Keep only IDs that still exist
  const validSaved = savedOrder.filter((id) => currentSet.has(id));

  // Find new IDs not in saved order
  const savedSet = new Set(validSaved);
  const newIds = currentListIds.filter((id) => !savedSet.has(id));

  // Prepend new lists (most recently encountered first), then saved order
  return [...new Set([...newIds, ...validSaved])];
}
