export type CookingMethod = 'stovetop' | 'oven' | 'air fryer' | 'slow cooker' | 'instant pot' | 'grill' | 'microwave' | 'rice cooker' | 'no cook';

export type RecipeCategory = 'breakfast' | 'appetizer' | 'main-course' | 'side' | 'dessert' | 'snack';

export type RecipeTag = 
  | 'lily-safe'
  | 'tried-true'
  | 'want-to-try'
  | 'high-protein'
  | 'quick-easy';

export type MealComponent = 'protein' | 'veggie' | 'carb' | 'complete-meal';

export type CuisineType = 'hispanic' | 'asian' | 'american' | 'mexican' | 'italian' | 'mediterranean' | 'indian' | 'middle-eastern' | 'french' | 'spanish' | 'thai' | 'japanese' | 'korean' | 'chinese' | 'vietnamese' | 'greek';

export interface Recipe {
  id: string;
  name: string;
  image?: string;
  /** Set on the photo-free list: the recipe has a photo that loads separately. */
  hasImage?: boolean;
  /** Fingerprint of the photo, so a saved copy is refreshed when it changes. */
  imageVersion?: string;
  source?: string;
  servings: number;
  cookingTime: number; // in minutes
  cookingMethod: CookingMethod[];
  category?: RecipeCategory;
  mealComponent?: MealComponent; // NEW: What type of meal component this is
  ingredients: Ingredient[];
  instructions: string[];
  tags: RecipeTag[];
  customTags?: string[];
  isLoved?: boolean;
  notes?: string; // Personal notes and adjustments
  dateAdded: string;
  timesCookedLog?: string[]; // Array of ISO date strings when recipe was cooked
  rating?: number; // 1-5 star rating
  recommendedPairings?: string[]; // Recipe IDs that pair well with this recipe
  /** Lily helps: steps you corrected by hand. index -> true (Lily can do it) / false (not for Lily). */
  lilySteps?: Record<number, boolean>;
  cuisineTypes?: CuisineType[]; // NEW: Types of cuisine (can be multiple)
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  category: GroceryCategory;
}

export type GroceryCategory = 
  | 'produce'
  | 'meat'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'beverages'
  | 'spices'
  | 'other';

export interface MealPlanRule {
  allergyFriendlyOnly: boolean;
  highProtein: boolean;
  preferredCookingMethods: CookingMethod[];
  mealsPerWeek: number;
  maxCookingTime?: number;
  minCookingTime?: number;
  requiredTags: RecipeTag[];
  excludedTags: RecipeTag[];
}

export interface MealPlan {
  id: string;
  name: string;
  dateCreated: string;
  rules: MealPlanRule;
  meals: PlannedMeal[];
  aiInsights?: AIInsights;
  notes?: string; // Freeform notes about the plan as a whole (e.g. prep tips)
}

export interface PlannedMeal {
  id: string;
  recipeId: string;
  dayOfWeek: number; // 0-6
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  mealGroupId?: string; // Groups related recipes together (main + sides)
  comment?: string; // Note for this meal; shared across all members of a group
}

export interface AIInsights {
  sharedIngredients: string[];
  applianceDistribution: Record<CookingMethod, number>;
  nutritionSummary: string;
  tagAlignment: string[];
  estimatedGroceryCost?: number;
  reasoning: string;
}

export interface GroceryListItem {
  id: string;
  ingredientName: string;
  amount: string;
  category: GroceryCategory;
  checked: boolean;
  fromRecipes: string[]; // recipe IDs
}