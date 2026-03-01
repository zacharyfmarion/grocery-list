import { createMMKV } from "react-native-mmkv";
import type { Persistence } from "firebase/auth";

const storage = createMMKV({ id: "firebase-auth" });

/**
 * Firebase Auth persistence adapter backed by MMKV.
 *
 * Firebase's `initializeAuth` expects a class (it calls `new persistence()`),
 * so we export the class itself (not an instance). Firebase internally uses
 * `PersistenceInternal` methods (`_isAvailable`, `_set`, `_get`, `_remove`,
 * `_addListener`, `_removeListener`) which we implement here.
 */

const listeners = new Map<string, Set<(value: unknown) => void>>();

class MMKVPersistence {
  static type = "LOCAL" as const;
  readonly type = "LOCAL" as const;

  async _isAvailable(): Promise<boolean> {
    try {
      storage.set("__test__", "1");
      storage.remove("__test__");
      return true;
    } catch {
      return false;
    }
  }

  async _set(key: string, value: unknown): Promise<void> {
    const json = JSON.stringify(value);
    storage.set(key, json);
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((listener) => listener(value));
    }
  }

  async _get<T>(key: string): Promise<T | null> {
    const raw = storage.getString(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async _remove(key: string): Promise<void> {
    storage.remove(key);
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((listener) => listener(null));
    }
  }

  _addListener(key: string, listener: (value: unknown) => void): void {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key)!.add(listener);
  }

  _removeListener(key: string, listener: (value: unknown) => void): void {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(listener);
      if (keyListeners.size === 0) {
        listeners.delete(key);
      }
    }
  }
}

// Export the class cast as Persistence — Firebase will instantiate it internally
export const mmkvPersistence =
  MMKVPersistence as unknown as Persistence;
