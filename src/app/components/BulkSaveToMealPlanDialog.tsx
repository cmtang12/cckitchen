import { useState, useEffect } from "react";
import { mealPlanAPI } from "../services/api";
import { MealPlan, Recipe } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, Check, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkSaveToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
}

export function BulkSaveToMealPlanDialog({
  open,
  onOpenChange,
  recipes,
}: BulkSaveToMealPlanDialogProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadMealPlans();
    }
  }, [open]);

  const loadMealPlans = async () => {
    try {
      setIsLoading(true);
      const plansData = await mealPlanAPI.getAll();
      setMealPlans(plansData);
    } catch (error) {
      console.error("Failed to load meal plans:", error);
      toast.error("Failed to load meal plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToExisting = async (planId: string) => {
    try {
      setIsSaving(true);
      const plan = mealPlans.find((p) => p.id === planId);
      if (!plan) return;

      // Filter out recipes that are already in this plan
      const existingRecipeIds = new Set(plan.meals.map((m) => m.recipeId));
      const recipesToAdd = recipes.filter((r) => !existingRecipeIds.has(r.id));

      if (recipesToAdd.length === 0) {
        toast.info(`All selected recipes are already in "${plan.name}"`);
        onOpenChange(false);
        return;
      }

      // Add recipes to plan
      const newMeals = recipesToAdd.map((r) => ({
        id: crypto.randomUUID(),
        recipeId: r.id,
        dayOfWeek: 0,
      }));

      const updatedMeals = [...plan.meals, ...newMeals];

      await mealPlanAPI.update(planId, {
        meals: updatedMeals,
      });

      const skippedCount = recipes.length - recipesToAdd.length;
      if (skippedCount > 0) {
        toast.success(
          `Added ${recipesToAdd.length} recipe${recipesToAdd.length > 1 ? "s" : ""} to "${plan.name}" (${skippedCount} already existed)`
        );
      } else {
        toast.success(
          `Added ${recipesToAdd.length} recipe${recipesToAdd.length > 1 ? "s" : ""} to "${plan.name}"!`
        );
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
        meals: recipes.map((r) => ({
          id: crypto.randomUUID(),
          recipeId: r.id,
          dayOfWeek: 0,
        })),
      };

      await mealPlanAPI.create(newPlan);

      toast.success(
        `Created "${newPlanName}" with ${recipes.length} recipe${recipes.length > 1 ? "s" : ""}!`
      );

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
            Bulk Save to Meal Plan
          </DialogTitle>
          <DialogDescription>
            Add {recipes.length} selected recipe{recipes.length > 1 ? "s" : ""} to a meal plan.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading meal plans...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recipes being added */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 max-h-32 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-2">
                Adding {recipes.length} recipe{recipes.length > 1 ? "s" : ""}:
              </p>
              <div className="space-y-1">
                {recipes.slice(0, 5).map((recipe) => (
                  <p key={recipe.id} className="text-xs text-foreground">
                    • {recipe.name}
                  </p>
                ))}
                {recipes.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {recipes.length - 5} more
                  </p>
                )}
              </div>
            </div>

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

                          return (
                            <button
                              key={plan.id}
                              onClick={() => handleSaveToExisting(plan.id)}
                              disabled={isSaving}
                              className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent transition-all"
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
