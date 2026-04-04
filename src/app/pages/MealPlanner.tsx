import { useState, useEffect } from "react";
import { recipeAPI, mealPlanAPI } from "../services/api";
import { Recipe } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { formatCookingTime } from "../utils/formatTime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Sparkles,
  Loader2,
  ChefHat,
  Clock,
  Users,
  TrendingUp,
  Shuffle,
  Save,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Zap,
  Plus,
  Search,
  X,
} from "lucide-react";
import { CookingMethod, RecipeTag, AIInsights, PlannedMeal } from "../types";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const availableMethods: CookingMethod[] = [
  "stovetop",
  "oven",
  "air fryer",
  "slow cooker",
  "instant pot",
  "grill",
  "microwave",
  "rice cooker",
  "no cook",
];

const cookingMethodIcons: Record<CookingMethod, string> = {
  "stovetop": "🍳",
  "oven": "🔥",
  "air fryer": "💨",
  "slow cooker": "🥘",
  "instant pot": "⚡",
  "grill": "🔥",
  "microwave": "📡",
  "rice cooker": "🍚",
  "no cook": "✨",
};

function selectOptimalRecipes(recipes: Recipe[], count: number): Recipe[] {
  // Simple random selection
  const shuffled = [...recipes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateMealPlanReasoning(
  recipes: Recipe[],
  sharedIngredients: string[],
  methodDistribution: Record<CookingMethod, number>,
  rules: any
): string {
  return `Selected ${recipes.length} recipes with balanced variety.`;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface MealPlannerProps {
  onClose?: () => void;
}

export function MealPlanner({ onClose }: MealPlannerProps) {
  const [step, setStep] = useState<"config" | "generating" | "review">("config");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  // Configuration state
  const [mainCourses, setMainCourses] = useState(3);
  const [snacks, setSnacks] = useState(0);
  const [desserts, setDesserts] = useState(0);
  const [allergyFriendlyOnly, setAllergyFriendlyOnly] = useState(false);
  const [highProtein, setHighProtein] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<CookingMethod[]>([]);
  const [mealsPerWeek, setMealsPerWeek] = useState([5]);
  const [maxCookingTime, setMaxCookingTime] = useState([60]);

  // Generated plan state
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [showInsights, setShowInsights] = useState(true);

  // Dialog state for adding/swapping recipes
  const [isRecipeBrowserOpen, setIsRecipeBrowserOpen] = useState(false);
  const [recipeBrowserMode, setRecipeBrowserMode] = useState<"add" | "swap">("add");
  const [swapTargetMealId, setSwapTargetMealId] = useState<string | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");

  // Load recipes on mount
  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setIsLoadingRecipes(true);
      const data = await recipeAPI.getAll();
      setRecipes(data);
    } catch (error) {
      console.error("Failed to load recipes:", error);
      toast.error("Failed to load recipes");
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const toggleMethod = (method: CookingMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const generateMealPlan = () => {
    const totalMeals = mainCourses + snacks + desserts;
    
    if (totalMeals === 0) {
      toast.error("Please select at least one meal to generate a plan");
      return;
    }

    setStep("generating");

    // Simulate generation
    setTimeout(() => {
      // Use all recipes for generation
      let eligibleRecipes = [...recipes];

      if (eligibleRecipes.length === 0) {
        toast.error("No recipes available. Please add some recipes first.");
        setStep("config");
        return;
      }

      // Select random recipes based on meal count
      const selectedRecipes = selectOptimalRecipes(eligibleRecipes, totalMeals);
      const meals: PlannedMeal[] = selectedRecipes.map((recipe, index) => ({
        id: `meal-${index}`,
        recipeId: recipe.id,
        dayOfWeek: index,
        mealType: "dinner",
      }));

      setPlannedMeals(meals);

      // Generate AI insights
      const allIngredients = selectedRecipes.flatMap((r) => r.ingredients.map((i) => i.name));
      const ingredientCounts = allIngredients.reduce((acc, ing) => {
        acc[ing] = (acc[ing] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sharedIngredients = Object.entries(ingredientCounts)
        .filter(([_, count]) => count >= 2)
        .map(([ing]) => ing)
        .slice(0, 5);

      const methodDistribution: Record<CookingMethod, number> = {
        stovetop: 0,
        oven: 0,
        "air fryer": 0,
        "slow cooker": 0,
        "instant pot": 0,
        grill: 0,
        microwave: 0,
        "rice cooker": 0,
        "no cook": 0,
      };

      selectedRecipes.forEach((recipe) => {
        recipe.cookingMethod.forEach((method) => {
          methodDistribution[method]++;
        });
      });

      const insights: AIInsights = {
        sharedIngredients,
        applianceDistribution: methodDistribution,
        nutritionSummary: "Balanced nutrition across all meals",
        tagAlignment: [
          `${mainCourses} main ${mainCourses === 1 ? 'course' : 'courses'}`,
          snacks > 0 ? `${snacks} ${snacks === 1 ? 'snack' : 'snacks'}` : '',
          desserts > 0 ? `${desserts} ${desserts === 1 ? 'dessert' : 'desserts'}` : '',
          `Average cooking time: ${Math.round(
            selectedRecipes.reduce((sum, r) => sum + r.cookingTime, 0) / selectedRecipes.length
          )} minutes`,
        ].filter(Boolean),
        reasoning: generateMealPlanReasoning(
          selectedRecipes,
          sharedIngredients,
          methodDistribution,
          {
            allergyFriendlyOnly: false,
            highProtein: false,
            selectedMethods: [],
            maxCookingTime: 180,
          }
        ),
      };

      setAiInsights(insights);
      setStep("review");
      toast.success("Meal plan generated!");
    }, 2000);
  };

  const swapRecipe = (mealId: string) => {
    setRecipeBrowserMode("swap");
    setSwapTargetMealId(mealId);
    setIsRecipeBrowserOpen(true);
  };

  const getRecipeForMeal = (meal: PlannedMeal): Recipe | undefined => {
    return recipes.find((r) => r.id === meal.recipeId);
  };

  const saveMealPlan = async () => {
    try {
      const plan = {
        name: `Meal Plan - ${new Date().toLocaleDateString()}`,
        rules: {
          allergyFriendlyOnly,
          highProtein,
          preferredCookingMethods: selectedMethods,
          mealsPerWeek: mealsPerWeek[0],
          maxCookingTime: maxCookingTime[0],
          requiredTags: [],
          excludedTags: [],
        },
        meals: plannedMeals,
        aiInsights,
      };

      await mealPlanAPI.create(plan);
      toast.success("Meal plan saved successfully!");
    } catch (error) {
      console.error("Failed to save meal plan:", error);
      toast.error("Failed to save meal plan");
    }
  };

  const addRecipeManually = () => {
    setRecipeBrowserMode("add");
    setIsRecipeBrowserOpen(true);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (recipeBrowserMode === "swap" && swapTargetMealId) {
      // Swap the recipe
      setPlannedMeals((prev) =>
        prev.map((meal) =>
          meal.id === swapTargetMealId ? { ...meal, recipeId: recipe.id } : meal
        )
      );
      toast.success(`Swapped to ${recipe.name}`);
    } else {
      // Add new meal
      const nextDayIndex = plannedMeals.length;
      if (nextDayIndex >= 7) {
        toast.error("Maximum 7 meals per week");
        return;
      }
      const newMeal: PlannedMeal = {
        id: `meal-${Date.now()}`,
        recipeId: recipe.id,
        dayOfWeek: nextDayIndex,
        mealType: "dinner",
      };
      setPlannedMeals((prev) => [...prev, newMeal]);
      toast.success(`Added ${recipe.name} to your meal plan`);
    }
    setIsRecipeBrowserOpen(false);
    setRecipeSearchQuery("");
  };

  const randomSwapRecipe = (mealId: string) => {
    const currentMeal = plannedMeals.find((m) => m.id === mealId);
    if (!currentMeal) return;

    const availableRecipes = recipes.filter((r) => r.id !== currentMeal.recipeId);
    if (availableRecipes.length === 0) {
      toast.error("No other recipes available");
      return;
    }

    const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
    setPlannedMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId ? { ...meal, recipeId: randomRecipe.id } : meal
      )
    );
    toast.success(`Swapped to ${randomRecipe.name}`);
  };

  const removeMeal = (mealId: string) => {
    setPlannedMeals((prev) => {
      const filtered = prev.filter((meal) => meal.id !== mealId);
      // Re-index days
      return filtered.map((meal, index) => ({ ...meal, dayOfWeek: index }));
    });
    toast.success("Meal removed");
  };

  const filteredRecipesInBrowser = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  );

  if (step === "generating") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Creating Your Meal Plan
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecting complementary recipes...
          </p>
        </div>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Close button for full-screen mode */}
        {onClose && (
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Your Meal Plan</h1>
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

        {/* Header (if no close button) */}
        {!onClose && (
          <div className="mb-10">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Your Meal Plan</h1>
            <p className="text-muted-foreground text-sm">
              Review and save your weekly meal plan
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <Button variant="outline" onClick={() => setStep("config")} className="border-border/50">
            New Plan
          </Button>
          <Button
            variant="outline"
            onClick={addRecipeManually}
            className="border-border/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Meal
          </Button>
          <Button
            onClick={saveMealPlan}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Plan
          </Button>
        </div>

        {/* Meal Plan Grid */}
        <div className="space-y-4">
          {plannedMeals.map((meal, index) => {
            const recipe = getRecipeForMeal(meal);
            if (!recipe) return null;

            return (
              <Card key={meal.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                <div className="flex flex-col sm:flex-row">
                  {/* Day Label */}
                  <div className="sm:w-32 bg-muted/50 p-6 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-border/50">
                    <div className="text-center">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {daysOfWeek[meal.dayOfWeek]}
                      </p>
                      <p className="text-xl font-semibold text-foreground">
                        Day {meal.dayOfWeek + 1}
                      </p>
                    </div>
                  </div>

                  {/* Recipe Content */}
                  <div className="flex-1 flex flex-col sm:flex-row">
                    {/* Recipe Image */}
                    {recipe.image && (
                      <div className="sm:w-48 h-48 sm:h-auto">
                        <img
                          src={recipe.image}
                          alt={recipe.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Recipe Info */}
                    <div className="flex-1 p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        {recipe.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{formatCookingTime(recipe.cookingTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{recipe.servings} servings</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {recipe.cookingMethod.slice(0, 2).map((method) => (
                            <span key={method} className="text-base">
                              {cookingMethodIcons[method]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {recipe.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => swapRecipe(meal.id)}
                          className="border-border/50"
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Swap Recipe
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => randomSwapRecipe(meal.id)}
                          className="border-border/50"
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Random Swap
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMeal(meal.id)}
                          className="border-border/50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove Meal
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Configuration Step
  return (
    <div className="max-w-4xl mx-auto">
      {/* Close button for full-screen mode */}
      {onClose && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Roulette Style</h2>
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

      <Card className="border-border/50">
        <CardContent className="p-8 space-y-6">
          {/* Main Courses Per Week */}
          <div className="space-y-3">
            <Label htmlFor="main-courses" className="text-sm font-medium">
              Main Courses Per Week
            </Label>
            <Select
              value={mainCourses.toString()}
              onValueChange={(value) => setMainCourses(parseInt(value))}
            >
              <SelectTrigger id="main-courses" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "main course" : "main courses"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Snacks Per Week */}
          <div className="space-y-3">
            <Label htmlFor="snacks" className="text-sm font-medium">
              Snacks Per Week (Optional)
            </Label>
            <Select
              value={snacks.toString()}
              onValueChange={(value) => setSnacks(parseInt(value))}
            >
              <SelectTrigger id="snacks" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "snack" : "snacks"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desserts Per Week */}
          <div className="space-y-3">
            <Label htmlFor="desserts" className="text-sm font-medium">
              Desserts Per Week (Optional)
            </Label>
            <Select
              value={desserts.toString()}
              onValueChange={(value) => setDesserts(parseInt(value))}
            >
              <SelectTrigger id="desserts" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? "dessert" : "desserts"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateMealPlan}
            disabled={isLoadingRecipes || (mainCourses === 0 && snacks === 0 && desserts === 0)}
            className="w-full h-11 bg-primary hover:bg-primary/90 mt-4"
          >
            Generate Meal Plan
          </Button>
        </CardContent>
      </Card>

      {/* Recipe Browser Dialog */}
      <Dialog open={isRecipeBrowserOpen} onOpenChange={setIsRecipeBrowserOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {recipeBrowserMode === "swap" ? "Select Replacement Recipe" : "Add Recipe to Meal Plan"}
            </DialogTitle>
            <DialogDescription>
              {recipeBrowserMode === "swap" 
                ? "Choose a recipe to replace the current meal" 
                : "Choose a recipe to add to your meal plan"}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search recipes..."
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Recipe List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredRecipesInBrowser.map((recipe) => (
              <Card
                key={recipe.id}
                className="cursor-pointer border-border/50 hover:border-border transition-colors"
                onClick={() => handleSelectRecipe(recipe)}
              >
                <div className="flex gap-4 p-4">
                  {recipe.image && (
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{recipe.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatCookingTime(recipe.cookingTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {filteredRecipesInBrowser.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No recipes found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}