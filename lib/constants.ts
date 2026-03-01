import { GroceryCategory } from "@/types";

export const UNITS = [
  { value: "each", label: "each" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
  { value: "can_14oz", label: "14oz can" },
  { value: "can_28oz", label: "28oz can" },
  { value: "gallon", label: "gallon" },
  { value: "liter", label: "liter" },
  { value: "bag", label: "bag" },
  { value: "bunch", label: "bunch" },
  { value: "dozen", label: "dozen" },
  { value: "box", label: "box" },
  { value: "pack", label: "pack" },
  { value: "bottle", label: "bottle" },
  { value: "jar", label: "jar" },
  { value: "cup", label: "cup" },
] as const;

export type UnitValue = (typeof UNITS)[number]["value"];

export const CATEGORIES: { value: GroceryCategory; label: string; icon: string }[] = [
  { value: "produce", label: "Produce", icon: "leaf-outline" },
  { value: "dairy", label: "Dairy", icon: "water-outline" },
  { value: "meat", label: "Meat", icon: "restaurant-outline" },
  { value: "bakery", label: "Bakery", icon: "bread-slice" },
  { value: "frozen", label: "Frozen", icon: "snow-outline" },
  { value: "canned", label: "Canned", icon: "cube-outline" },
  { value: "beverages", label: "Beverages", icon: "cafe-outline" },
  { value: "snacks", label: "Snacks", icon: "fast-food-outline" },
  { value: "household", label: "Household", icon: "home-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export const CATEGORY_LABEL_MAP: Record<GroceryCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
) as Record<GroceryCategory, string>;

// Keyword-to-category mapping for auto-suggest
const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  produce: [
    "apple", "banana", "orange", "lemon", "lime", "grape", "strawberry", "blueberry",
    "raspberry", "avocado", "tomato", "potato", "onion", "garlic", "carrot", "broccoli",
    "spinach", "lettuce", "kale", "cucumber", "pepper", "celery", "mushroom", "corn",
    "pea", "bean", "zucchini", "squash", "sweet potato", "mango", "pineapple",
    "watermelon", "peach", "pear", "plum", "cherry", "ginger", "cilantro", "parsley",
    "basil", "mint", "fruit", "vegetable", "salad", "herb",
  ],
  dairy: [
    "milk", "cheese", "yogurt", "butter", "cream", "sour cream", "cottage cheese",
    "cream cheese", "mozzarella", "cheddar", "parmesan", "eggs", "egg", "whipping cream",
    "half and half", "ice cream",
  ],
  meat: [
    "chicken", "beef", "pork", "steak", "ground beef", "ground turkey", "turkey",
    "bacon", "sausage", "ham", "lamb", "fish", "salmon", "tuna", "shrimp", "crab",
    "lobster", "deli", "hot dog", "meatball",
  ],
  bakery: [
    "bread", "bagel", "muffin", "croissant", "roll", "bun", "tortilla", "pita",
    "cake", "pie", "cookie", "donut", "pastry", "baguette",
  ],
  frozen: [
    "frozen", "ice cream", "pizza", "frozen vegetable", "frozen fruit",
    "frozen dinner", "popsicle", "waffle",
  ],
  canned: [
    "canned", "can of", "soup", "broth", "stock", "tomato sauce", "pasta sauce",
    "beans", "chickpeas", "tuna can", "coconut milk",
  ],
  beverages: [
    "water", "juice", "soda", "coffee", "tea", "beer", "wine", "sparkling",
    "kombucha", "lemonade", "energy drink", "sports drink",
  ],
  snacks: [
    "chips", "crackers", "pretzels", "popcorn", "nuts", "trail mix", "granola",
    "candy", "chocolate", "gummy", "jerky", "dried fruit",
  ],
  household: [
    "paper towel", "toilet paper", "soap", "dish soap", "laundry", "detergent",
    "sponge", "trash bag", "aluminum foil", "plastic wrap", "ziplock", "bleach",
    "cleaner", "tissue", "napkin", "battery", "light bulb",
  ],
  other: [],
};

export function suggestCategory(itemName: string): GroceryCategory {
  const lower = itemName.toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        return category as GroceryCategory;
      }
    }
  }
  return "other";
}

// Unit aliases for smart parsing
const UNIT_ALIASES: Record<string, string> = {
  each: "each",
  ea: "each",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  can: "can_14oz",
  cans: "can_14oz",
  gal: "gallon",
  gallon: "gallon",
  gallons: "gallon",
  l: "liter",
  liter: "liter",
  liters: "liter",
  bag: "bag",
  bags: "bag",
  bunch: "bunch",
  bunches: "bunch",
  dozen: "dozen",
  doz: "dozen",
  box: "box",
  boxes: "box",
  pack: "pack",
  packs: "pack",
  pk: "pack",
  bottle: "bottle",
  bottles: "bottle",
  jar: "jar",
  jars: "jar",
  cup: "cup",
  cups: "cup",
};

export interface ParsedItemInput {
  name: string;
  quantity: number;
  unit?: string;
}

/**
 * Parse item input like "2 cans tomatoes", "3 lb chicken", "bananas"
 * Returns { name, quantity, unit }
 */
export function parseItemInput(input: string): ParsedItemInput {
  const trimmed = input.trim();
  if (!trimmed) return { name: "", quantity: 1 };

  // Try to match: [number] [unit] [name]
  const match = trimmed.match(/^(\d+\.?\d*)\s+(\w+)\s+(.+)$/i);
  if (match) {
    const qty = parseFloat(match[1]);
    const possibleUnit = match[2].toLowerCase();
    const name = match[3];

    if (UNIT_ALIASES[possibleUnit]) {
      return {
        name,
        quantity: qty,
        unit: UNIT_ALIASES[possibleUnit],
      };
    }
    // Number but no valid unit — the "unit" word is part of the name
    return {
      name: `${match[2]} ${name}`,
      quantity: qty,
    };
  }

  // Try to match: [number] [name] (no unit)
  const numMatch = trimmed.match(/^(\d+\.?\d*)\s+(.+)$/i);
  if (numMatch) {
    return {
      name: numMatch[2],
      quantity: parseFloat(numMatch[1]),
    };
  }

  // Just a name
  return { name: trimmed, quantity: 1 };
}

export function formatQuantityUnit(quantity: number, unit?: string): string {
  if (!unit) return `${quantity}`;
  const unitDef = UNITS.find((u) => u.value === unit);
  const label = unitDef?.label ?? unit;
  return `${quantity} ${label}`;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  sortOrder: "category",
  hapticsEnabled: true,
};

// Need this import for the type
import { UserPreferences } from "@/types";
