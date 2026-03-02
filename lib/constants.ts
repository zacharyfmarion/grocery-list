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
  { value: "seafood", label: "Seafood", icon: "fish-outline" },
  { value: "deli", label: "Deli", icon: "pizza-outline" },
  { value: "bakery", label: "Bakery", icon: "bread-slice" },
  { value: "frozen", label: "Frozen", icon: "snow-outline" },
  { value: "canned", label: "Canned Goods", icon: "cube-outline" },
  { value: "pasta", label: "Pasta & Grains", icon: "grid-outline" },
  { value: "condiments", label: "Condiments & Sauces", icon: "flask-outline" },
  { value: "spices", label: "Spices & Seasonings", icon: "flame-outline" },
  { value: "baking", label: "Baking", icon: "scale-outline" },
  { value: "beverages", label: "Beverages", icon: "cafe-outline" },
  { value: "alcohol", label: "Alcohol", icon: "wine-outline" },
  { value: "snacks", label: "Snacks", icon: "fast-food-outline" },
  { value: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { value: "health", label: "Health & Beauty", icon: "medkit-outline" },
  { value: "baby", label: "Baby", icon: "happy-outline" },
  { value: "pet", label: "Pet", icon: "paw-outline" },
  { value: "household", label: "Household", icon: "home-outline" },
  { value: "cleaning", label: "Cleaning", icon: "sparkles-outline" },
  { value: "paper", label: "Paper & Wrap", icon: "document-outline" },
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
    "pea", "zucchini", "squash", "sweet potato", "mango", "pineapple",
    "watermelon", "peach", "pear", "plum", "cherry", "ginger", "cilantro", "parsley",
    "basil", "mint", "fruit", "vegetable", "salad", "herb", "arugula", "cabbage",
    "cauliflower", "asparagus", "artichoke", "radish", "turnip", "beet", "fennel",
    "leek", "scallion", "green onion", "jalape\u00f1o", "habanero", "serrano",
    "bell pepper", "poblano", "eggplant", "okra", "brussels sprout",
    "snap pea", "snow pea", "bean sprout", "bok choy", "napa cabbage",
    "collard", "swiss chard", "watercress", "endive", "radicchio",
    "tangerine", "clementine", "grapefruit", "kiwi", "papaya", "guava",
    "pomegranate", "fig", "date", "coconut", "plantain", "passion fruit",
    "lychee", "dragon fruit", "persimmon", "nectarine", "apricot",
    "cantaloupe", "honeydew", "blackberry", "cranberry",
  ],
  dairy: [
    "milk", "cheese", "yogurt", "butter", "cream", "sour cream", "cottage cheese",
    "cream cheese", "mozzarella", "cheddar", "parmesan", "eggs", "egg", "whipping cream",
    "half and half", "ricotta", "gouda", "brie", "feta", "provolone",
    "swiss cheese", "goat cheese", "blue cheese", "gruyere", "mascarpone",
    "heavy cream", "whipped cream", "coffee creamer", "oat milk", "almond milk",
    "soy milk", "coconut milk", "eggnog", "kefir", "ghee",
  ],
  meat: [
    "chicken", "beef", "pork", "steak", "ground beef", "ground turkey", "turkey",
    "bacon", "sausage", "ham", "lamb", "hot dog", "meatball", "ribs",
    "brisket", "roast", "veal", "venison", "bison", "duck",
    "chicken breast", "chicken thigh", "chicken wing", "drumstick",
    "pork chop", "pork loin", "tenderloin", "ground pork", "chorizo",
    "prosciutto", "salami", "pepperoni", "bratwurst", "kielbasa",
  ],
  seafood: [
    "fish", "salmon", "tuna", "shrimp", "crab", "lobster", "scallop",
    "tilapia", "cod", "halibut", "mahi", "swordfish", "trout", "catfish",
    "sardine", "anchovy", "clam", "mussel", "oyster", "calamari", "squid",
    "octopus", "crawfish", "crayfish", "prawn",
  ],
  deli: [
    "deli", "cold cut", "lunch meat", "sliced turkey", "sliced ham",
    "roast beef", "pastrami", "corned beef", "bologna",
    "deli cheese", "olive bar", "hummus", "prepared",
  ],
  bakery: [
    "bread", "bagel", "muffin", "croissant", "roll", "bun", "tortilla", "pita",
    "cake", "pie", "cookie", "donut", "pastry", "baguette", "ciabatta",
    "sourdough", "rye bread", "pumpernickel", "english muffin", "naan",
    "flatbread", "brioche", "scone", "danish", "cinnamon roll",
    "hamburger bun", "hot dog bun", "dinner roll", "breadstick",
  ],
  frozen: [
    "frozen", "ice cream", "frozen pizza", "frozen vegetable", "frozen fruit",
    "frozen dinner", "popsicle", "waffle", "frozen meal", "tv dinner",
    "frozen burrito", "frozen fries", "frozen chicken", "ice pop",
    "gelato", "sorbet", "frozen yogurt", "frozen pie", "frozen fish",
    "frozen shrimp", "edamame",
  ],
  canned: [
    "canned", "can of", "soup", "broth", "stock", "tomato sauce", "pasta sauce",
    "beans", "chickpeas", "tuna can", "coconut milk", "diced tomato",
    "crushed tomato", "tomato paste", "tomato puree", "chili",
    "black beans", "kidney beans", "pinto beans", "lentils", "corn can",
    "green beans", "peas can", "baked beans", "refried beans",
    "artichoke hearts", "olives", "pickles", "sauerkraut", "applesauce",
    "canned fruit", "canned chicken", "spam", "corned beef hash",
  ],
  pasta: [
    "pasta", "spaghetti", "penne", "macaroni", "fettuccine", "linguine",
    "rigatoni", "fusilli", "farfalle", "orzo", "lasagna", "noodle",
    "ramen", "udon", "rice noodle", "egg noodle", "lo mein",
    "rice", "brown rice", "jasmine rice", "basmati rice", "wild rice",
    "quinoa", "couscous", "barley", "oats", "bulgur", "farro",
    "polenta", "grits", "cornmeal",
  ],
  condiments: [
    "ketchup", "mustard", "mayonnaise", "mayo", "relish", "hot sauce",
    "soy sauce", "worcestershire", "bbq sauce", "barbecue sauce",
    "salsa", "sriracha", "tabasco", "vinegar", "ranch", "dressing",
    "teriyaki", "hoisin", "fish sauce", "oyster sauce",
    "salad dressing", "marinade", "steak sauce", "tartar sauce",
    "pesto", "tahini", "chutney", "horseradish",
  ],
  spices: [
    "salt", "pepper", "cinnamon", "cumin", "paprika", "oregano", "thyme",
    "rosemary", "bay leaf", "chili powder", "cayenne", "turmeric",
    "nutmeg", "clove", "allspice", "cardamom", "coriander", "dill",
    "garlic powder", "onion powder", "italian seasoning", "taco seasoning",
    "curry powder", "garam masala", "five spice", "smoked paprika",
    "red pepper flake", "sesame seed", "poppy seed", "fennel seed",
    "mustard seed", "celery salt", "lemon pepper", "everything bagel",
    "old bay", "cajun seasoning", "dried parsley", "dried basil",
  ],
  baking: [
    "flour", "sugar", "brown sugar", "powdered sugar", "baking soda",
    "baking powder", "yeast", "vanilla extract", "cocoa powder",
    "chocolate chip", "sprinkles", "food coloring", "cornstarch",
    "cream of tartar", "gelatin", "shortening", "lard",
    "cake mix", "brownie mix", "frosting", "pie crust",
    "parchment paper", "cupcake liner", "molasses", "maple syrup",
    "honey", "agave", "confectioner",
  ],
  beverages: [
    "water", "juice", "soda", "coffee", "tea", "sparkling",
    "kombucha", "lemonade", "energy drink", "sports drink",
    "orange juice", "apple juice", "grape juice", "cranberry juice",
    "coconut water", "tonic", "ginger ale", "root beer",
    "iced tea", "green tea", "matcha", "chai", "espresso",
    "hot chocolate", "cider", "smoothie", "protein shake",
    "electrolyte", "gatorade", "la croix", "pellegrino",
  ],
  alcohol: [
    "beer", "wine", "liquor", "vodka", "whiskey", "rum", "gin",
    "tequila", "bourbon", "brandy", "champagne", "prosecco",
    "hard seltzer", "white claw", "truly",
    "sake", "mezcal", "cognac", "scotch", "vermouth",
    "red wine", "white wine", "ros\u00e9", "pinot", "cabernet",
    "merlot", "chardonnay", "ipa", "lager", "stout", "ale",
    "margarita mix", "mixer", "bitters",
  ],
  snacks: [
    "chips", "crackers", "pretzels", "popcorn", "nuts", "trail mix", "granola",
    "candy", "chocolate", "gummy", "jerky", "dried fruit",
    "cheese puff", "goldfish", "tortilla chips", "salsa chips",
    "rice cake", "fruit snack", "pudding", "jello",
    "sunflower seed", "pistachio", "almond", "cashew", "peanut",
    "walnut", "pecan", "macadamia", "mixed nuts",
    "granola bar", "protein bar", "energy bar", "snack bar",
    "oreo", "cheez-it", "peanut butter cup",
  ],
  breakfast: [
    "cereal", "oatmeal", "pancake mix", "waffle mix",
    "syrup", "jam", "jelly", "marmalade", "peanut butter",
    "almond butter", "nutella",
    "pop tart", "toaster strudel",
    "breakfast sausage", "breakfast burrito",
  ],
  health: [
    "vitamin", "supplement", "aspirin", "ibuprofen", "tylenol",
    "band-aid", "bandage", "first aid", "cough", "cold medicine",
    "allergy", "antacid", "tums", "pepto", "melatonin",
    "shampoo", "conditioner", "body wash", "soap bar", "lotion",
    "sunscreen", "deodorant", "toothpaste", "toothbrush", "floss",
    "mouthwash", "razor", "shaving cream", "cotton ball", "q-tip",
    "contact lens", "eye drops", "lip balm", "hand sanitizer",
    "face wash", "moisturizer", "hair gel", "hair spray",
  ],
  baby: [
    "diaper", "baby wipe", "formula", "baby food", "baby cereal",
    "pacifier", "baby bottle", "sippy cup", "bib",
    "baby lotion", "baby shampoo", "baby wash", "diaper cream",
    "baby powder", "teething", "nursing pad",
  ],
  pet: [
    "dog food", "cat food", "pet food", "kibble", "cat litter",
    "dog treat", "cat treat", "pet treat", "flea", "tick",
    "chew toy", "dog bone", "pet shampoo", "birdseed", "fish food",
    "rawhide", "poop bag", "puppy pad",
  ],
  household: [
    "light bulb", "battery", "extension cord", "tape", "glue",
    "candle", "air freshener", "match", "lighter",
    "storage bin", "hanger", "hook", "command strip",
    "trash can", "recycling", "vacuum bag", "furnace filter",
  ],
  cleaning: [
    "dish soap", "laundry", "detergent", "bleach", "cleaner",
    "disinfectant", "windex", "lysol", "clorox", "pine-sol",
    "sponge", "scrub brush", "mop", "broom", "dustpan",
    "rubber glove", "steel wool", "magic eraser",
    "all purpose cleaner", "glass cleaner", "oven cleaner",
    "drain cleaner", "toilet cleaner", "stain remover",
    "fabric softener", "dryer sheet", "tide pod",
  ],
  paper: [
    "paper towel", "toilet paper", "tissue", "napkin",
    "aluminum foil", "plastic wrap", "ziplock", "sandwich bag",
    "trash bag", "garbage bag", "freezer bag", "wax paper",
    "parchment", "cling wrap", "saran wrap",
    "paper plate", "paper cup", "plastic fork", "plastic spoon",
    "straw",
  ],
  other: [],
};

/**
 * Normalize a word to its base form for matching.
 * Handles common English plurals and suffixes.
 */
function normalize(word: string): string {
  // Remove trailing 's', 'es', 'ies' for basic plural handling
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 3) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function suggestCategory(itemName: string): GroceryCategory {
  const lower = itemName.toLowerCase().trim();
  if (!lower) return "other";

  const normalizedInput = normalize(lower);

  // Pass 1: Exact match — input equals a keyword or keyword equals input
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      if (lower === keyword || keyword === lower) {
        return category as GroceryCategory;
      }
    }
  }

  // Pass 2: Substring match — input contains keyword or keyword contains input
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        return category as GroceryCategory;
      }
    }
  }

  // Pass 3: Normalized/plural-tolerant matching
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      const normalizedKeyword = normalize(keyword);
      if (
        normalizedInput === normalizedKeyword ||
        normalizedInput.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalizedInput)
      ) {
        return category as GroceryCategory;
      }
    }
  }

  // Pass 4: Word-level matching — any word in the input matches a keyword
  const words = lower.split(/\s+/);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      for (const word of words) {
        const normalizedWord = normalize(word);
        const normalizedKeyword = normalize(keyword);
        if (normalizedWord === normalizedKeyword) {
          return category as GroceryCategory;
        }
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
  listOrder: [],
  hiddenCategories: [],
  categoryOrder: [],
};

// Need this import for the type
import { UserPreferences } from "@/types";
