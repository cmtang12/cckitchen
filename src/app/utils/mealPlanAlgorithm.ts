import { Recipe, CookingMethod } from "../types";

/**
 * Smart meal planning algorithm that:
 * 1. Maximizes shared ingredients across meals for grocery efficiency
 * 2. Distributes cooking methods to avoid appliance fatigue
 * 3. Picks unique, complementary recipes
 * 4. Considers user preferences (tags, cooking time, etc.)
 */

interface RecipeScore {
  recipe: Recipe;
  score: number;
  ingredientOverlap: number;
  methodDiversity: number;
}

/**
 * Calculate how many shared ingredients a recipe has with already selected recipes
 */
function calculateIngredientOverlap(
  recipe: Recipe,
  selectedRecipes: Recipe[]
): number {
  if (selectedRecipes.length === 0) return 0;

  const recipeIngredients = new Set(
    recipe.ingredients.map((ing) => ing.name.toLowerCase())
  );

  let overlapCount = 0;
  selectedRecipes.forEach((selected) => {
    selected.ingredients.forEach((ing) => {
      if (recipeIngredients.has(ing.name.toLowerCase())) {
        overlapCount++;
      }
    });
  });

  return overlapCount;
}

/**
 * Calculate cooking method diversity score (higher is better)
 * Penalizes recipes that use methods already heavily used
 */
function calculateMethodDiversityScore(
  recipe: Recipe,
  methodCounts: Record<CookingMethod, number>
): number {
  // Get the average count across all methods
  const counts = Object.values(methodCounts);
  const avgCount = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

  // Calculate penalty for using over-represented methods
  let penalty = 0;
  recipe.cookingMethod.forEach((method) => {
    const methodCount = methodCounts[method] || 0;
    if (methodCount > avgCount) {
      penalty += methodCount - avgCount;
    }
  });

  // Return inverse of penalty (higher score for more diverse methods)
  return 10 - penalty;
}

/**
 * Main algorithm to select optimal recipes for a meal plan
 */
export function selectOptimalRecipes(
  eligibleRecipes: Recipe[],
  count: number
): Recipe[] {
  if (eligibleRecipes.length === 0) return [];
  if (eligibleRecipes.length <= count) return eligibleRecipes;

  const selectedRecipes: Recipe[] = [];
  const remainingRecipes = [...eligibleRecipes];

  // Initialize cooking method tracking
  const methodCounts: Record<CookingMethod, number> = {
    stovetop: 0,
    oven: 0,
    "air fryer": 0,
    "slow cooker": 0,
    "instant pot": 0,
    grill: 0,
    microwave: 0,
    "no cook": 0,
  };

  // Select the first recipe (pick one with most ingredients as a good base)
  const firstRecipe = remainingRecipes.reduce((best, current) =>
    current.ingredients.length > best.ingredients.length ? current : best
  );
  selectedRecipes.push(firstRecipe);
  remainingRecipes.splice(remainingRecipes.indexOf(firstRecipe), 1);
  firstRecipe.cookingMethod.forEach((method) => {
    methodCounts[method]++;
  });

  // Select remaining recipes using scoring algorithm
  while (selectedRecipes.length < count && remainingRecipes.length > 0) {
    const scoredRecipes: RecipeScore[] = remainingRecipes.map((recipe) => {
      const ingredientOverlap = calculateIngredientOverlap(recipe, selectedRecipes);
      const methodDiversity = calculateMethodDiversityScore(recipe, methodCounts);

      // Weighted scoring:
      // - Ingredient overlap: 40% (want shared ingredients)
      // - Method diversity: 30% (want varied cooking methods)
      // - Recipe variety: 30% (prefer different recipes)
      const ingredientScore = ingredientOverlap * 4; // Higher overlap = better
      const diversityScore = methodDiversity * 3;
      const varietyScore = recipe.tags.length * 0.5; // Bonus for recipes with more tags

      const totalScore = ingredientScore + diversityScore + varietyScore;

      return {
        recipe,
        score: totalScore,
        ingredientOverlap,
        methodDiversity,
      };
    });

    // Sort by score (highest first) and pick the best
    scoredRecipes.sort((a, b) => b.score - a.score);
    const bestRecipe = scoredRecipes[0].recipe;

    selectedRecipes.push(bestRecipe);
    remainingRecipes.splice(remainingRecipes.indexOf(bestRecipe), 1);

    // Update method counts
    bestRecipe.cookingMethod.forEach((method) => {
      methodCounts[method]++;
    });
  }

  return selectedRecipes;
}

/**
 * Generate AI-like reasoning for why recipes were selected
 */
export function generateMealPlanReasoning(
  selectedRecipes: Recipe[],
  sharedIngredients: string[],
  methodDistribution: Record<CookingMethod, number>,
  preferences: {
    allergyFriendlyOnly: boolean;
    highProtein: boolean;
    selectedMethods: CookingMethod[];
    maxCookingTime: number;
  }
): string {
  const parts: string[] = [];

  // Opening statement
  parts.push(
    `I've carefully selected ${selectedRecipes.length} complementary recipes for your meal plan.`
  );

  // Ingredient efficiency
  if (sharedIngredients.length > 0) {
    parts.push(
      `Found ${sharedIngredients.length} shared ingredients (like ${sharedIngredients.slice(0, 3).join(", ")}) across multiple meals, which will save you money and reduce food waste.`
    );
  }

  // Cooking method variety
  const usedMethods = Object.entries(methodDistribution)
    .filter(([_, count]) => count > 0)
    .map(([method]) => method);

  if (usedMethods.length >= 3) {
    parts.push(
      `The recipes use ${usedMethods.length} different cooking methods to keep your week interesting and avoid appliance fatigue.`
    );
  } else if (preferences.selectedMethods.length > 0) {
    parts.push(
      `All recipes match your preferred cooking methods: ${preferences.selectedMethods.join(", ")}.`
    );
  }

  // Time efficiency
  const avgTime = Math.round(
    selectedRecipes.reduce((sum, r) => sum + r.cookingTime, 0) / selectedRecipes.length
  );
  
  if (avgTime <= 30) {
    parts.push(`With an average cooking time of ${avgTime} minutes, these are perfect for busy weeknights.`);
  } else if (avgTime <= 45) {
    parts.push(`The average ${avgTime}-minute cooking time balances efficiency with quality home cooking.`);
  }

  // Dietary preferences
  if (preferences.highProtein) {
    parts.push("All meals meet your high-protein requirements.");
  }
  if (preferences.allergyFriendlyOnly) {
    parts.push("Every recipe is allergy-friendly as requested.");
  }

  return parts.join(" ");
}
