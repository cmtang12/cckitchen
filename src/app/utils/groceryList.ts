// Turns raw recipe ingredients into a clean, combined grocery list.
//
// Each ingredient line ("1 tsp cinnamon", amount "2" + name "tablespoons soy sauce",
// "3 cloves garlic, minced") is parsed into { quantity, unit, name }. Lines with the
// same name are merged and their amounts added up, converting units where they're
// compatible: 1 tsp + 1 tsp = 2 tsp, 2 tbsp + 2 tbsp = 1/4 cup, 8 oz + 1 lb = 1 1/2 lb.

export type GroceryAisle =
  | "produce"
  | "meat"
  | "dairy"
  | "bakery"
  | "frozen"
  | "spices"
  | "pantry";

export const AISLE_ORDER: GroceryAisle[] = [
  "produce",
  "meat",
  "dairy",
  "bakery",
  "frozen",
  "pantry",
  "spices",
];

export const AISLE_NAMES: Record<string, string> = {
  produce: "Produce",
  meat: "Meat & Seafood",
  dairy: "Dairy & Eggs",
  bakery: "Bakery",
  frozen: "Frozen",
  pantry: "Pantry & Other",
  spices: "Spices & Seasonings",
};

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

type Dimension = "volume" | "weight" | "count";

interface UnitDef {
  dim: Dimension;
  /** Size in the dimension's base unit (tsp for volume, oz for weight). Count units use 1. */
  factor: number;
  /** Canonical name for count units ("clove", "can"). */
  canonical: string;
  metric?: boolean;
}

const UNIT_ALIASES: Array<[string[], UnitDef]> = [
  [["teaspoon", "teaspoons", "tsp", "tsps", "t"], { dim: "volume", factor: 1, canonical: "tsp" }],
  [["tablespoon", "tablespoons", "tbsp", "tbsps", "tbs", "tbl", "tb", "T"], { dim: "volume", factor: 3, canonical: "tbsp" }],
  [["cup", "cups", "c"], { dim: "volume", factor: 48, canonical: "cup" }],
  [["fluid ounce", "fluid ounces", "fl oz", "fl. oz"], { dim: "volume", factor: 6, canonical: "fl oz" }],
  [["pint", "pints", "pt"], { dim: "volume", factor: 96, canonical: "pint" }],
  [["quart", "quarts", "qt"], { dim: "volume", factor: 192, canonical: "quart" }],
  [["gallon", "gallons", "gal"], { dim: "volume", factor: 768, canonical: "gallon" }],
  [["milliliter", "milliliters", "millilitre", "millilitres", "ml"], { dim: "volume", factor: 0.202884, canonical: "ml", metric: true }],
  [["liter", "liters", "litre", "litres", "l"], { dim: "volume", factor: 202.884, canonical: "l", metric: true }],
  [["ounce", "ounces", "oz"], { dim: "weight", factor: 1, canonical: "oz" }],
  [["pound", "pounds", "lb", "lbs"], { dim: "weight", factor: 16, canonical: "lb" }],
  [["gram", "grams", "g", "gr"], { dim: "weight", factor: 0.035274, canonical: "g", metric: true }],
  [["kilogram", "kilograms", "kg"], { dim: "weight", factor: 35.274, canonical: "kg", metric: true }],
  // Things you count. Each sums only with itself.
  [["clove", "cloves"], { dim: "count", factor: 1, canonical: "clove" }],
  [["can", "cans", "tin", "tins"], { dim: "count", factor: 1, canonical: "can" }],
  [["jar", "jars"], { dim: "count", factor: 1, canonical: "jar" }],
  [["package", "packages", "pkg", "pkgs", "packet", "packets", "pack", "packs"], { dim: "count", factor: 1, canonical: "package" }],
  [["bag", "bags"], { dim: "count", factor: 1, canonical: "bag" }],
  [["box", "boxes"], { dim: "count", factor: 1, canonical: "box" }],
  [["bottle", "bottles"], { dim: "count", factor: 1, canonical: "bottle" }],
  [["bunch", "bunches"], { dim: "count", factor: 1, canonical: "bunch" }],
  [["head", "heads"], { dim: "count", factor: 1, canonical: "head" }],
  [["stalk", "stalks", "rib", "ribs"], { dim: "count", factor: 1, canonical: "stalk" }],
  [["sprig", "sprigs"], { dim: "count", factor: 1, canonical: "sprig" }],
  [["slice", "slices"], { dim: "count", factor: 1, canonical: "slice" }],
  [["piece", "pieces"], { dim: "count", factor: 1, canonical: "piece" }],
  [["fillet", "fillets", "filet", "filets"], { dim: "count", factor: 1, canonical: "fillet" }],
  [["stick", "sticks"], { dim: "count", factor: 1, canonical: "stick" }],
  [["pinch", "pinches"], { dim: "count", factor: 1, canonical: "pinch" }],
  [["dash", "dashes"], { dim: "count", factor: 1, canonical: "dash" }],
  [["handful", "handfuls"], { dim: "count", factor: 1, canonical: "handful" }],
];

const UNIT_LOOKUP = new Map<string, UnitDef>();
for (const [aliases, def] of UNIT_ALIASES) {
  for (const a of aliases) UNIT_LOOKUP.set(a, def);
}

// Longest aliases first so "fl oz" wins over "oz", "tablespoons" over "t".
const UNIT_PATTERN = Array.from(UNIT_LOOKUP.keys())
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/\./g, "\\.").replace(/ /g, "\\s+"))
  .join("|");

function lookupUnit(raw: string): UnitDef | undefined {
  const cleaned = raw.replace(/\.$/, "").replace(/\s+/g, " ");
  // "T" (capital) is tablespoon, "t" is teaspoon; everything else is case-insensitive.
  if (cleaned === "T") return UNIT_LOOKUP.get("T");
  return UNIT_LOOKUP.get(cleaned.toLowerCase());
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": " 1/2", "⅓": " 1/3", "⅔": " 2/3", "¼": " 1/4", "¾": " 3/4",
  "⅕": " 1/5", "⅖": " 2/5", "⅗": " 3/5", "⅘": " 4/5", "⅙": " 1/6",
  "⅚": " 5/6", "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8",
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5, dozen: 12,
};

function normalizeText(s: string): string {
  let out = s;
  for (const [f, rep] of Object.entries(UNICODE_FRACTIONS)) out = out.split(f).join(rep);
  return out.replace(/\u2044/g, "/").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

function parseNumber(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  if (/^\d+\s+\d+\/\d+$/.test(t)) {
    const [whole, frac] = t.split(/\s+/);
    const [n, d] = frac.split("/").map(Number);
    return d ? parseInt(whole, 10) + n / d : null;
  }
  if (/^\d+\/\d+$/.test(t)) {
    const [n, d] = t.split("/").map(Number);
    return d ? n / d : null;
  }
  if (/^\d*\.?\d+$/.test(t)) return parseFloat(t);
  const word = NUMBER_WORDS[t.toLowerCase()];
  return word ?? null;
}

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)`;
const QTY_RE = new RegExp(
  String.raw`^(${NUM})(?:\s*(?:-|to|or)\s*(${NUM}))?\s*`,
  "i"
);
const WORD_QTY_RE = /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|half|dozen)\b\s*/i;
const UNIT_RE = new RegExp(String.raw`^(${UNIT_PATTERN})\.?(?=\s|$|\)|,)\s*`);
const UNIT_RE_I = new RegExp(String.raw`^(${UNIT_PATTERN})\.?(?=\s|$|\)|,)\s*`, "i");

export interface ParsedLine {
  quantity: number | null;
  unit: UnitDef | null;
  /** The food itself, without amount, unit or prep notes. */
  name: string;
}

/**
 * Parses an ingredient from its saved amount and name. Either field may hold the
 * quantity and unit; recipes typed by hand often end up as amount "2" and name
 * "tablespoons soy sauce", or with everything in the name.
 */
export function parseIngredientLine(amount: string, name: string): ParsedLine {
  let text = normalizeText(`${amount || ""} ${name || ""}`);

  // Drop leading parenthetical sizes like "(14 oz)" that sit between quantity and unit,
  // but keep track of the main quantity first.
  let quantity: number | null = null;
  const q = text.match(QTY_RE);
  if (q) {
    const lo = parseNumber(q[1]);
    const hi = q[2] ? parseNumber(q[2]) : null;
    // For ranges like "2-3", shop for the larger amount.
    quantity = hi ?? lo;
    text = text.slice(q[0].length);
  } else {
    const w = text.match(WORD_QTY_RE);
    // "a pinch of salt", "two onions". Not "half and half" (that's the dairy item).
    if (w && !/^half\s+(and|&)\s+half/i.test(text)) {
      quantity = parseNumber(w[1]);
      text = text.slice(w[0].length);
    }
  }

  // "1 (14 oz) can tomatoes" -> skip the parenthetical size, the unit is "can".
  text = text.replace(/^\([^)]*\)\s*/, "");

  let unit: UnitDef | null = null;
  const u = text.match(UNIT_RE) || text.match(UNIT_RE_I);
  if (u) {
    const def = lookupUnit(u[1]);
    // Single-letter aliases (t, T, c, l, g) only count when a quantity came first,
    // so "l" in "lemon" or "c" in "cilantro" never gets eaten.
    if (def && (u[1].length > 1 || quantity !== null)) {
      unit = def;
      text = text.slice(u[0].length);
    }
  }

  text = text.replace(/^of\s+/i, "");
  const cleaned = cleanIngredientName(text);

  // "garlic cloves" / "eggs, large" etc. -> move trailing count words into the unit.
  let foodName = cleaned;
  const trailingUnit = foodName.match(/\s+(cloves?|stalks?|sprigs?|heads?|bunch(?:es)?|fillets?)$/i);
  if (trailingUnit && !unit) {
    const def = lookupUnit(trailingUnit[1]);
    if (def) {
      unit = def;
      foodName = foodName.slice(0, -trailingUnit[0].length);
    }
  }

  return { quantity, unit, name: foodName };
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

// Phrases that describe prep/serving instructions rather than the item itself.
const INSTRUCTION_PHRASES = [
  "or more to taste", "to taste", "for garnish", "for serving", "for topping", "as needed",
  "if desired", "optional", "divided", "plus more", "for drizzling", "for greasing",
  "for dusting", "at room temperature", "room temperature",
];

// Words that describe how the food is prepped or its size, not what to buy.
const PREP_WORDS = [
  "chopped", "finely", "roughly", "coarsely", "thinly", "thickly", "minced", "diced", "sliced",
  "grated", "shredded", "peeled", "seeded", "deseeded", "cubed", "halved",
  "quartered", "trimmed", "rinsed", "drained", "packed", "loosely", "lightly", "firmly",
  "softened", "melted", "beaten", "whisked", "sifted", "toasted", "cooked", "uncooked",
  "fresh", "freshly", "large", "medium", "small", "extra-large", "jumbo", "heaping", "level",
  "about", "approximately", "whole", "chilled",
];
const PREP_RE = new RegExp(`\\b(${PREP_WORDS.join("|")})\\b`, "gi");

/** Strip prep instructions, parentheticals and trailing commas from an ingredient name. */
export function cleanIngredientName(rawName: string): string {
  let name = normalizeText(rawName);
  name = name.replace(/\([^)]*\)/g, " ");
  // The food itself is almost always before the first comma or semicolon.
  name = name.split(/[,;]/)[0];
  for (const phrase of INSTRUCTION_PHRASES) {
    name = name.replace(new RegExp(`\\b${phrase}\\b`, "gi"), " ");
  }
  name = name.replace(PREP_RE, " ");
  // Trailing connectors left behind ("salt and", "pepper or").
  name = name.replace(/\b(and|or|to|of)\s*$/i, "");
  name = name.replace(/^\s*(and|or|of)\b/i, "");
  return name.replace(/[*•·]/g, " ").replace(/\s+/g, " ").trim();
}

function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.length <= 3) return lower;
  const keep = ["hummus", "couscous", "asparagus", "molasses", "swiss", "brussels", "grass", "glass", "cress", "lentils"];
  if (keep.includes(lower)) return lower === "lentils" ? "lentil" : lower;
  if (lower.endsWith("ies")) return lower.slice(0, -3) + "y";
  if (lower.endsWith("toes") || lower.endsWith("oes")) return lower.slice(0, -2);
  if (/(ches|shes|sses|xes|zes)$/.test(lower)) return lower.slice(0, -2);
  if (lower.endsWith("ves") && !lower.endsWith("cloves") && !lower.endsWith("olives")) return lower.slice(0, -3) + "f";
  if (lower.endsWith("s") && !lower.endsWith("ss") && !lower.endsWith("us")) return lower.slice(0, -1);
  return lower;
}

function pluralizeWord(word: string): string {
  if (/leaf$/i.test(word)) return word.slice(0, -1) + "ves";
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/(tomato|potato)$/i.test(word)) return word + "es";
  if (/(s|x|z|ch|sh)$/i.test(word)) return word.endsWith("s") ? word : word + "es";
  return word + "s";
}

// Different spellings of the same thing, applied to the normalized key.
const SYNONYMS: Record<string, string> = {
  "scallion": "green onion",
  "spring onion": "green onion",
  "coriander leaf": "cilantro",
  "garbanzo bean": "chickpea",
  "confectioners sugar": "powdered sugar",
  "icing sugar": "powdered sugar",
  "corn starch": "cornstarch",
  "extra virgin olive oil": "olive oil",
  "extra-virgin olive oil": "olive oil",
  "evoo": "olive oil",
  "kosher salt": "salt",
  "sea salt": "salt",
  "table salt": "salt",
  "fine salt": "salt",
  "ground black pepper": "black pepper",
  "black pepper": "black pepper",
  "pepper": "black pepper",
  "salt and pepper": "salt and pepper",
  "egg yolk": "egg",
  "egg white": "egg",
  "unsalted butter": "butter",
  "salted butter": "butter",
  "all purpose flour": "all-purpose flour",
  "ap flour": "all-purpose flour",
  "flour": "all-purpose flour",
  "granulated sugar": "sugar",
  "white sugar": "sugar",
  "cane sugar": "sugar",
  "garlic clove": "garlic",
  "ginger root": "ginger",
};

// Ground spices are what people mean by "cinnamon" or "cumin" in a shopping list.
const GROUND_SPICES = [
  "cinnamon", "cumin", "coriander", "nutmeg", "cloves", "allspice", "cardamom", "turmeric",
  "paprika", "cayenne", "mustard", "ginger", "black pepper", "white pepper", "fennel",
];

/** Normalized key used to merge the same ingredient across recipes ("Onions, diced" === "onion"). */
export function normalizeIngredientKey(rawName: string): string {
  const key = baseIngredientKey(rawName);
  return SYNONYMS[key] ?? key;
}

function baseIngredientKey(rawName: string): string {
  let cleaned = cleanIngredientName(rawName).toLowerCase().replace(/['’]/g, "");
  if (!cleaned) return "";
  // "ground cinnamon" and "cinnamon" are the same jar; "ground beef" is not beef.
  const groundMatch = cleaned.match(/^ground\s+(.+)$/);
  if (groundMatch && GROUND_SPICES.includes(groundMatch[1].replace(/s$/, "")) ) {
    cleaned = groundMatch[1] === "ginger" ? "ground ginger" : groundMatch[1];
  }
  const words = cleaned.split(" ").filter(Boolean);
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(" ");
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Display name for a merged item. Pluralizes the head noun when showing a plain count above 1. */
export function formatDisplayName(rawName: string, plural: boolean): string {
  const cleaned = cleanIngredientName(rawName) || rawName.trim();
  if (!plural) return capitalize(cleaned);
  const words = cleaned.split(" ");
  const last = words[words.length - 1];
  if (!/s$/i.test(last)) words[words.length - 1] = pluralizeWord(last);
  return capitalize(words.join(" "));
}

// ---------------------------------------------------------------------------
// Adding amounts together
// ---------------------------------------------------------------------------

export interface AmountTotals {
  volumeTsp: number;
  volumeMetricOnly: boolean;
  weightOz: number;
  weightMetricOnly: boolean;
  /** Plain counts ("2 onions") */
  each: number;
  /** Counted units ("3 cloves", "1 can") keyed by canonical unit */
  counted: Record<string, number>;
  /** True when at least one line had no usable quantity ("salt to taste") */
  hasUnmeasured: boolean;
}

export function sumAmounts(lines: ParsedLine[]): AmountTotals {
  const totals: AmountTotals = {
    volumeTsp: 0,
    volumeMetricOnly: true,
    weightOz: 0,
    weightMetricOnly: true,
    each: 0,
    counted: {},
    hasUnmeasured: false,
  };
  let sawVolume = false;
  let sawWeight = false;
  for (const line of lines) {
    if (line.quantity === null || line.quantity <= 0) {
      if (line.unit && line.unit.dim === "count") {
        // "a pinch" with no number
        totals.counted[line.unit.canonical] = (totals.counted[line.unit.canonical] || 0) + 1;
      } else {
        totals.hasUnmeasured = true;
      }
      continue;
    }
    if (!line.unit) {
      totals.each += line.quantity;
    } else if (line.unit.dim === "volume") {
      totals.volumeTsp += line.quantity * line.unit.factor;
      sawVolume = true;
      if (!line.unit.metric) totals.volumeMetricOnly = false;
    } else if (line.unit.dim === "weight") {
      totals.weightOz += line.quantity * line.unit.factor;
      sawWeight = true;
      if (!line.unit.metric) totals.weightMetricOnly = false;
    } else {
      totals.counted[line.unit.canonical] = (totals.counted[line.unit.canonical] || 0) + line.quantity;
    }
  }
  if (!sawVolume) totals.volumeMetricOnly = false;
  if (!sawWeight) totals.weightMetricOnly = false;
  return totals;
}

const FRACTIONS: Array<[number, string]> = [
  [0, ""], [1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [3 / 8, "3/8"], [1 / 2, "1/2"],
  [5 / 8, "5/8"], [2 / 3, "2/3"], [3 / 4, "3/4"], [7 / 8, "7/8"], [1, ""],
];

/** 1.5 -> "1 1/2", 0.333 -> "1/3", 2 -> "2". */
export function formatQuantity(value: number): string {
  if (value >= 10) return String(Math.round(value));
  let whole = Math.floor(value);
  const frac = value - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) {
    if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  }
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  if (whole === 0 && !best[1]) return value > 0 ? "1/8" : "0";
  if (!best[1]) return String(whole);
  return whole === 0 ? best[1] : `${whole} ${best[1]}`;
}

function plural(unit: string, qty: number): string {
  if (qty <= 1) return unit;
  if (["tsp", "tbsp", "oz", "fl oz", "lb", "g", "kg", "ml", "l"].includes(unit)) return unit;
  if (unit === "bunch" || unit === "box" || unit === "dash" || unit === "pinch") return unit + "es";
  return unit + "s";
}

function formatVolume(tsp: number, metric: boolean): string {
  if (metric) {
    const ml = tsp / 0.202884;
    return ml >= 1000 ? `${formatQuantity(ml / 1000)} l` : `${Math.round(ml)} ml`;
  }
  // Pick the unit a person would measure with.
  if (tsp < 3 - 1e-6) return `${formatQuantity(tsp)} tsp`;
  if (tsp < 12 - 1e-6) {
    const tbsp = tsp / 3;
    const rounded = Math.round(tbsp * 2) / 2;
    // If tablespoons don't land on a clean half, show "tbsp + tsp" instead of an odd fraction.
    if (Math.abs(rounded - tbsp) < 0.05) return `${formatQuantity(rounded)} tbsp`;
    const wholeTbsp = Math.floor(tbsp);
    const restTsp = tsp - wholeTbsp * 3;
    return `${wholeTbsp} tbsp + ${formatQuantity(restTsp)} tsp`;
  }
  const cups = tsp / 48;
  return `${formatQuantity(cups)} ${plural("cup", cups)}`;
}

function formatWeight(oz: number, metric: boolean): string {
  if (metric) {
    const g = oz / 0.035274;
    return g >= 1000 ? `${formatQuantity(g / 1000)} kg` : `${Math.round(g)} g`;
  }
  if (oz < 16) return `${formatQuantity(oz)} oz`;
  return `${formatQuantity(oz / 16)} lb`;
}

/**
 * Human-readable total for a merged item, e.g. "2 tsp", "1 1/2 lb", "3", "1 cup + 2".
 * Returns "" when there's nothing countable (only "to taste" lines).
 */
export function formatTotals(t: AmountTotals): string {
  const parts: string[] = [];
  if (t.weightOz > 0) parts.push(formatWeight(t.weightOz, t.weightMetricOnly));
  if (t.volumeTsp > 0) parts.push(formatVolume(t.volumeTsp, t.volumeMetricOnly));
  for (const [unit, qty] of Object.entries(t.counted)) {
    parts.push(`${formatQuantity(qty)} ${plural(unit, qty)}`);
  }
  if (t.each > 0) parts.push(formatQuantity(Math.ceil(t.each * 4) / 4));
  return parts.join(" + ");
}

// ---------------------------------------------------------------------------
// Aisles
// ---------------------------------------------------------------------------

// Ordered rules: the first match wins. Every pattern matches whole words only,
// so "salt" never matches "unsalted", "egg" never matches "eggplant",
// and "sage" never matches "sausage".
const AISLE_RULES: Array<[GroceryAisle, string[]]> = [
  ["frozen", ["frozen", "ice cream", "sorbet", "gelato", "ice"]],
  ["spices", ["red pepper flakes", "crushed red pepper", "pepper flakes", "chili flakes"]],
  // Things that contain a fresh-food word but live on a shelf.
  ["pantry", [
    "broth", "stock", "bouillon", "oil", "vinegar", "paste", "sauce", "salsa", "ketchup",
    "mayonnaise", "mayo", "mustard", "sriracha", "gochujang", "miso", "hoisin", "dressing",
    "canned", "can", "tinned", "coconut milk", "coconut cream", "evaporated milk", "condensed milk",
    "peanut butter", "almond butter", "nut butter", "tahini", "jam", "jelly", "honey", "syrup",
    "maple syrup", "molasses", "baking soda", "baking powder", "yeast", "cornstarch", "flour",
    "sugar", "brown sugar", "powdered sugar", "cocoa", "chocolate", "chocolate chips",
    "rice", "pasta", "spaghetti", "penne", "macaroni", "noodle", "ramen", "udon", "quinoa",
    "couscous", "oats", "oat", "oatmeal", "cereal", "breadcrumb", "bread crumb", "panko",
    "cracker", "chip", "lentil", "chickpea", "black bean", "kidney bean", "pinto bean",
    "cannellini bean", "white bean", "navy bean", "refried bean", "almond", "walnut", "pecan",
    "cashew", "peanut", "pistachio", "pine nut", "sesame seed", "chia seed", "flax", "raisin",
    "dried cranberry", "dates", "wine", "beer", "sake", "mirin", "coffee", "tea", "matcha",
    "gelatin", "sprinkles", "nori", "seaweed", "olive", "pickle", "capers", "sun-dried tomato",
    "water chestnut", "bamboo shoot", "tomato puree", "crushed tomato", "soup", "applesauce",
  ]],
  // Fresh herbs and fresh chilies that share a name with a spice.
  ["produce", [
    "bell pepper", "red bell pepper", "green bell pepper", "sweet pepper", "jalapeno", "jalapeño",
    "serrano", "poblano", "habanero", "anaheim", "shishito", "thai chili", "fresh chili",
    "fresh ginger", "ginger root", "fresh basil", "fresh thyme", "fresh rosemary",
    "fresh oregano", "fresh dill", "fresh parsley", "fresh sage", "fresh mint",
    "red pepper", "green pepper", "yellow pepper", "orange pepper",
  ]],
  ["spices", [
    "garlic powder", "onion powder", "ginger powder", "ground ginger", "chili powder",
    "curry powder", "five spice", "garam masala", "italian seasoning", "seasoning", "spice",
    "salt", "pepper", "peppercorn", "pepper flakes", "red pepper flakes", "chili flakes",
    "cinnamon", "nutmeg", "cumin", "coriander", "paprika", "smoked paprika", "turmeric",
    "cayenne", "cloves", "allspice", "cardamom", "star anise", "fennel seed", "mustard seed",
    "oregano", "bay leaf", "bay leaves", "dried", "vanilla", "vanilla extract", "extract",
    "msg", "sesame seeds", "everything bagel",
  ]],
  ["meat", [
    "chicken", "beef", "pork", "turkey", "lamb", "duck", "veal", "bacon", "sausage", "ham",
    "prosciutto", "pancetta", "chorizo", "salami", "pepperoni", "steak", "brisket", "ribs",
    "short rib", "meatball", "ground meat", "mince", "thigh", "drumstick", "wing", "tenderloin",
    "sirloin", "ribeye", "chuck", "shrimp", "prawn", "salmon", "tuna", "cod", "tilapia",
    "halibut", "fish", "scallop", "crab", "lobster", "clam", "mussel", "squid", "anchovy",
  ]],
  ["dairy", [
    "milk", "cheese", "cheddar", "mozzarella", "parmesan", "parmigiano", "pecorino", "feta",
    "ricotta", "gouda", "brie", "gruyere", "provolone", "monterey jack", "cream cheese",
    "butter", "ghee", "cream", "heavy cream", "whipping cream", "half and half", "sour cream",
    "creme fraiche", "yogurt", "buttermilk", "egg", "eggs", "almond milk", "oat milk",
  ]],
  ["bakery", [
    "bread", "baguette", "bun", "roll", "tortilla", "pita", "naan", "bagel", "croissant",
    "english muffin", "brioche", "ciabatta", "sourdough", "flatbread", "wrap",
  ]],
  ["produce", [
    "onion", "shallot", "leek", "tomato", "lettuce", "romaine", "arugula", "spinach", "kale",
    "chard", "cabbage", "bok choy", "carrot", "celery", "potato", "sweet potato", "yam",
    "broccoli", "broccolini", "cauliflower", "cucumber", "zucchini", "squash", "pumpkin",
    "eggplant", "mushroom", "corn", "pea", "snap pea", "snow pea", "green bean", "edamame",
    "asparagus", "artichoke", "beet", "radish", "turnip", "parsnip", "fennel", "okra",
    "sprout", "bean sprout", "avocado", "lemon", "lime", "orange", "grapefruit", "apple",
    "pear", "banana", "berry", "strawberry", "blueberry", "raspberry", "blackberry",
    "grape", "cherry", "peach", "plum", "mango", "pineapple", "kiwi", "melon", "watermelon",
    "pomegranate", "fig", "garlic", "ginger", "lemongrass", "basil", "thyme", "rosemary", "parsley",
    "cilantro", "dill", "mint", "sage", "chive", "tarragon", "herb", "chili", "chile",
    "lettuce", "greens", "salad", "microgreen", "jicama", "plantain", "tofu", "tempeh",
  ]],
];

function phraseRegex(phrase: string): RegExp {
  // Keys are singular ("red pepper flake"), so match the singular form plus an optional plural.
  const words = phrase.split(" ");
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  const escaped = words.join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(^|[^a-z])${escaped}(e?s)?($|[^a-z])`, "i");
}

const COMPILED_RULES: Array<[GroceryAisle, RegExp[]]> = AISLE_RULES.map(([aisle, phrases]) => [
  aisle,
  phrases.map(phraseRegex),
]);

const HERBS = ["basil", "thyme", "rosemary", "dill", "sage", "mint", "parsley", "tarragon", "chive"];

/**
 * Picks a store aisle for an ingredient. `lines` lets measured herbs go to the
 * right place: "1 tsp thyme" is the dried jar, "2 sprigs thyme" is fresh.
 */
export function categorizeIngredient(name: string, lines: ParsedLine[] = [], fallback?: string): GroceryAisle {
  const lower = normalizeText(name).toLowerCase().replace(/['’]/g, "");

  // Measured-by-spoon herbs with no "fresh" are almost always the dried jar.
  const head = lower.split(" ").pop() || "";
  if (HERBS.some((h) => head.startsWith(h)) && !/\bfresh\b/.test(lower)) {
    const spoonOnly = lines.length > 0 && lines.every(
      (l) => l.unit && l.unit.dim === "volume" && l.unit.factor <= 3
    );
    if (spoonOnly) return "spices";
  }

  // Anything bought by the can or jar lives on a shelf ("1 can diced tomatoes").
  if (lines.length > 0 && lines.every((l) => l.unit && ["can", "jar"].includes(l.unit.canonical))) {
    return "pantry";
  }

  for (const [aisle, patterns] of COMPILED_RULES) {
    if (patterns.some((re) => re.test(lower))) return aisle;
  }

  const valid: string[] = ["produce", "meat", "dairy", "bakery", "frozen", "spices", "pantry"];
  if (fallback && valid.includes(fallback)) return fallback as GroceryAisle;
  return "pantry";
}

// ---------------------------------------------------------------------------
// Building the list
// ---------------------------------------------------------------------------

export interface SourceIngredient {
  name: string;
  amount: string;
  category?: string;
  recipeId: string;
  recipeName: string;
}

export interface MergedGroceryItem {
  key: string;
  name: string;
  /** Combined amount to buy, e.g. "2 tsp" or "3". Empty when nothing is measurable. */
  amount: string;
  category: GroceryAisle;
  lines: Array<{ amount: string; recipeId: string }>;
  recipeNames: string[];
}

// Nobody shops for tap water.
const SKIP_KEYS = new Set([
  "water", "cold water", "warm water", "hot water", "ice water", "boiling water",
  "lukewarm water", "tap water", "filtered water",
]);

/** Merges every ingredient across a plan's recipes into one list item per food. */
export function buildGroceryItems(ingredients: SourceIngredient[]): MergedGroceryItem[] {
  interface Group {
    displayName: string;
    parsed: ParsedLine[];
    lines: Array<{ amount: string; recipeId: string }>;
    recipeNames: string[];
    fallback?: string;
  }
  const groups = new Map<string, Group>();

  for (const ing of ingredients) {
    const parsed = parseIngredientLine(ing.amount || "", ing.name || "");
    const baseName = parsed.name || cleanIngredientName(ing.name) || (ing.name || "").trim();
    const key = normalizeIngredientKey(baseName);
    if (!key || SKIP_KEYS.has(key)) continue;

    let group = groups.get(key);
    if (!group) {
      group = { displayName: baseName, parsed: [], lines: [], recipeNames: [], fallback: ing.category };
      groups.set(key, group);
    }
    // Show the plainest spelling: "Cinnamon" rather than "Ground cinnamon" once they're merged.
    if (baseName.toLowerCase() === key && group.displayName.toLowerCase() !== key) group.displayName = baseName;
    group.parsed.push(parsed);
    group.lines.push({ amount: ing.amount, recipeId: ing.recipeId });
    if (!group.recipeNames.includes(ing.recipeName)) group.recipeNames.push(ing.recipeName);
  }

  const items: MergedGroceryItem[] = [];
  groups.forEach((group, key) => {
    const totals = sumAmounts(group.parsed);
    const amount = formatTotals(totals);
    const onlyPlainCount =
      totals.each > 1 && totals.volumeTsp === 0 && totals.weightOz === 0 &&
      Object.keys(totals.counted).length === 0;
    // Use one spelling for synonyms ("Green onion" for scallions, "Butter" for unsalted butter).
    const baseDisplay = baseIngredientKey(group.displayName) !== key ? key : group.displayName;
    items.push({
      key,
      name: formatDisplayName(baseDisplay, onlyPlainCount),
      amount,
      category: categorizeIngredient(key, group.parsed, group.fallback),
      lines: group.lines,
      recipeNames: group.recipeNames,
    });
  });
  return items;
}

/** Parses a single typed-in amount ("2 cups") into a display total, for items added by hand. */
export function formatSingleAmount(amount: string): string {
  if (!amount.trim()) return "";
  const parsed = parseIngredientLine(amount, "");
  const formatted = formatTotals(sumAmounts([parsed]));
  return formatted || amount.trim();
}
