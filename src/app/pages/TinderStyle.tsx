import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { recipeAPI, mealPlanAPI } from "../services/api";
import type { Recipe, RecipeTag, PlannedMeal } from "../types";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, Check, X, Save } from "lucide-react";
import { formatCookingTime } from "../utils/formatTime";

// Helper function to format cooking time - moved to utils

const tagLabels: Record<RecipeTag, string> = {
  "lily-safe": "Lily Safe",
  "tried-true": "Tried & True",
  "want-to-try": "Want to Try",
  "high-protein": "High Protein",
  "quick-easy": "Quick & Easy",
};

interface TinderStyleProps {
  onClose?: () => void;
}

export function TinderStyle({ onClose }: TinderStyleProps) {
  const navigate = useNavigate();
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [allRecipesMap, setAllRecipesMap] = useState<Map<string, Recipe>>(new Map());
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  
  // Store all recipes including veggies/carbs for pairing lookups
  const [fullRecipeList, setFullRecipeList] = useState<Recipe[]>([]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      const recipes = await recipeAPI.getAll();
      
      // Store the full list for pairing lookups
      setFullRecipeList(recipes);
      
      // Create a map of all recipes (including veggies and carbs for pairing lookups)
      setAllRecipesMap(new Map(recipes.map(r => [r.id, r])));
      
      // DEBUG: Log recipes with pairings
      console.log('[TinderStyle] Total recipes loaded:', recipes.length);
      const recipesWithPairings = recipes.filter(r => r.recommendedPairings && r.recommendedPairings.length > 0);
      console.log('[TinderStyle] Recipes with pairings:', recipesWithPairings.map(r => ({
        name: r.name,
        mealComponent: r.mealComponent,
        pairings: r.recommendedPairings
      })));
      
      // Filter to only show: proteins, complete meals, and snacks
      // Don't show standalone veggies or carbs
      const swipeableRecipes = recipes.filter(r => {
        const component = r.mealComponent;
        // Include: protein, complete-meal, snacks, and recipes without a component tag
        // Exclude: veggie and carb
        return component !== 'veggie' && component !== 'carb';
      });
      
      // Filter out already selected recipes
      const availableRecipes = swipeableRecipes.filter(
        r => !selectedRecipes.find(s => s.id === r.id)
      );
      
      setAllRecipes(availableRecipes);
      if (availableRecipes.length > 0) {
        setCurrentRecipe(getRandomRecipe(availableRecipes));
      } else {
        setCurrentRecipe(null);
      }
    } catch (error) {
      console.error("Failed to load recipes:", error);
      toast.error("Failed to load recipes");
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomRecipe = (recipes: Recipe[]): Recipe => {
    const randomIndex = Math.floor(Math.random() * recipes.length);
    return recipes[randomIndex];
  };

  const handleAccept = () => {
    if (!currentRecipe) return;
    
    setSwipeDirection("right");
    setIsSwiping(true);

    setTimeout(() => {
      setSelectedRecipes([...selectedRecipes, currentRecipe]);
      showNextRecipe();
      setIsSwiping(false);
      setSwipeDirection(null);
      toast.success(`Added ${currentRecipe.name}`);
    }, 300);
  };

  const handleReject = () => {
    if (!currentRecipe) return;
    
    setSwipeDirection("left");
    setIsSwiping(true);

    setTimeout(() => {
      showNextRecipe();
      setIsSwiping(false);
      setSwipeDirection(null);
    }, 300);
  };

  const showNextRecipe = () => {
    const remainingRecipes = allRecipes.filter(
      r => r.id !== currentRecipe?.id && !selectedRecipes.find(s => s.id === r.id)
    );
    
    if (remainingRecipes.length > 0) {
      const nextRecipe = getRandomRecipe(remainingRecipes);
      console.log('[TinderStyle] Current recipe:', {
        name: nextRecipe.name,
        mealComponent: nextRecipe.mealComponent,
        hasPairings: !!(nextRecipe.recommendedPairings && nextRecipe.recommendedPairings.length > 0),
        pairings: nextRecipe.recommendedPairings
      });
      setCurrentRecipe(nextRecipe);
    } else {
      setCurrentRecipe(null);
    }
  };

  const handleRemoveSelected = (recipeId: string) => {
    setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipeId));
    // If we removed a recipe and there's no current recipe showing, reload
    if (!currentRecipe) {
      loadRecipes();
    }
    toast.success("Removed from selection");
  };

  const handleSaveMealPlan = async () => {
    if (selectedRecipes.length === 0) {
      toast.error("Please select at least one recipe");
      return;
    }

    try {
      console.log("[TinderStyle] Starting meal plan creation with", selectedRecipes.length, "recipes");
      
      toast.info("Creating your meal plan...");

      // Build meals with pairings
      const meals: PlannedMeal[] = [];
      let dayCounter = 0;

      for (const recipe of selectedRecipes) {
        console.log("[TinderStyle] Processing recipe:", recipe.name, "| Component:", recipe.mealComponent);
        
        // Check if this recipe has recommended pairings
        const hasPairings = recipe.recommendedPairings && recipe.recommendedPairings.length > 0;
        
        // Get the pairing recipes
        const pairingRecipes = hasPairings
          ? recipe.recommendedPairings!
              .map(id => allRecipesMap.get(id))
              .filter((r): r is Recipe => r !== undefined)
          : [];

        console.log("[TinderStyle] Manual pairings found:", pairingRecipes.length);

        // If this is a protein with pairings (manual or auto), group them
        const shouldGroupMeal = recipe.mealComponent === "protein" && (pairingRecipes.length > 0 || autoGeneratePairings(recipe).length > 0);
        
        // Generate meal group ID for linked meals
        const mealGroupId = shouldGroupMeal ? crypto.randomUUID() : undefined;

        // Get final pairing list (use manual pairings if available, otherwise auto-generate)
        const finalPairings = pairingRecipes.length > 0 
          ? pairingRecipes 
          : autoGeneratePairings(recipe);

        console.log("[TinderStyle] Final pairings for", recipe.name, ":", finalPairings.map(p => p.name));
        if (mealGroupId) {
          console.log("[TinderStyle] Grouping with mealGroupId:", mealGroupId);
        }

        // Add main recipe
        meals.push({
          id: crypto.randomUUID(),
          recipeId: recipe.id,
          dayOfWeek: dayCounter,
          mealType: "dinner",
          mealGroupId,
        });

        // Add paired recipes with same day and meal group
        finalPairings.forEach(pairingRecipe => {
          meals.push({
            id: crypto.randomUUID(),
            recipeId: pairingRecipe.id,
            dayOfWeek: dayCounter,
            mealType: "dinner",
            mealGroupId,
          });
        });

        dayCounter++;
      }

      console.log("[TinderStyle] Total meals to create:", meals.length);

      // Generate a name based on current date
      const dateStr = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const planName = `Meal Plan - ${dateStr}`;

      // Create the meal plan with proper MealPlanRule structure
      const newPlan = {
        name: planName,
        rules: {
          allergyFriendlyOnly: false,
          highProtein: false,
          preferredCookingMethods: [],
          mealsPerWeek: selectedRecipes.length,
          requiredTags: [],
          excludedTags: [],
          // Store tinder-style metadata in a custom field (will be preserved)
          source: "tinder-style" as any,
          selectedRecipeCount: selectedRecipes.length as any,
        },
        meals,
      };

      console.log("[TinderStyle] Creating meal plan:", planName);
      const createdPlan = await mealPlanAPI.create(newPlan);
      console.log("[TinderStyle] Meal plan created successfully:", createdPlan.id);
      
      toast.success("Meal plan created successfully!");
      
      // Navigate to the meal plan detail page
      console.log("[TinderStyle] Navigating to /meal-plans/" + createdPlan.id);
      navigate(`/meal-plans/${createdPlan.id}`);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("[TinderStyle] Failed to create meal plan:", error);
      if (error instanceof Error) {
        console.error("[TinderStyle] Error message:", error.message);
        console.error("[TinderStyle] Error stack:", error.stack);
      }
      toast.error("Failed to create meal plan. Please try again.");
    }
  };

  // Touch/swipe handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleReject();
    }
    if (isRightSwipe) {
      handleAccept();
    }
  };

  // Helper: Auto-generate smart pairings based on meal components
  const autoGeneratePairings = (recipe: Recipe): Recipe[] => {
    // ONLY show pairings for protein recipes
    // Proteins get paired with 1 veggie + 1 carb
    if (recipe.mealComponent !== "protein") return [];
    
    // Filter available recipes (exclude current recipe)
    const availableComponents = fullRecipeList.filter(r => r.id !== recipe.id);
    
    // Find best matches: 1 veggie + 1 carb
    const pairings: Recipe[] = [];
    
    // Helper function to check if two recipes share cuisine types
    const hasSameCuisine = (recipeA: Recipe, recipeB: Recipe): boolean => {
      if (!recipeA.cuisineTypes || !recipeB.cuisineTypes) return false;
      return recipeA.cuisineTypes.some(c => recipeB.cuisineTypes?.includes(c));
    };
    
    // Find best veggie - prioritize same cuisine type
    const veggies = availableComponents
      .filter(r => r.mealComponent === "veggie")
      .sort((a, b) => {
        // Cuisine match bonus: 20 points
        const aCuisineMatch = hasSameCuisine(recipe, a) ? 20 : 0;
        const bCuisineMatch = hasSameCuisine(recipe, b) ? 20 : 0;
        
        // Tried & true bonus: 10 points
        const aTriedTrue = a.tags.includes("tried-true") ? 10 : 0;
        const bTriedTrue = b.tags.includes("tried-true") ? 10 : 0;
        
        // Quick cooking time bonus: 5 - (cookingTime / 10)
        const aTimeScore = 5 - a.cookingTime / 10;
        const bTimeScore = 5 - b.cookingTime / 10;
        
        const aScore = aCuisineMatch + aTriedTrue + aTimeScore;
        const bScore = bCuisineMatch + bTriedTrue + bTimeScore;
        
        return bScore - aScore;
      });
    if (veggies[0]) pairings.push(veggies[0]);
    
    // Find best carb - prioritize same cuisine type
    const carbs = availableComponents
      .filter(r => r.mealComponent === "carb")
      .sort((a, b) => {
        // Cuisine match bonus: 20 points
        const aCuisineMatch = hasSameCuisine(recipe, a) ? 20 : 0;
        const bCuisineMatch = hasSameCuisine(recipe, b) ? 20 : 0;
        
        // Tried & true bonus: 10 points
        const aTriedTrue = a.tags.includes("tried-true") ? 10 : 0;
        const bTriedTrue = b.tags.includes("tried-true") ? 10 : 0;
        
        // Quick cooking time bonus: 5 - (cookingTime / 10)
        const aTimeScore = 5 - a.cookingTime / 10;
        const bTimeScore = 5 - b.cookingTime / 10;
        
        const aScore = aCuisineMatch + aTriedTrue + aTimeScore;
        const bScore = bCuisineMatch + bTriedTrue + bTimeScore;
        
        return bScore - aScore;
      });
    if (carbs[0]) pairings.push(carbs[0]);
    
    return pairings;
  };

  // Get pairings to display (manual or auto-generated)
  const displayPairings = currentRecipe?.recommendedPairings && currentRecipe.recommendedPairings.length > 0
    ? currentRecipe.recommendedPairings.map(id => allRecipesMap.get(id)).filter((r): r is Recipe => r !== undefined)
    : autoGeneratePairings(currentRecipe || {} as Recipe);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentRecipe) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {selectedRecipes.length > 0 ? "All Done!" : "No Recipes Available"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {selectedRecipes.length > 0
              ? `You've selected ${selectedRecipes.length} recipe${selectedRecipes.length > 1 ? "s" : ""} for your meal plan`
              : "Add some recipes to your library to get started"}
          </p>
        </div>
        
        {selectedRecipes.length > 0 && (
          <div className="space-y-3">
            <Button
              onClick={handleSaveMealPlan}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              Create Meal Plan
            </Button>
            <Button
              onClick={() => {
                setSelectedRecipes([]);
                loadRecipes();
              }}
              variant="outline"
              className="w-full rounded-lg"
            >
              Start Over
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Close button for full-screen mode */}
      {onClose && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Tinder Style</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Recipe Card */}
      <div 
        className={`relative mb-6 ${isSwiping ? (swipeDirection === "right" ? "animate-swipe-right" : "animate-swipe-left") : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Card className="border-border/50 overflow-hidden bg-transparent">
          {/* Recipe Image - Shorter for mobile */}
          <div className="relative h-[340px] sm:h-[420px] overflow-hidden bg-muted rounded-xl">
            {currentRecipe.image ? (
              <img
                src={currentRecipe.image}
                alt={currentRecipe.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <span className="text-4xl font-semibold text-muted-foreground/30">
                  {currentRecipe.name}
                </span>
              </div>
            )}
            
            {/* Gradient overlay at bottom for readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            {/* Recipe name overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <div className="flex items-start gap-3 mb-1.5">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                    {currentRecipe.name}
                  </h2>
                  
                  {/* Meta info */}
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white/90 drop-shadow-md mt-1.5">
                    <span>⏱ {formatCookingTime(currentRecipe.cookingTime)}</span>
                    <span>•</span>
                    <span>🍽 {currentRecipe.servings} servings</span>
                  </div>
                </div>
                
                {/* Meal Pairings - Show small thumbnail images */}
                {displayPairings.length > 0 && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {displayPairings.map((pairedRecipe) => {
                      if (!pairedRecipe) return null;
                      
                      return (
                        <div 
                          key={pairedRecipe.id} 
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-md overflow-hidden border-2 border-white shadow-lg bg-white"
                          title={pairedRecipe.name}
                        >
                          {pairedRecipe.image ? (
                            <img 
                              src={pairedRecipe.image} 
                              alt={pairedRecipe.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                              🍽
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons - Desktop */}
      <div className="hidden sm:flex items-center justify-center gap-6 mb-6">
        <Button
          onClick={handleReject}
          size="lg"
          variant="outline"
          className="w-20 h-20 rounded-full border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
          disabled={isSwiping}
        >
          <X className="w-8 h-8 text-red-500" />
        </Button>

        <Button
          onClick={handleAccept}
          size="lg"
          className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white"
          disabled={isSwiping}
        >
          <Check className="w-8 h-8" />
        </Button>
      </div>

      {/* Action Buttons - Mobile */}
      <div className="sm:hidden flex items-center justify-center gap-4 mb-6">
        <Button
          onClick={handleReject}
          size="lg"
          variant="outline"
          className="flex-1 h-14 rounded-lg border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
          disabled={isSwiping}
        >
          <X className="w-6 h-6 text-red-500 mr-2" />
          Skip
        </Button>

        <Button
          onClick={handleAccept}
          size="lg"
          className="flex-1 h-14 rounded-lg bg-green-500 hover:bg-green-600 text-white"
          disabled={isSwiping}
        >
          <Check className="w-6 h-6 mr-2" />
          Add
        </Button>
      </div>

      {/* Selected Recipes Thumbnails */}
      {selectedRecipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">
              {selectedRecipes.length} {selectedRecipes.length === 1 ? "recipe" : "recipes"} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {selectedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="relative group"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/20 bg-muted">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                      {recipe.name}
                    </div>
                  )}
                </div>
                
                {/* Delete button - always visible on mobile, hover on desktop */}
                <button
                  onClick={() => handleRemoveSelected(recipe.id)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors sm:opacity-0 sm:group-hover:opacity-100 border-2 border-white"
                  title={`Remove ${recipe.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveMealPlan}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11"
          >
            <Save className="w-4 h-4 mr-2" />
            Create Meal Plan
          </Button>
        </div>
      )}

      {/* Swipe hint for mobile */}
      <p className="sm:hidden text-center text-xs text-muted-foreground mt-4">
        👆 Swipe left to skip, right to add
      </p>
    </div>
  );
}