import { suggestCategory } from "../constants";

describe("suggestCategory", () => {
  describe("empty / whitespace input", () => {
    it("returns 'other' for empty string", () => {
      expect(suggestCategory("")).toBe("other");
    });

    it("returns 'other' for whitespace-only string", () => {
      expect(suggestCategory("   ")).toBe("other");
    });
  });

  describe("produce", () => {
    it.each([
      ["apple", "produce"],
      ["Banana", "produce"],
      ["CARROTS", "produce"],
      ["broccoli", "produce"],
      ["spinach", "produce"],
      ["avocado", "produce"],
      ["fresh basil", "produce"],
      ["organic kale", "produce"],
      ["red onion", "produce"],
      ["cherry tomatoes", "produce"],
      ["romaine lettuce", "produce"],
      ["brussels sprouts", "produce"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("dairy", () => {
    it.each([
      ["milk", "dairy"],
      ["Cheddar Cheese", "dairy"],
      ["Greek yogurt", "dairy"],
      ["eggs", "dairy"],
      ["butter", "dairy"],
      ["sour cream", "dairy"],
      ["cream cheese", "dairy"],
      ["oat milk", "dairy"],
      ["almond milk", "dairy"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("meat", () => {
    it.each([
      ["chicken", "meat"],
      ["Ground Beef", "meat"],
      ["bacon", "meat"],
      ["pork chop", "meat"],
      ["chicken breast", "meat"],
      ["lamb", "meat"],
      ["turkey", "meat"],
      ["bratwurst", "meat"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("seafood", () => {
    it.each([
      ["salmon", "seafood"],
      ["Shrimp", "seafood"],
      ["tuna", "seafood"],
      ["lobster", "seafood"],
      ["cod", "seafood"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("snacks", () => {
    it.each([
      ["chips", "snacks"],
      ["Pretzels", "snacks"],
      ["trail mix", "snacks"],
      ["cashew", "snacks"],
      ["almonds", "snacks"],
      ["pistachios", "snacks"],
      ["mixed nuts", "snacks"],
      ["granola bar", "snacks"],
      ["popcorn", "snacks"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("bakery", () => {
    it.each([
      ["bread", "bakery"],
      ["Bagels", "bakery"],
      ["sourdough", "bakery"],
      ["croissant", "bakery"],
      ["english muffin", "bakery"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("beverages", () => {
    it.each([
      ["orange juice", "beverages"],
      ["Coffee", "beverages"],
      ["sparkling water", "beverages"],
      ["green tea", "beverages"],
      ["kombucha", "beverages"],
      ["lemonade", "beverages"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("frozen", () => {
    it.each([
      ["frozen pizza", "frozen"],
      ["ice cream", "frozen"],
      ["frozen waffles", "frozen"],
      ["popsicle", "frozen"],
      ["edamame", "frozen"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("condiments", () => {
    it.each([
      ["ketchup", "condiments"],
      ["mustard", "condiments"],
      ["hot sauce", "condiments"],
      ["ranch dressing", "condiments"],
      ["soy sauce", "condiments"],
      ["salsa", "condiments"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("baking", () => {
    it.each([
      ["flour", "baking"],
      ["sugar", "baking"],
      ["vanilla extract", "baking"],
      ["baking powder", "baking"],
      ["chocolate chips", "snacks"],  // 'chips'/'chocolate' match snacks first
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("cleaning", () => {
    it.each([
      ["dish soap", "cleaning"],
      ["laundry detergent", "cleaning"],
      ["bleach", "cleaning"],
      ["sponge", "cleaning"],
      ["Lysol wipes", "cleaning"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("paper goods", () => {
    it.each([
      ["paper towel", "paper"],
      ["toilet paper", "paper"],
      ["trash bags", "paper"],
      ["aluminum foil", "paper"],
      ["ziplock bags", "paper"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("health & personal care", () => {
    it.each([
      ["toothpaste", "health"],
      ["shampoo", "health"],
      ["vitamins", "health"],
      ["sunscreen", "health"],
      ["deodorant", "health"],
      ["band-aid", "health"],
    ] as const)("categorizes '%s' as %s", (item, expected) => {
      expect(suggestCategory(item)).toBe(expected);
    });
  });

  describe("regression: ambiguous items categorized correctly", () => {
    it("categorizes 'roasted cashews' as snacks (not meat)", () => {
      expect(suggestCategory("roasted cashews")).toBe("snacks");
    });

    it("categorizes 'roasted almonds' as snacks (not meat)", () => {
      expect(suggestCategory("roasted almonds")).toBe("snacks");
    });

    it("categorizes 'pot roast' as meat", () => {
      expect(suggestCategory("pot roast")).toBe("meat");
    });
  });

  describe("case insensitivity", () => {
    it("handles all caps", () => {
      expect(suggestCategory("CHICKEN")).toBe("meat");
    });

    it("handles mixed case", () => {
      expect(suggestCategory("Almond Milk")).toBe("dairy");
    });

    it("handles title case", () => {
      expect(suggestCategory("Paper Towels")).toBe("paper");
    });
  });

  describe("plural handling", () => {
    it("handles simple plurals", () => {
      expect(suggestCategory("bananas")).toBe("produce");
    });

    it("handles -ies plurals", () => {
      expect(suggestCategory("cherries")).toBe("produce");
    });

    it("handles -es plurals", () => {
      expect(suggestCategory("tomatoes")).toBe("produce");
    });
  });

  describe("items with adjectives/modifiers", () => {
    it("categorizes 'organic chicken breast' as meat", () => {
      expect(suggestCategory("organic chicken breast")).toBe("meat");
    });

    it("categorizes 'low-fat yogurt' as dairy", () => {
      expect(suggestCategory("low-fat yogurt")).toBe("dairy");
    });

    it("categorizes 'whole wheat bread' as bakery", () => {
      expect(suggestCategory("whole wheat bread")).toBe("bakery");
    });
  });

  describe("unknown items", () => {
    it("returns 'other' for unrecognized items", () => {
      expect(suggestCategory("xylophone polish")).toBe("other");
    });

    it("returns 'other' for very obscure items", () => {
      expect(suggestCategory("unicorn tears")).toBe("other");
    });
  });
});
