import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { MealPlan, Recipe, PlannedMeal } from "../types";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  X,
  Check,
  UtensilsCrossed,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { formatCookingTime } from "../utils/formatTime";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

const RECIPE_CARD_TYPE = "RECIPE_CARD";

// Drop Zone Component for reordering
interface DropZoneProps {
  index: number;
  onDrop: (draggedMealId: string, targetIndex: number) => void;
}

function DropZone({ index, onDrop }: DropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: RECIPE_CARD_TYPE,
    drop: (item: { mealId: string }) => {
      onDrop(item.mealId, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`transition-all ${
        isOver
          ? "h-16 border-2 border-dashed border-primary bg-primary/5 rounded-lg my-2"
          : "h-2 my-1"
      }`}
    />
  );
}

// Draggable Recipe Card Component (for ungrouped recipes)
interface DraggableRecipeCardProps {
  meal: PlannedMeal;
  recipe: Recipe;
  onDrop: (draggedMealId: string, targetMealId: string) => void;
  onOpenSwap: () => void;
  onRemove: () => void;
}

function DraggableRecipeCard({
  meal,
  recipe,
  onDrop,
  onOpenSwap,
  onRemove,
}: DraggableRecipeCardProps) {
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

export function EditMealPlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRecipes, setIsAddingRecipes] = useState(false);

  // Swap modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTargetMeal, setSwapTargetMeal] = useState<PlannedMeal | null>(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState("");

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const [planData, recipesData] = await Promise.all([
        mealPlanAPI.getById(id),
        recipeAPI.getAll(),
      ]);
      setMealPlan(planData);
      setRecipes(recipesData);
    } catch (error) {
      console.error("Failed to load meal plan:", error);
      toast.error("Failed to load meal plan");
      navigate("/meal-plans?tab=saved");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecipeById = (recipeId: string) => {
    return recipes.find((r) => r.id === recipeId);
  };

  const handleRemoveRecipe = async (mealId: string) => {
    if (!mealPlan) return;

    try {
      const updatedMeals = mealPlan.meals.filter((m) => m.id !== mealId);

      await mealPlanAPI.update(mealPlan.id, {
        meals: updatedMeals,
      });

      setMealPlan({ ...mealPlan, meals: updatedMeals });
      toast.success("Recipe removed from meal plan");
    } catch (error) {
      console.error("Failed to remove recipe:", error);
      toast.error("Failed to remove recipe");
    }
  };

  const handleAddRecipe = async (recipeId: string) => {
    if (!mealPlan) return;

    // Check if recipe is already in plan
    const alreadyExists = mealPlan.meals.some((m) => m.recipeId === recipeId);
    if (alreadyExists) {
      toast.info("Recipe is already in this meal plan");
      return;
    }

    try {
      const updatedMeals = [
        ...mealPlan.meals,
        {
          id: crypto.randomUUID(),
          recipeId,
          dayOfWeek: 0,
        },
      ];

      await mealPlanAPI.update(mealPlan.id, {
        meals: updatedMeals,
      });

      setMealPlan({ ...mealPlan, meals: updatedMeals });

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

  // Handle opening swap modal
  const handleOpenSwapModal = (meal: PlannedMeal) => {
    setSwapTargetMeal(meal);
    setSwapSearchQuery("");
    setSwapModalOpen(true);
  };

  // Handle swapping a recipe
  const handleSwapRecipe = async (newRecipeId: string) => {
    if (!mealPlan || !swapTargetMeal) return;

    try {
      const updatedMeals = mealPlan.meals.map((m) =>
        m.id === swapTargetMeal.id ? { ...m, recipeId: newRecipeId } : m
      );

      await mealPlanAPI.update(mealPlan.id, {
        meals: updatedMeals,
      });

      setMealPlan({ ...mealPlan, meals: updatedMeals });
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
    let availableRecipes = recipes.filter(
      (r) => r.id !== swapTargetMeal.recipeId
    );

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

  // Clean up groups with less than 2 members
  const cleanupGroups = (meals: PlannedMeal[]) => {
    const groupCounts: { [key: string]: number } = {};
    meals.forEach((m) => {
      if (m.mealGroupId) {
        groupCounts[m.mealGroupId] = (groupCounts[m.mealGroupId] || 0) + 1;
      }
    });

    return meals.map((m) => {
      if (m.mealGroupId && groupCounts[m.mealGroupId] < 2) {
        return { ...m, mealGroupId: undefined };
      }
      return m;
    });
  };

  // Handle reordering meals by dropping into zones
  const handleReorder = async (draggedMealId: string, targetIndex: number) => {
    if (!mealPlan) return;

    try {
      const draggedIndex = mealPlan.meals.findIndex((m) => m.id === draggedMealId);
      if (draggedIndex === -1) return;

      // Create a copy of the meals array
      const updatedMeals = [...mealPlan.meals];

      // Remove the dragged meal
      const [draggedMeal] = updatedMeals.splice(draggedIndex, 1);

      // Insert at the new position
      // If dragging down, targetIndex doesn't need adjustment
      // If dragging up, targetIndex is already correct
      const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      updatedMeals.splice(insertIndex, 0, draggedMeal);

      // Clean up any groups with only 1 member
      const cleanedMeals = cleanupGroups(updatedMeals);

      await mealPlanAPI.update(mealPlan.id, {
        meals: cleanedMeals,
      });

      setMealPlan({ ...mealPlan, meals: cleanedMeals });
      toast.success("Meal reordered");
    } catch (error) {
      console.error("Failed to reorder meal:", error);
      toast.error("Failed to reorder meal");
    }
  };

  // Handle dragging one recipe onto another to group them
  const handleDropRecipeOnRecipe = async (
    draggedMealId: string,
    targetMealId: string
  ) => {
    if (!mealPlan || draggedMealId === targetMealId) return;

    try {
      const draggedMeal = mealPlan.meals.find((m) => m.id === draggedMealId);
      const targetMeal = mealPlan.meals.find((m) => m.id === targetMealId);

      if (!draggedMeal || !targetMeal) return;

      // If dragging from a group to an ungrouped item, or between groups,
      // create/join the target's group
      // If target already has a group, add dragged to that group
      // If target doesn't have a group, create a new group for both
      const newGroupId = targetMeal.mealGroupId || crypto.randomUUID();

      let updatedMeals = mealPlan.meals.map((m) => {
        if (m.id === draggedMealId || m.id === targetMealId) {
          return { ...m, mealGroupId: newGroupId };
        }
        return m;
      });

      // Clean up: Remove mealGroupId from groups with only 1 member
      updatedMeals = cleanupGroups(updatedMeals);

      await mealPlanAPI.update(mealPlan.id, {
        meals: updatedMeals,
      });

      setMealPlan({ ...mealPlan, meals: updatedMeals });
      toast.success("Recipes grouped into complete meal");
    } catch (error) {
      console.error("Failed to group recipes:", error);
      toast.error("Failed to group recipes");
    }
  };

  // Handle ungrouping a recipe
  const handleUngroupRecipe = async (mealId: string) => {
    if (!mealPlan) return;

    try {
      let updatedMeals = mealPlan.meals.map((m) =>
        m.id === mealId ? { ...m, mealGroupId: undefined } : m
      );

      // Clean up: Remove mealGroupId from groups with only 1 member after ungrouping
      updatedMeals = cleanupGroups(updatedMeals);

      await mealPlanAPI.update(mealPlan.id, {
        meals: updatedMeals,
      });

      setMealPlan({ ...mealPlan, meals: updatedMeals });
      toast.success("Recipe ungrouped");
    } catch (error) {
      console.error("Failed to ungroup recipe:", error);
      toast.error("Failed to ungroup recipe");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Meal plan not found</p>
          <Button
            onClick={() => navigate("/meal-plans?tab=saved")}
            className="mt-4"
          >
            Back to Meal Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/meal-plans/${id}`)}
            className="mb-4 -ml-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to View
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Edit: {mealPlan.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Drag and drop meals between the gaps to reorder. Drop onto a meal card to group into a complete meal.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Current Recipes */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Recipes in Plan ({mealPlan.meals.length})
                  </h2>
                </div>

                <ScrollArea className="h-[calc(100vh-280px)]">
                  {mealPlan.meals.length > 0 ? (
                    <div className="pr-4">
                      {mealPlan.meals.map((meal, index) => {
                        const recipe = getRecipeById(meal.recipeId);
                        if (!recipe) return null;

                        const isGrouped = !!meal.mealGroupId;
                        const groupMeals = isGrouped
                          ? mealPlan.meals.filter((m) => m.mealGroupId === meal.mealGroupId)
                          : [];
                        const isFirstInGroup = isGrouped && groupMeals[0]?.id === meal.id;
                        const isLastInGroup = isGrouped && groupMeals[groupMeals.length - 1]?.id === meal.id;

                        return (
                          <div key={meal.id}>
                            {/* Drop zone before first item or before ungrouped items */}
                            {(index === 0 || !isGrouped || isFirstInGroup) && (
                              <DropZone index={index} onDrop={handleReorder} />
                            )}

                            {/* Group header (only for first item in group) */}
                            {isGrouped && isFirstInGroup && (
                              <div className="border-2 border-primary/20 rounded-lg p-3 bg-primary/5 space-y-2 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                                  <span className="text-xs font-medium text-primary">
                                    Complete Meal
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({groupMeals.length} recipes)
                                  </span>
                                </div>
                                {groupMeals.map((groupMeal) => {
                                  const groupRecipe = getRecipeById(groupMeal.recipeId);
                                  if (!groupRecipe) return null;

                                  return (
                                    <DraggableGroupedRecipeCard
                                      key={groupMeal.id}
                                      meal={groupMeal}
                                      recipe={groupRecipe}
                                      onDrop={handleDropRecipeOnRecipe}
                                      onOpenSwap={() => handleOpenSwapModal(groupMeal)}
                                      onRemove={() => handleRemoveRecipe(groupMeal.id)}
                                      onUngroup={() => handleUngroupRecipe(groupMeal.id)}
                                    />
                                  );
                                })}
                              </div>
                            )}

                            {/* Ungrouped meal card */}
                            {!isGrouped && (
                              <div className="mb-3">
                                <DraggableRecipeCard
                                  meal={meal}
                                  recipe={recipe}
                                  onDrop={handleDropRecipeOnRecipe}
                                  onOpenSwap={() => handleOpenSwapModal(meal)}
                                  onRemove={() => handleRemoveRecipe(meal.id)}
                                />
                              </div>
                            )}

                            {/* Drop zone after last item or after ungrouped/last-in-group items */}
                            {(index === mealPlan.meals.length - 1 || !isGrouped || isLastInGroup) && (
                              <DropZone index={index + 1} onDrop={handleReorder} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <UtensilsCrossed className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        No recipes in this plan yet
                      </p>
                      <p className="text-xs text-muted-foreground text-center max-w-xs">
                        Add recipes from the panel on the right to get started
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Add Recipes */}
          <div className="lg:col-span-1">
            <Card className="border-border/50 sticky top-8">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Add Recipes
                  </h2>
                </div>

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

                <ScrollArea className="h-[calc(100vh-340px)]">
                  {filteredRecipes.length > 0 ? (
                    <div className="space-y-2 pr-4">
                      {filteredRecipes.map((recipe) => {
                        const isInPlan = mealPlan.meals.some(
                          (m) => m.recipeId === recipe.id
                        );

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
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {recipe.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCookingTime(recipe.cookingTime)}
                              </p>
                            </div>
                            {isInPlan && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Swap Recipe Modal */}
        <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
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
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-accent transition-all text-left"
                        >
                          {recipe.image && (
                            <img
                              src={recipe.image}
                              alt={recipe.name}
                              className="w-16 h-16 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {recipe.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCookingTime(recipe.cookingTime)} •{" "}
                              {recipe.servings} servings
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
                      {swapSearchQuery
                        ? "No recipes found"
                        : "No recipes available"}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
