// One place for every recipe label in the app, so the editor, the importer,
// the filters and the cards always show the same names.

import type { Recipe, RecipeTag, CookingMethod, RecipeCategory, MealComponent, CuisineType } from "../types";

export const TAGS: RecipeTag[] = ["lily-safe", "tried-true", "want-to-try", "high-protein", "quick-easy"];

export const TAG_LABELS: Record<string, string> = {
  "lily-safe": "Lily Safe",
  "tried-true": "Tried & True",
  "want-to-try": "Want to Try",
  "high-protein": "High Protein",
  "quick-easy": "Quick & Easy",
};

export const COOKING_METHODS: CookingMethod[] = [
  "stovetop", "oven", "air fryer", "slow cooker", "instant pot", "grill", "microwave", "rice cooker", "no cook",
];

export const METHOD_LABELS: Record<string, string> = {
  "stovetop": "Stovetop",
  "oven": "Oven",
  "air fryer": "Air fryer",
  "slow cooker": "Slow cooker",
  "instant pot": "Instant Pot",
  "grill": "Grill",
  "microwave": "Microwave",
  "rice cooker": "Rice cooker",
  "no cook": "No cook",
};

export const CATEGORIES: RecipeCategory[] = ["breakfast", "appetizer", "main-course", "side", "dessert", "snack"];

export const CATEGORY_LABELS: Record<string, string> = {
  "breakfast": "Breakfast",
  "appetizer": "Appetizer",
  "main-course": "Main Course",
  "side": "Side",
  "dessert": "Dessert",
  "snack": "Snack",
};

export const MEAL_COMPONENTS: MealComponent[] = ["protein", "veggie", "carb", "complete-meal"];

export const MEAL_COMPONENT_LABELS: Record<string, string> = {
  "protein": "Protein",
  "veggie": "Veggie",
  "carb": "Carb",
  "complete-meal": "Complete Meal",
};

export const CUISINES: CuisineType[] = ["american", "asian", "hispanic"];

export const CUISINE_LABELS: Record<string, string> = {
  "american": "American",
  "asian": "Asian",
  "hispanic": "Hispanic",
};

/** "middle-eastern" -> "Middle Eastern"; used for any value not in a label list. */
export function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const tagLabel = (t: string) => TAG_LABELS[t] ?? humanize(t);
export const methodLabel = (m: string) => METHOD_LABELS[m] ?? humanize(m);
export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? humanize(c);
export const cuisineLabel = (c: string) => CUISINE_LABELS[c] ?? humanize(c);
export const mealComponentLabel = (c: string) => MEAL_COMPONENT_LABELS[c] ?? humanize(c);

/** Older recipes saved the category as "main course"; newer ones as "main-course". */
export function normalizeCategory(category?: string): RecipeCategory | undefined {
  if (!category) return undefined;
  return category.trim().toLowerCase().replace(/\s+/g, "-") as RecipeCategory;
}

/** Every tag on a recipe, including custom ones, without duplicates. */
export function allTags(recipe: Recipe): string[] {
  return Array.from(new Set([...(recipe.tags || []), ...(recipe.customTags || [])]));
}

/**
 * Smooths over older saved shapes when a recipe is read, without changing what's stored:
 * category spelling, missing arrays.
 */
export function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    category: normalizeCategory(recipe.category),
    tags: recipe.tags || [],
    cookingMethod: recipe.cookingMethod || [],
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
  };
}
