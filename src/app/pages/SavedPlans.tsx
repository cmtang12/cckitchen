import { useState, useEffect } from "react";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { FolderHeart, Loader2, Pencil, Trash2, Plus, Search, X, Check, UtensilsCrossed, RefreshCw } from "lucide-react";
import { MealPlan, Recipe, PlannedMeal } from "../types";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { formatCookingTime } from "../utils/formatTime";

const RECIPE_CARD_TYPE = "RECIPE_CARD";

// Draggable Recipe Card Component (for ungrouped recipes)
interface DraggableRecipeCardProps {
  meal: PlannedMeal;
  recipe: Recipe;
  onDrop: (draggedMealId: string, targetMealId: string) => void;
  onOpenSwap: () => void;
  onRemove: () => void;
}

function DraggableRecipeCard({ meal, recipe, onDrop, onOpenSwap, onRemove }: DraggableRecipeCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: RECIPE_CARD_TYPE,
    item: { mealId: meal.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: RECIPE_CARD_TYPE,
    drop: (item: { mealId: string }) => {
      onDrop(item.mealId, meal.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
        isDragging
          ? "opacity-50"
          : isOver
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-border/50 hover:border-border"
      }`}
    >
      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-16 h-16 rounded object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <Link
          to={`/recipes/${recipe.id}`}
          className="font-medium text-foreground hover:text-primary block truncate"
        >
          {recipe.name}
        </Link>
        <p className="text-sm text-muted-foreground">
          {formatCookingTime(recipe.cookingTime)} • {recipe.servings} servings
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSwap();
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Swap recipe"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50/50"
          title="Remove recipe"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Draggable Recipe Card Component (for grouped recipes)
interface DraggableGroupedRecipeCardProps {
  meal: PlannedMeal;
  recipe: Recipe;
  onDrop: (draggedMealId: string, targetMealId: string) => void;
  onOpenSwap: () => void;
  onRemove: () => void;
  onUngroup: () => void;
}

function DraggableGroupedRecipeCard({
  meal,
  recipe,
  onDrop,
  onOpenSwap,
  onRemove,
  onUngroup,
}: DraggableGroupedRecipeCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: RECIPE_CARD_TYPE,
    item: { mealId: meal.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: RECIPE_CARD_TYPE,
    drop: (item: { mealId: string }) => {
      onDrop(item.mealId, meal.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-3 p-2 rounded-lg bg-background/60 border transition-all cursor-move ${
        isDragging
          ? "opacity-50"
          : isOver
          ? "border-primary bg-primary/10"
          : "border-border/30"
      }`}
    >
      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-12 h-12 rounded object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <Link
          to={`/recipes/${recipe.id}`}
          className="text-sm font-medium text-foreground hover:text-primary block truncate"
        >
          {recipe.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {formatCookingTime(recipe.cookingTime)} • {recipe.servings} servings
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onUngroup();
          }}
          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-amber-600 hover:bg-amber-50/50"
          title="Ungroup recipe"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSwap();
          }}
          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Swap recipe"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50/50"
          title="Remove recipe"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SavedPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRecipes, setIsAddingRecipes] = useState(false);
  
  // Swap modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTargetMeal, setSwapTargetMeal] = useState<PlannedMeal | null>(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, recipesData] = await Promise.all([
        mealPlanAPI.getAll(),
        recipeAPI.getAll(),
      ]);
      setMealPlans(plansData);
      setRecipes(recipesData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load meal plans");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecipeById = (id: string) => {
    return recipes.find((r) => r.id === id);
  };

  const handleDeletePlan = async (planId: string) => {
    const plan = mealPlans.find((p) => p.id === planId);
    if (!plan) return;

    if (!confirm(`Are you sure you want to delete "${plan.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await mealPlanAPI.delete(planId);
      setMealPlans(mealPlans.filter((p) => p.id !== planId));
      toast.success("Meal plan deleted successfully");
    } catch (error) {
      console.error("Failed to delete meal plan:", error);
      toast.error("Failed to delete meal plan");
    }
  };

  const handleRemoveRecipe = async (mealId: string) => {
    if (!editingPlan) return;

    try {
      const updatedMeals = editingPlan.meals.filter((m) => m.id !== mealId);
      
      await mealPlanAPI.update(editingPlan.id, {
        meals: updatedMeals,
      });

      const updatedPlan = { ...editingPlan, meals: updatedMeals };
      setEditingPlan(updatedPlan);
      setMealPlans(mealPlans.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      toast.success("Recipe removed from meal plan");
    } catch (error) {
      console.error("Failed to remove recipe:", error);
      toast.error("Failed to remove recipe");
    }
  };

  const handleAddRecipe = async (recipeId: string) => {
    if (!editingPlan) return;

    // Check if recipe is already in plan
    const alreadyExists = editingPlan.meals.some((m) => m.recipeId === recipeId);
    if (alreadyExists) {
      toast.info("Recipe is already in this meal plan");
      return;
    }

    try {
      const updatedMeals = [
        ...editingPlan.meals,
        {
          id: crypto.randomUUID(),
          recipeId,
          dayOfWeek: 0,
        },
      ];

      await mealPlanAPI.update(editingPlan.id, {
        meals: updatedMeals,
      });

      const updatedPlan = { ...editingPlan, meals: updatedMeals };
      setEditingPlan(updatedPlan);
      setMealPlans(mealPlans.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      
      const recipe = getRecipeById(recipeId);
      toast.success(`Added "${recipe?.name}" to meal plan`);
    } catch (error) {
      console.error("Failed to add recipe:", error);
      toast.error("Failed to add recipe");
    }
  };

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group meals by mealGroupId
  const groupMeals = (meals: PlannedMeal[]) => {
    const groups: { [key: string]: PlannedMeal[] } = {};
    const ungrouped: PlannedMeal[] = [];

    meals.forEach((meal) => {
      if (meal.mealGroupId) {
        if (!groups[meal.mealGroupId]) {
          groups[meal.mealGroupId] = [];
        }
        groups[meal.mealGroupId].push(meal);
      } else {
        ungrouped.push(meal);
      }
    });

    return { groups: Object.values(groups), ungrouped };
  };

  // Handle opening swap modal
  const handleOpenSwapModal = (meal: PlannedMeal) => {
    setSwapTargetMeal(meal);
    setSwapSearchQuery("");
    setSwapModalOpen(true);
  };

  // Handle swapping a recipe
  const handleSwapRecipe = async (newRecipeId: string) => {
    if (!editingPlan || !swapTargetMeal) return;

    try {
      const updatedMeals = editingPlan.meals.map((m) =>
        m.id === swapTargetMeal.id
          ? { ...m, recipeId: newRecipeId }
          : m
      );

      await mealPlanAPI.update(editingPlan.id, {
        meals: updatedMeals,
      });

      const updatedPlan = { ...editingPlan, meals: updatedMeals };
      setEditingPlan(updatedPlan);
      setMealPlans(mealPlans.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      setSwapModalOpen(false);
      setSwapTargetMeal(null);
      toast.success("Recipe swapped successfully");
    } catch (error) {
      console.error("Failed to swap recipe:", error);
      toast.error("Failed to swap recipe");
    }
  };

  // Get available recipes for swapping
  const getAvailableSwapRecipes = () => {
    if (!swapTargetMeal) return [];

    const currentRecipe = getRecipeById(swapTargetMeal.recipeId);

    // Filter recipes
    let availableRecipes = recipes.filter((r) => r.id !== swapTargetMeal.recipeId);

    // If the recipe being swapped has a meal component, prioritize same meal component
    if (currentRecipe?.mealComponent) {
      availableRecipes = availableRecipes.sort((a, b) => {
        const aMatch = a.mealComponent === currentRecipe.mealComponent ? 1 : 0;
        const bMatch = b.mealComponent === currentRecipe.mealComponent ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    // Filter by search query
    if (swapSearchQuery.trim()) {
      const query = swapSearchQuery.toLowerCase();
      availableRecipes = availableRecipes.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query)) ||
          r.mealComponent?.toLowerCase().includes(query)
      );
    }

    return availableRecipes;
  };

  const availableSwapRecipes = getAvailableSwapRecipes();
  const currentSwappingRecipe = swapTargetMeal ? getRecipeById(swapTargetMeal.recipeId) : null;

  // Handle dragging one recipe onto another to group them
  const handleDropRecipeOnRecipe = async (draggedMealId: string, targetMealId: string) => {
    if (!editingPlan || draggedMealId === targetMealId) return;

    try {
      const draggedMeal = editingPlan.meals.find((m) => m.id === draggedMealId);
      const targetMeal = editingPlan.meals.find((m) => m.id === targetMealId);

      if (!draggedMeal || !targetMeal) return;

      // If target already has a group, add dragged to that group
      // If target doesn't have a group, create a new group for both
      const newGroupId = targetMeal.mealGroupId || crypto.randomUUID();

      const updatedMeals = editingPlan.meals.map((m) => {
        if (m.id === draggedMealId || m.id === targetMealId) {
          return { ...m, mealGroupId: newGroupId };
        }
        return m;
      });

      await mealPlanAPI.update(editingPlan.id, {
        meals: updatedMeals,
      });

      const updatedPlan = { ...editingPlan, meals: updatedMeals };
      setEditingPlan(updatedPlan);
      setMealPlans(mealPlans.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      toast.success("Recipes grouped into complete meal");
    } catch (error) {
      console.error("Failed to group recipes:", error);
      toast.error("Failed to group recipes");
    }
  };

  // Handle ungrouping a recipe
  const handleUngroupRecipe = async (mealId: string) => {
    if (!editingPlan) return;

    try {
      const updatedMeals = editingPlan.meals.map((m) =>
        m.id === mealId ? { ...m, mealGroupId: undefined } : m
      );

      await mealPlanAPI.update(editingPlan.id, {
        meals: updatedMeals,
      });

      const updatedPlan = { ...editingPlan, meals: updatedMeals };
      setEditingPlan(updatedPlan);
      setMealPlans(mealPlans.map((p) => (p.id === editingPlan.id ? updatedPlan : p)));
      toast.success("Recipe ungrouped");
    } catch (error) {
      console.error("Failed to ungroup recipe:", error);
      toast.error("Failed to ungroup recipe");
    }
  };

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading saved plans...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Empty State */}
      {mealPlans.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <FolderHeart className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              No Saved Plans Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Start saving recipes to meal plans from the recipe library
            </p>
            <Link to="/">
              <Button className="bg-primary hover:bg-primary/90 rounded-lg">
                Browse Recipes
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mealPlans.map((plan) => {
            const recipeCount = plan.meals.length;
            const planRecipes = plan.meals
              .map((m) => getRecipeById(m.recipeId))
              .filter((r): r is Recipe => r !== undefined);

            return (
              <Card
                key={plan.id}
                className="border-border/50 overflow-hidden hover:border-primary/30 transition-all group"
              >
                <CardContent className="p-6">
                  {/* Plan Header */}
                  <Link to={`/meal-plans/${plan.id}`}>
                  <div className="mb-4 cursor-pointer">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}</span>
                      <span>•</span>
                      <span>
                        {new Date(plan.dateCreated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  </Link>

                  {/* Recipe Preview */}
                  {planRecipes.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {planRecipes.slice(0, 3).map((recipe) => (
                        <Link
                          key={recipe.id}
                          to={`/recipes/${recipe.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group/item"
                        >
                          {recipe.image && (
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover/item:text-primary">
                              {recipe.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCookingTime(recipe.cookingTime)}
                            </p>
                          </div>
                        </Link>
                      ))}
                      {planRecipes.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          +{planRecipes.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 mb-4">
                      <p className="text-sm text-muted-foreground">No recipes yet</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/edit-meal-plan/${plan.id}`)}
                      className="flex-1 rounded-lg border-border/50"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col overflow-hidden">
          <DndProvider backend={HTML5Backend}>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-primary" />
                {editingPlan?.name}
              </DialogTitle>
              <DialogDescription>
                Edit recipes in this meal plan. Drag recipes onto each other to create complete meal groupings.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Toggle between view and add */}
              <div className="flex gap-2 mb-4 flex-shrink-0">
                <Button
                  variant={!isAddingRecipes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingRecipes(false)}
                  className="flex-1 rounded-lg"
                >
                  Recipes ({editingPlan?.meals.length || 0})
                </Button>
                <Button
                  variant={isAddingRecipes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingRecipes(true)}
                  className="flex-1 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Recipes
                </Button>
              </div>

              {!isAddingRecipes ? (
                /* View existing recipes - with meal grouping */
                <ScrollArea className="flex-1 pr-2 min-h-0">
                  {editingPlan && editingPlan.meals.length > 0 ? (
                    (() => {
                      const { groups, ungrouped } = groupMeals(editingPlan.meals);
                      
                      return (
                        <div className="space-y-3">
                          {/* Render grouped meals (complete meals) */}
                          {groups.map((group, groupIndex) => {
                            const groupRecipes = group
                              .map((m) => getRecipeById(m.recipeId))
                              .filter((r): r is Recipe => r !== undefined);

                            if (groupRecipes.length === 0) return null;

                            return (
                              <div
                                key={`group-${groupIndex}`}
                                className="border-2 border-primary/20 rounded-lg p-3 bg-primary/5"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                                  <span className="text-xs font-medium text-primary">
                                    Complete Meal
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({groupRecipes.length} recipes)
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  {group.map((meal) => {
                                    const recipe = getRecipeById(meal.recipeId);
                                    if (!recipe) return null;

                                    return (
                                      <DraggableGroupedRecipeCard
                                        key={meal.id}
                                        meal={meal}
                                        recipe={recipe}
                                        onDrop={handleDropRecipeOnRecipe}
                                        onOpenSwap={() => handleOpenSwapModal(meal)}
                                        onRemove={() => handleRemoveRecipe(meal.id)}
                                        onUngroup={() => handleUngroupRecipe(meal.id)}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Render ungrouped meals (single recipes) */}
                          {ungrouped.map((meal) => {
                            const recipe = getRecipeById(meal.recipeId);
                            if (!recipe) return null;

                            return (
                              <DraggableRecipeCard
                                key={meal.id}
                                meal={meal}
                                recipe={recipe}
                                onDrop={handleDropRecipeOnRecipe}
                                onOpenSwap={() => handleOpenSwapModal(meal)}
                                onRemove={() => handleRemoveRecipe(meal.id)}
                              />
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <FolderHeart className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">No recipes in this plan yet</p>
                      <Button
                        onClick={() => setIsAddingRecipes(true)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Recipes
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                /* Add new recipes */
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search recipes..."
                        className="pl-9 bg-card border-border/50"
                      />
                    </div>
                  </div>

                  <ScrollArea className="flex-1 pr-3">
                    {filteredRecipes.length > 0 ? (
                      <div className="space-y-2">
                        {filteredRecipes.map((recipe) => {
                          const isInPlan = editingPlan?.meals.some((m) => m.recipeId === recipe.id);

                          return (
                            <button
                              key={recipe.id}
                              onClick={() => !isInPlan && handleAddRecipe(recipe.id)}
                              disabled={isInPlan}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                isInPlan
                                  ? "border-primary/20 bg-primary/5 cursor-not-allowed"
                                  : "border-border/50 hover:border-primary/30 hover:bg-accent"
                              }`}
                            >
                              {recipe.image && (
                                <img
                                  src={recipe.image}
                                  alt={recipe.name}
                                  className="w-16 h-16 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{recipe.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCookingTime(recipe.cookingTime)} • {recipe.servings} servings
                                </p>
                                {recipe.tags.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {recipe.tags.slice(0, 2).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className="text-xs border-border/50"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isInPlan && (
                                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? "No recipes found" : "No recipes available"}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </DndProvider>
        </DialogContent>
      </Dialog>

      {/* Swap Recipe Modal */}
      <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FolderHeart className="w-5 h-5 text-primary" />
              Swap Recipe
            </DialogTitle>
            <DialogDescription>
              Select a new recipe to replace the current one in the meal plan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search for new recipe */}
            <div className="mb-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={swapSearchQuery}
                  onChange={(e) => setSwapSearchQuery(e.target.value)}
                  placeholder="Search recipes..."
                  className="pl-9 bg-card border-border/50"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 pr-3">
              {availableSwapRecipes.length > 0 ? (
                <div className="space-y-2">
                  {availableSwapRecipes.map((recipe) => {
                    return (
                      <button
                        key={recipe.id}
                        onClick={() => handleSwapRecipe(recipe.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          "border-border/50 hover:border-primary/30 hover:bg-accent"
                        }`}
                      >
                        {recipe.image && (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{recipe.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCookingTime(recipe.cookingTime)} • {recipe.servings} servings
                          </p>
                          {recipe.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {recipe.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs border-border/50"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">
                    {swapSearchQuery ? "No recipes found" : "No recipes available"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}