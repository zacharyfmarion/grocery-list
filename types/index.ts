import { Timestamp } from "firebase/firestore";

export interface GroceryList {
  id: string;
  name: string;
  ownerUid: string;
  sharedWith: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GroceryCategory =
  | "produce"
  | "dairy"
  | "meat"
  | "seafood"
  | "deli"
  | "bakery"
  | "frozen"
  | "canned"
  | "pasta"
  | "condiments"
  | "spices"
  | "baking"
  | "beverages"
  | "alcohol"
  | "snacks"
  | "breakfast"
  | "health"
  | "baby"
  | "pet"
  | "household"
  | "cleaning"
  | "paper"
  | "other";

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: GroceryCategory;
  note?: string;
  checked: boolean;
  addedBy: string;
  order?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
}

export interface UserPreferences {
  sortOrder: "manual" | "alphabetical" | "category";
  hapticsEnabled: boolean;
  listOrder?: string[];
  hiddenCategories?: GroceryCategory[];
  categoryOrder?: GroceryCategory[];
}

export interface ItemHistoryEntry {
  name: string;
  quantity: number;
  unit?: string;
  category?: GroceryCategory;
  lastUsed: Timestamp;
  useCount: number;
}
