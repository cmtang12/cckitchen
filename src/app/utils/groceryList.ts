// Helpers for turning raw recipe ingredients ("1 tablespoon onion, diced")
// into a clean, deduplicated grocery list item ("Onion (1)").

// Units that describe a measured volume/weight rather than a countable item.
// For these we drop the quantity entirely (nobody shops for "3 tablespoons").
const MEASURED_UNITS = new Set([
  "cup", "cups", "c",
  "tablespoon", "tablespoons", "tbsp", "tbsps", "tbs", "tb",
  "teaspoon", "teaspoons", "tsp", "tsps",
  "ounce", "ounces", "oz",
  "pound", "pounds", "lb", "lbs",
  "gram", "grams", "g",
  "kilogram", "kilograms", "kg",
  "milliliter", "milliliters", "ml",
  "liter", "liters", "l",
  "pint", "pints", "pt",
  "quart", "quarts", "qt",
  "gallon", "gallons", "gal",
  "pinch", "pinches", "dash", "dashes",
]);

// Phrases that describe prep/serving instructions rather than the item itself.
const INSTRUCTION_PHRASES = [
  "to taste", "for garnish", "for serving", "for topping", "as needed",
  "if desired", "optional", "divided", "plus more", "or more to taste",
  "for drizzling", "for greasing", "for dusting",
];

/** Strip prep instructions, parentheticals, and trailing commas from an ingredient name. */
export function cleanIngredientName(rawName: string): string {
  let name = rawName.trim();

  // Drop parenthetical asides, e.g. "tomatoes (about 2 lbs)"
  name = name.replace(/\([^)]*\)/g, " ");

  // The food itself is almost always before the first comma;
  // everything after ("diced", "boneless, skinless", "melted") is instruction.
  name = name.split(",")[0];

  // Strip common trailing instruction phrases that appear without a comma.
  for (const phrase of INSTRUCTION_PHRASES) {
    name = name.replace(new RegExp(`\\b${phrase}\\b`, "gi"), "");
  }

  name = name.replace(/\s+/g, " ").trim();
  return name;
}

function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower.length <= 3) return lower;
  if (lower.endsWith("ies")) return lower.slice(0, -3) + "y";
  if (lower.endsWith("oes")) return lower.slice(0, -2);
  if (lower.endsWith("ses") || lower.endsWith("xes") || lower.endsWith("ches") || lower.endsWith("shes")) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith("s") && !lower.endsWith("ss")) return lower.slice(0, -1);
  return lower;
}

function pluralizeWord(word: string): string {
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/i.test(word)) return word + "es";
  if (/s$/i.test(word)) return word;
  return word + "s";
}

/** Normalized key used to merge the same ingredient across recipes ("onion" === "Onions, diced"). */
export function normalizeIngredientKey(rawName: string): string {
  const words = cleanIngredientName(rawName).toLowerCase().split(" ").filter(Boolean);
  if (words.length === 0) return "";
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(" ");
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Display name for a merged item. Pluralizes the head noun when we're showing a count. */
export function formatDisplayName(rawName: string, showingCount: boolean): string {
  const cleaned = cleanIngredientName(rawName);
  if (!cleaned) return capitalize(rawName.trim());
  if (!showingCount) return capitalize(cleaned);

  const words = cleaned.split(" ");
  words[words.length - 1] = pluralizeWord(words[words.length - 1]);
  return capitalize(words.join(" "));
}

export interface ParsedAmount {
  quantity: number | null;
  unit: string;
}

/** Parses a free-text amount like "1 1/2 cups" or "1/2" into a quantity + unit. */
export function parseAmount(amount: string): ParsedAmount {
  const trimmed = amount.trim();
  const match = trimmed.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { quantity: null, unit: trimmed.toLowerCase() };

  const qtyStr = match[1];
  let qty: number;
  if (qtyStr.includes(" ")) {
    const [whole, frac] = qtyStr.split(" ");
    const [n, d] = frac.split("/").map(Number);
    qty = parseInt(whole, 10) + (d ? n / d : 0);
  } else if (qtyStr.includes("/")) {
    const [n, d] = qtyStr.split("/").map(Number);
    qty = d ? n / d : NaN;
  } else {
    qty = parseFloat(qtyStr);
  }

  return { quantity: Number.isFinite(qty) ? qty : null, unit: match[2].trim().toLowerCase() };
}

/** Combines amounts from multiple recipes into a single quantity, if the units are compatible counts. */
export function combineQuantities(amounts: string[]): number | null {
  let total = 0;
  let sawQuantity = false;

  for (const amount of amounts) {
    const { quantity, unit } = parseAmount(amount);
    if (quantity === null) continue;
    if (MEASURED_UNITS.has(unit)) continue; // measured amounts don't contribute to a shopping count
    total += quantity;
    sawQuantity = true;
  }

  return sawQuantity ? total : null;
}

/** True if every parsed amount uses a measured (volume/weight) unit, e.g. "1 tablespoon". */
export function isAllMeasuredUnits(amounts: string[]): boolean {
  if (amounts.length === 0) return false;
  return amounts.every((amount) => {
    const { quantity, unit } = parseAmount(amount);
    return quantity !== null && MEASURED_UNITS.has(unit);
  });
}

/** Builds the "(N)" shopping estimate for an item, or "" if a count isn't meaningful (e.g. measured amounts). */
export function formatEstimate(amounts: string[]): string {
  if (isAllMeasuredUnits(amounts)) return "";
  const total = combineQuantities(amounts);
  if (total === null || total <= 0) return "";
  return `(${Math.ceil(total)})`;
}
