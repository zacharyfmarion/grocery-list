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
  | "bakery"
  | "frozen"
  | "canned"
  | "beverages"
  | "snacks"
  | "household"
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
}

export interface ListTemplate {
  id: string;
  name: string;
  ownerUid: string;
  items: TemplateItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TemplateItem {
  name: string;
  quantity: number;
  unit?: string;
  category?: GroceryCategory;
}

export interface ItemHistoryEntry {
  name: string;
  quantity: number;
  unit?: string;
  category?: GroceryCategory;
  lastUsed: Timestamp;
  useCount: number;
}
