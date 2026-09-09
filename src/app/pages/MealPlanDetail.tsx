import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { Recipe, MealPlan, PlannedMeal } from "../types";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  UtensilsCrossed,
  Clock,
  Users,
  Trash2,
  Pencil,
  MessageSquare,
  NotebookPen,
} from "lucide-react";
import { toast } from "sonner";
import { formatCookingTime } from "../utils/formatTime";

// Compact inline note editor, reused for both the per-meal comment and the
// overall meal-plan notes. Stops propagation so it can sit inside a card
// that's otherwise a navigation link.
interface InlineNoteProps {
  value?: string;
  onSave: (text: string) => void;
  placeholder: string;
  emptyLabel: string;
}

function InlineNote({ value, onSave, placeholder, emptyLabel }: InlineNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(value || "");
    setIsEditing(true);
  };

  const cancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
  };

  const save = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave(draft.trim());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mt-2" onClick={(e) => e.preventDefault()}>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className="text-sm min-h-[70px] bg-card"
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={save} className="h-7 rounded-md">
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="h-7 rounded-md">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-2">
        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="flex-1 text-xs text-muted-foreground whitespace-pre-wrap">{value}</p>
        <button
          onClick={startEditing}
          className="flex-shrink-0 text-muted-foreground hover:text-primary"
          title="Edit note"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      {emptyLabel}
    </button>
  );
}

export function MealPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMealPlan();
    }
  }, [id]);

  const loadMealPlan = async () => {
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

  const handleDeletePlan = async () => {
    if (!mealPlan) return;

    if (!confirm(`Are you sure you want to delete "${mealPlan.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await mealPlanAPI.delete(mealPlan.id);
      toast.success("Meal plan deleted successfully");
      navigate("/meal-plans?tab=saved");
    } catch (error) {
      console.error("Failed to delete meal plan:", error);
      toast.error("Failed to delete meal plan");
    }
  };

  // Save a comment for one meal - a "meal" is a single recipe, or every
  // recipe in a Complete Meal group, which all carry the same comment so it
  // reads consistently no matter which member is shown as the group's face.
  const handleSaveMealComment = async (mealIds: string[], comment: string) => {
    if (!mealPlan) return;

    try {
      const updatedMeals = mealPlan.meals.map((m) =>
        mealIds.includes(m.id) ? { ...m, comment: comment || undefined } : m
      );

      await mealPlanAPI.update(mealPlan.id, { meals: updatedMeals });
      setMealPlan({ ...mealPlan, meals: updatedMeals });
      toast.success("Note saved");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    }
  };

  const handleSavePlanNotes = async (notes: string) => {
    if (!mealPlan) return;

    try {
      await mealPlanAPI.update(mealPlan.id, { notes: notes || undefined });
      setMealPlan({ ...mealPlan, notes: notes || undefined });
      toast.success("Notes saved");
    } catch (error) {
      console.error("Failed to save notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // Group meals by mealGroupId only (no day grouping)
  const groupMeals = () => {
    if (!mealPlan) return { groups: [], ungrouped: [] };

    const groups: { [key: string]: PlannedMeal[] } = {};
    const ungrouped: PlannedMeal[] = [];

    mealPlan.meals.forEach((meal) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Meal plan not found</p>
        <Button
          onClick={() => navigate("/meal-plans?tab=saved")}
          className="mt-4"
        >
          Back to Meal Plans
        </Button>
      </div>
    );
  }

  const { groups, ungrouped } = groupMeals();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/meal-plans?tab=saved")}
          className="mb-4 -ml-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meal Plans
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2 break-words">
              {mealPlan.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{new Date(mealPlan.dateCreated).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4" />
                <span>{mealPlan.meals.length} recipes</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/edit-meal-plan/${id}`)}
              className="rounded-lg"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeletePlan}
              className="rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50/50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Plan Notes */}
      <Card className="border-border/50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
            <NotebookPen className="w-4 h-4 text-primary" />
            Notes
          </div>
          <p className="text-xs text-muted-foreground">
            Jot down whether you'd repeat this plan or how to prep for it.
          </p>
          <InlineNote
            value={mealPlan.notes}
            onSave={handleSavePlanNotes}
            placeholder="e.g. Chop all veggies Sunday night, this combo reheats great..."
            emptyLabel="Add notes about this meal plan"
          />
        </CardContent>
      </Card>

      {/* Meal Plan Content */}
      <div className="space-y-6">
        {mealPlan.meals.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No meals in this plan yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Grouped Meals (Complete Meals) */}
            {groups.map((group, groupIndex) => {
              const groupRecipes = group
                .map((m) => getRecipeById(m.recipeId))
                .filter((r): r is Recipe => r !== undefined);

              if (groupRecipes.length === 0) return null;

              return (
                <Card
                  key={`group-${groupIndex}`}
                  className="border-2 border-primary/20 bg-primary/5 overflow-hidden"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UtensilsCrossed className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Complete Meal
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {groupRecipes.length} recipes
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.map((meal) => {
                        const recipe = getRecipeById(meal.recipeId);
                        if (!recipe) return null;

                        return (
                          <Link
                            key={meal.id}
                            to={`/recipes/${recipe.id}`}
                            className="block"
                          >
                            <Card className="border-border/30 overflow-hidden hover:border-primary/50 transition-all h-full">
                              <CardContent className="p-3">
                                <div className="flex gap-3">
                                  {recipe.image && (
                                    <img
                                      src={recipe.image}
                                      alt={recipe.name}
                                      className="w-20 h-20 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground hover:text-primary transition-colors mb-1 truncate">
                                      {recipe.name}
                                    </h3>
                                    {recipe.mealComponent && (
                                      <Badge variant="outline" className="text-xs mb-2">
                                        {recipe.mealComponent}
                                      </Badge>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatCookingTime(recipe.cookingTime)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>{recipe.servings}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>

                    <InlineNote
                      value={group[0]?.comment}
                      onSave={(text) => handleSaveMealComment(group.map((m) => m.id), text)}
                      placeholder="e.g. Loved this pairing, make again! Prep the rice the night before..."
                      emptyLabel="Add a note for this meal"
                    />
                  </CardContent>
                </Card>
              );
            })}

            {/* Ungrouped Meals */}
            {ungrouped.map((meal) => {
              const recipe = getRecipeById(meal.recipeId);
              if (!recipe) return null;

              return (
                <Link
                  key={meal.id}
                  to={`/recipes/${recipe.id}`}
                  className="block"
                >
                  <Card className="border-border/50 overflow-hidden hover:border-primary/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {recipe.image && (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-24 h-24 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-foreground hover:text-primary transition-colors mb-2 truncate">
                            {recipe.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              <span>{formatCookingTime(recipe.cookingTime)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              <span>{recipe.servings} servings</span>
                            </div>
                          </div>

                          <InlineNote
                            value={meal.comment}
                            onSave={(text) => handleSaveMealComment([meal.id], text)}
                            placeholder="e.g. Loved this one, make again! Prep the marinade the night before..."
                            emptyLabel="Add a note for this meal"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
