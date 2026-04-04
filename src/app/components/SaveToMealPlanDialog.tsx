import { useState, useEffect } from "react";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { MealPlan, Recipe } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { Plus, Check, FolderPlus, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

interface SaveToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
}

export function SaveToMealPlanDialog({
  open,
  onOpenChange,
  recipe,
}: SaveToMealPlanDialogProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [includeCompleteMeal, setIncludeCompleteMeal] = useState(true);
  const [pairingRecipes, setPairingRecipes] = useState<Recipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [selectedPairings, setSelectedPairings] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, recipesData] = await Promise.all([
        mealPlanAPI.getAll(),
        recipeAPI.getAll(),
      ]);
      setMealPlans(plansData);
      setAllRecipes(recipesData);

      // Load pairing recipes if they exist
      if (recipe.recommendedPairings && recipe.recommendedPairings.length > 0) {
        const pairings = await Promise.all(
          recipe.recommendedPairings.map((id) => recipeAPI.getById(id))
        );
        setPairingRecipes(pairings);
        setSelectedPairings(recipe.recommendedPairings);
      } else {
        // Auto-generate pairings
        const autoPairings = autoGeneratePairings(recipe, recipesData);
        setPairingRecipes(autoPairings);
        setSelectedPairings(autoPairings.map(r => r.id));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load meal plans");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Auto-generate smart pairings
  const autoGeneratePairings = (currentRecipe: Recipe, availableRecipes: Recipe[]): Recipe[] => {
    // Only generate pairings for recipes that aren't complete meals
    if (currentRecipe.mealComponent === "complete-meal") return [];
    
    // Determine what components we need
    const needsProtein = currentRecipe.mealComponent !== "protein";
    const needsVeggie = currentRecipe.mealComponent !== "veggie";
    const needsCarb = currentRecipe.mealComponent !== "carb";
    
    // Filter available recipes (exclude current recipe)
    const availableComponents = availableRecipes.filter(r => r.id !== currentRecipe.id);
    
    // Find best matches for each needed component
    const pairings: Recipe[] = [];
    
    if (needsProtein) {
      const proteins = availableComponents
        .filter(r => r.mealComponent === "protein")
        .sort((a, b) => {
          const aScore = (a.tags.includes("tried-true") ? 10 : 0) + (5 - a.cookingTime / 10);
          const bScore = (b.tags.includes("tried-true") ? 10 : 0) + (5 - b.cookingTime / 10);
          return bScore - aScore;
        });
      if (proteins[0]) pairings.push(proteins[0]);
    }
    
    if (needsVeggie) {
      const veggies = availableComponents
        .filter(r => r.mealComponent === "veggie")
        .sort((a, b) => {
          const aScore = (a.tags.includes("tried-true") ? 10 : 0) + (5 - a.cookingTime / 10);
          const bScore = (b.tags.includes("tried-true") ? 10 : 0) + (5 - b.cookingTime / 10);
          return bScore - aScore;
        });
      if (veggies[0]) pairings.push(veggies[0]);
    }
    
    if (needsCarb) {
      const carbs = availableComponents
        .filter(r => r.mealComponent === "carb")
        .sort((a, b) => {
          const aScore = (a.tags.includes("tried-true") ? 10 : 0) + (5 - a.cookingTime / 10);
          const bScore = (b.tags.includes("tried-true") ? 10 : 0) + (5 - b.cookingTime / 10);
          return bScore - aScore;
        });
      if (carbs[0]) pairings.push(carbs[0]);
    }
    
    return pairings;
  };

  const togglePairing = (pairingId: string) => {
    setSelectedPairings(prev => 
      prev.includes(pairingId)
        ? prev.filter(id => id !== pairingId)
        : [...prev, pairingId]
    );
  };

  const handleSaveToExisting = async (planId: string) => {
    try {
      setIsSaving(true);
      const plan = mealPlans.find((p) => p.id === planId);
      if (!plan) return;

      // Check if recipe is already in this plan
      const alreadyExists = plan.meals.some((m) => m.recipeId === recipe.id);
      if (alreadyExists) {
        toast.info(`"${recipe.name}" is already in "${plan.name}"`);
        onOpenChange(false);
        return;
      }

      // Determine what to add - only selected pairings
      const selectedPairingRecipes = pairingRecipes.filter(r => selectedPairings.includes(r.id));
      const recipesToAdd = includeCompleteMeal && selectedPairingRecipes.length > 0
        ? [recipe, ...selectedPairingRecipes]
        : [recipe];

      // Generate a meal group ID if adding multiple recipes
      const mealGroupId = recipesToAdd.length > 1 ? crypto.randomUUID() : undefined;

      // Add recipe(s) to plan
      const newMeals = recipesToAdd.map((r) => ({
        id: crypto.randomUUID(),
        recipeId: r.id,
        dayOfWeek: 0,
        mealGroupId,
      }));

      const updatedMeals = [...plan.meals, ...newMeals];

      await mealPlanAPI.update(planId, {
        meals: updatedMeals,
      });

      if (recipesToAdd.length > 1) {
        toast.success(
          `Added complete meal (${recipesToAdd.length} recipes) to "${plan.name}"!`
        );
      } else {
        toast.success(`Added "${recipe.name}" to "${plan.name}"!`);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save to meal plan:", error);
      toast.error("Failed to save to meal plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newPlanName.trim()) {
      toast.error("Please enter a plan name");
      return;
    }

    try {
      setIsSaving(true);

      // Determine what to add - only selected pairings
      const selectedPairingRecipes = pairingRecipes.filter(r => selectedPairings.includes(r.id));
      const recipesToAdd = includeCompleteMeal && selectedPairingRecipes.length > 0
        ? [recipe, ...selectedPairingRecipes]
        : [recipe];

      // Generate a meal group ID if adding multiple recipes
      const mealGroupId = recipesToAdd.length > 1 ? crypto.randomUUID() : undefined;

      const newPlan: MealPlan = {
        id: crypto.randomUUID(),
        name: newPlanName.trim(),
        dateCreated: new Date().toISOString(),
        rules: {
          allergyFriendlyOnly: false,
          highProtein: false,
          preferredCookingMethods: [],
          mealsPerWeek: 7,
          requiredTags: [],
          excludedTags: [],
        },
        meals: recipesToAdd.map((r) => ({
          id: crypto.randomUUID(),
          recipeId: r.id,
          dayOfWeek: 0,
          mealGroupId,
        })),
      };

      await mealPlanAPI.create(newPlan);
      
      if (recipesToAdd.length > 1) {
        toast.success(
          `Created "${newPlanName}" with complete meal (${recipesToAdd.length} recipes)!`
        );
      } else {
        toast.success(`Created "${newPlanName}" and added "${recipe.name}"!`);
      }
      
      onOpenChange(false);
      setNewPlanName("");
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Failed to create meal plan:", error);
      toast.error("Failed to create meal plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Save to Meal Plan
          </DialogTitle>
          <DialogDescription>
            Add this recipe to an existing meal plan or create a new one.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading meal plans...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recipe being added */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground mb-1">Adding recipe:</p>
              <p className="font-medium text-foreground">{recipe.name}</p>
            </div>

            {/* Complete meal checkbox if pairings exist */}
            {pairingRecipes.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="complete-meal"
                    checked={includeCompleteMeal}
                    onCheckedChange={(checked) => setIncludeCompleteMeal(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="complete-meal"
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <UtensilsCrossed className="w-4 h-4 text-primary" />
                      Save complete meal with sides
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Include {pairingRecipes.length} recommended pairing
                      {pairingRecipes.length > 1 ? "s" : ""}:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pairingRecipes.map((pr) => (
                        <span
                          key={pr.id}
                          className="inline-flex items-center gap-1 text-xs bg-background/60 border border-border/50 rounded px-2 py-0.5"
                        >
                          {pr.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isCreatingNew ? (
              <>
                {/* Existing meal plans */}
                {mealPlans.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Select a meal plan
                    </Label>
                    <ScrollArea className="h-[240px] pr-3">
                      <div className="space-y-2">
                        {mealPlans.map((plan) => {
                          const recipeCount = plan.meals.length;
                          const hasRecipe = plan.meals.some((m) => m.recipeId === recipe.id);
                          
                          return (
                            <button
                              key={plan.id}
                              onClick={() => handleSaveToExisting(plan.id)}
                              disabled={isSaving || hasRecipe}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                hasRecipe
                                  ? "border-primary/20 bg-primary/5 cursor-not-allowed"
                                  : "border-border/50 hover:border-primary/30 hover:bg-accent"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-foreground text-sm mb-1">
                                    {plan.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
                                  </p>
                                </div>
                                {hasRecipe && (
                                  <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Create new button */}
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full border-dashed border-2"
                  disabled={isSaving}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Meal Plan
                </Button>
              </>
            ) : (
              <>
                {/* Create new meal plan form */}
                <div>
                  <Label htmlFor="plan-name" className="mb-2 block">
                    New Meal Plan Name
                  </Label>
                  <Input
                    id="plan-name"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="e.g., Week of March 15"
                    className="bg-card border-border/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateNew();
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateNew}
                    disabled={isSaving || !newPlanName.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Create & Add
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewPlanName("");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}