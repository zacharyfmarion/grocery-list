import { dismissToast, showErrorToast, showUndoToast } from "@/lib/toast";

export type UndoKind = "toggle" | "delete" | "edit" | "create" | "reorder";

interface UndoEntry {
  id: string;
  kind: UndoKind;
  message: string;
  durationMs: number;
  resourceKey?: string;
  toastId?: string | number;
  status: "active" | "settled";
  undo: () => void | Promise<void>;
  commit?: () => void | Promise<void>;
}

interface RegisterUndoOptions {
  kind: UndoKind;
  message: string;
  durationMs?: number;
  resourceKey?: string;
  undo: () => void | Promise<void>;
  commit?: () => void | Promise<void>;
}

const DEFAULT_DURATION_MS = 4000;
const undoEntries = new Map<string, UndoEntry>();
const resourceToUndoId = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function createUndoId() {
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clearUndoTimer(id: string) {
  const timer = timers.get(id);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(id);
}

function cleanupUndoEntry(id: string) {
  const entry = undoEntries.get(id);
  if (!entry) return;

  clearUndoTimer(id);
  if (entry.toastId !== undefined) {
    dismissToast(entry.toastId);
  }
  if (entry.resourceKey) {
    const currentId = resourceToUndoId.get(entry.resourceKey);
    if (currentId === id) {
      resourceToUndoId.delete(entry.resourceKey);
    }
  }
  undoEntries.delete(id);
}

async function expireUndo(id: string) {
  const entry = undoEntries.get(id);
  if (!entry || entry.status !== "active") return;

  entry.status = "settled";
  clearUndoTimer(id);

  try {
    await entry.commit?.();
  } catch (error) {
    console.error("Undo commit failed:", error);
    showErrorToast("Couldn't complete action");
  } finally {
    cleanupUndoEntry(id);
  }
}

export function registerUndo({
  kind,
  message,
  durationMs = DEFAULT_DURATION_MS,
  resourceKey,
  undo,
  commit,
}: RegisterUndoOptions) {
  if (resourceKey) {
    const existingId = resourceToUndoId.get(resourceKey);
    if (existingId) {
      cleanupUndoEntry(existingId);
    }
  }

  const id = createUndoId();
  const entry: UndoEntry = {
    id,
    kind,
    message,
    durationMs,
    resourceKey,
    status: "active",
    undo,
    commit,
  };

  undoEntries.set(id, entry);
  if (resourceKey) {
    resourceToUndoId.set(resourceKey, id);
  }

  const toastId = showUndoToast({
    message,
    durationMs,
    onUndo: () => {
      void undoNow(id);
    },
  });

  entry.toastId = toastId;

  const timer = setTimeout(() => {
    void expireUndo(id);
  }, durationMs);
  timers.set(id, timer);

  return id;
}

export async function undoNow(id: string) {
  const entry = undoEntries.get(id);
  if (!entry || entry.status !== "active") {
    console.warn("Undo entry not available for execution:", { id });
    return;
  }

  entry.status = "settled";
  clearUndoTimer(id);

  try {
    await entry.undo();
  } catch (error) {
    console.error("Undo action failed:", error);
    showErrorToast("Couldn't undo action");
  } finally {
    cleanupUndoEntry(id);
  }
}

export function dismissUndo(id: string) {
  cleanupUndoEntry(id);
}
