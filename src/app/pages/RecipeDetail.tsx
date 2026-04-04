import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { recipeAPI } from "../services/api";
import { Recipe, RecipeTag, CookingMethod, RecipeCategory, MealComponent, CuisineType } from "../types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { SaveToMealPlanDialog } from "../components/SaveToMealPlanDialog";
import { RecipePairingsManager } from "../components/RecipePairingsManager";
import { CookingMode } from "../components/CookingMode";
import { formatCookingTime } from "../utils/formatTime";
import {
  Clock,
  Users,
  ChefHat,
  ExternalLink,
  Heart,
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  X,
  Check,
  Upload,
  CalendarPlus,
  Star,
  Flame,
  Trash2,
  UtensilsCrossed,
  Play,
} from "lucide-react";
import { toast } from "sonner";

const cookingMethods: CookingMethod[] = [
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

const availableTags: RecipeTag[] = [
  "lily-safe",
  "tried-true",
  "want-to-try",
  "high-protein",
  "quick-easy",
];

const tagLabels: Record<RecipeTag, string> = {
  "lily-safe": "Lily Safe",
  "tried-true": "Tried & True",
  "want-to-try": "Want to Try",
  "high-protein": "High Protein",
  "quick-easy": "Quick & Easy",
};

const availableCategories: Array<Recipe["category"]> = ["appetizer", "side", "main-course", "dessert", "breakfast", "snack"];
const availableMealComponents: Array<Recipe["mealComponent"]> = ["protein", "veggie", "carb", "complete-meal"];
const availableCuisineTypes = ["american", "asian", "hispanic"];

const categoryLabels: Record<string, string> = {
  "side": "Side",
  "appetizer": "Appetizer",
  "main-course": "Main Course",
  "dessert": "Dessert",
  "snack": "Snack",
  "breakfast": "Breakfast",
};

const mealComponentLabels: Record<MealComponent, string> = {
  "protein": "Protein",
  "veggie": "Veggie",
  "carb": "Carb",
  "complete-meal": "Complete Meal",
};

const cuisineTypeLabels: Record<CuisineType, string> = {
  "asian": "Asian",
  "american": "American",
  "hispanic": "Hispanic",
};

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [suggestedPairings, setSuggestedPairings] = useState<Recipe[]>([]);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editServings, setEditServings] = useState(4);
  const [editCookingTime, setEditCookingTime] = useState(30);
  const [editMethods, setEditMethods] = useState<CookingMethod[]>([]);
  const [editCategory, setEditCategory] = useState<RecipeCategory | undefined>(undefined);
  const [editMealComponent, setEditMealComponent] = useState<MealComponent | undefined>(undefined);
  const [editIngredients, setEditIngredients] = useState<string[]>([""]);
  const [editInstructions, setEditInstructions] = useState<string[]>([""]);
  const [editTags, setEditTags] = useState<RecipeTag[]>([]);
  const [editSource, setEditSource] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPairings, setEditPairings] = useState<string[]>([]);
  const [editCuisineTypes, setEditCuisineTypes] = useState<CuisineType[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  // Auto-generate suggested pairings when recipe loads
  useEffect(() => {
    if (recipe && allRecipes.length > 0) {
      const suggested = autoGeneratePairings(recipe, allRecipes);
      setSuggestedPairings(suggested);
    }
  }, [recipe, allRecipes]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const [recipeData, allRecipesData] = await Promise.all([
        recipeAPI.getById(id),
        recipeAPI.getAll(),
      ]);
      setRecipe(recipeData);
      setAllRecipes(allRecipesData);
      console.log("Loaded recipe with image:", recipeData.image);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLoved = async () => {
    if (!recipe) return;
    
    try {
      const updated = await recipeAPI.update(recipe.id, {
        isLoved: !recipe.isLoved,
      });
      setRecipe(updated);
      toast.success(updated.isLoved ? "Added to loved recipes ❤️" : "Removed from loved recipes");
    } catch (error) {
      console.error("Failed to update recipe:", error);
      toast.error("Failed to update recipe");
    }
  };

  const startEditing = () => {
    if (!recipe) return;
    
    setEditName(recipe.name);
    setEditServings(recipe.servings);
    setEditCookingTime(recipe.cookingTime);
    setEditMethods(recipe.cookingMethod);
    setEditCategory(recipe.category);
    setEditMealComponent(recipe.mealComponent);
    setEditIngredients(recipe.ingredients.map(ing => `${ing.amount} ${ing.name}`));
    setEditInstructions(recipe.instructions);
    setEditTags(recipe.tags);
    setEditSource(recipe.source || "");
    setEditImage(recipe.image || "");
    setEditNotes(recipe.notes || "");
    setEditPairings(recipe.recommendedPairings || []);
    setEditCuisineTypes(recipe.cuisineTypes || []);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setImageFile(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB for reasonable processing)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image is too large. Please use an image under 5MB.");
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            // Compress image to reasonable size
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Resize if too large (max 1200px on longest side)
            const maxSize = 1200;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Convert to JPEG with 85% quality for good compression
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              setEditImage(compressedDataUrl);
              toast.success("Image uploaded and optimized!");
            }
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveChanges = async () => {
    if (!recipe) return;

    try {
      const updatedRecipe = await recipeAPI.update(recipe.id, {
        name: editName,
        servings: editServings,
        cookingTime: editCookingTime,
        cookingMethod: editMethods,
        category: editCategory,
        mealComponent: editMealComponent,
        ingredients: editIngredients
          .filter(i => i.trim())
          .map((ing, idx) => {
            // Simple parsing: try to extract amount from the beginning, rest is the name
            const trimmed = ing.trim();
            const amountMatch = trimmed.match(/^([\d\s\/\.\-]+(?:oz|lb|g|kg|ml|l|tsp|tbsp|cup|cups|teaspoon|tablespoon|ounce|ounces|pound|pounds|gram|grams)?\\.?\s*(?:\([^)]+\))?) +(.+)$/i);
            
            if (amountMatch) {
              return {
                id: `ing-${idx}`,
                amount: amountMatch[1].trim(),
                name: amountMatch[2].trim(),
                category: "other" as const,
              };
            } else {
              // If parsing fails, store the whole string as the name
              return {
                id: `ing-${idx}`,
                amount: "",
                name: trimmed,
                category: "other" as const,
              };
            }
          }),
        instructions: editInstructions.filter(i => i.trim()),
        tags: editTags,
        source: editSource || undefined,
        image: editImage || undefined,
        notes: editNotes || undefined,
        recommendedPairings: editPairings.length > 0 ? editPairings : undefined,
        cuisineTypes: editCuisineTypes.length > 0 ? editCuisineTypes : undefined,
      });
      
      setRecipe(updatedRecipe);
      setIsEditing(false);
      setImageFile(null);
      toast.success("Recipe updated successfully!");
    } catch (error) {
      console.error("Failed to update recipe:", error);
      toast.error("Failed to update recipe");
    }
  };

  const deleteRecipe = async () => {
    if (!recipe) return;
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await recipeAPI.delete(recipe.id);
      toast.success("Recipe deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      toast.error("Failed to delete recipe");
    }
  };

  const toggleMethod = (method: CookingMethod) => {
    setEditMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const toggleTag = (tag: RecipeTag) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleCuisineType = (cuisineType: CuisineType) => {
    setEditCuisineTypes((prev) =>
      prev.includes(cuisineType) ? prev.filter((c) => c !== cuisineType) : [...prev, cuisineType]
    );
  };

  const addIngredient = () => {
    setEditIngredients([...editIngredients, ""]);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...editIngredients];
    newIngredients[index] = value;
    setEditIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setEditInstructions([...editInstructions, ""]);
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...editInstructions];
    newInstructions[index] = value;
    setEditInstructions(newInstructions);
  };

  const removeInstruction = (index: number) => {
    setEditInstructions(editInstructions.filter((_, i) => i !== index));
  };

  const markAsCooked = async () => {
    if (!recipe) return;
    
    try {
      const currentLog = recipe.timesCookedLog || [];
      const updatedLog = [...currentLog, new Date().toISOString()];
      
      const updated = await recipeAPI.update(recipe.id, {
        timesCookedLog: updatedLog,
      });
      
      setRecipe(updated);
      toast.success(`Marked as cooked! Total times: ${updatedLog.length}`);
    } catch (error) {
      console.error("Failed to update cook log:", error);
      toast.error("Failed to update cook log");
    }
  };

  const updateRating = async (rating: number) => {
    if (!recipe) return;
    
    try {
      const updated = await recipeAPI.update(recipe.id, {
        rating,
      });
      
      setRecipe(updated);
      toast.success(`Rated ${rating} stars!`);
    } catch (error) {
      console.error("Failed to update rating:", error);
      toast.error("Failed to update rating");
    }
  };

  // Helper: Auto-generate smart pairings based on meal components
  const autoGeneratePairings = (currentRecipe: Recipe, availableRecipes: Recipe[]): Recipe[] => {
    // ONLY show pairings for protein recipes
    // Proteins get paired with 1 veggie + 1 carb
    if (currentRecipe.mealComponent !== "protein") return [];
    
    // Filter available recipes (exclude current recipe)
    const availableComponents = availableRecipes.filter(r => r.id !== currentRecipe.id);
    
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
        const aCuisineMatch = hasSameCuisine(currentRecipe, a) ? 20 : 0;
        const bCuisineMatch = hasSameCuisine(currentRecipe, b) ? 20 : 0;
        
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
        const aCuisineMatch = hasSameCuisine(currentRecipe, a) ? 20 : 0;
        const bCuisineMatch = hasSameCuisine(currentRecipe, b) ? 20 : 0;
        
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
  const displayPairings = recipe?.recommendedPairings && recipe.recommendedPairings.length > 0
    ? allRecipes.filter(r => recipe.recommendedPairings?.includes(r.id))
    : suggestedPairings;

  const hasPairings = displayPairings.length > 0;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-4">Recipe not found</h1>
        <Link to="/">
          <Button variant="outline" className="rounded-lg">Back to Library</Button>
        </Link>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Edit Recipe</h1>
          <p className="text-muted-foreground text-sm">Make changes to your recipe</p>
        </div>

        <Card className="border-border/50 p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <Label htmlFor="name">Recipe Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-card border-border/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  value={editServings}
                  onChange={(e) => setEditServings(Number(e.target.value))}
                  min={1}
                  className="bg-card border-border/50"
                />
              </div>
              <div>
                <Label htmlFor="time">Cooking Time (minutes)</Label>
                <Input
                  id="time"
                  type="number"
                  value={editCookingTime}
                  onChange={(e) => setEditCookingTime(Number(e.target.value))}
                  min={1}
                  className="bg-card border-border/50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="source">Source URL (optional)</Label>
              <Input
                id="source"
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
                placeholder="https://..."
                className="bg-card border-border/50"
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label>Recipe Image</Label>
              <div className="mt-2 space-y-3">
                {editImage && (
                  <div className="relative rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={editImage}
                      alt="Recipe preview"
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                      onClick={() => setEditImage("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="Paste image URL"
                    className="bg-card border-border/50 flex-1"
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" className="rounded-lg" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </span>
                    </Button>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Cooking Methods */}
            <div>
              <Label className="mb-3 block">Cooking Methods</Label>
              <div className="flex flex-wrap gap-2">
                {cookingMethods.map((method) => (
                  <Badge
                    key={method}
                    variant={editMethods.includes(method) ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      editMethods.includes(method)
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => toggleMethod(method)}
                  >
                    {method}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recipe Category */}
            <div>
              <Label className="mb-3 block">Recipe Category (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={editCategory === category ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      editCategory === category
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => setEditCategory(category)}
                  >
                    {categoryLabels[category]}
                  </Badge>
                ))}
                {editCategory && (
                  <Badge
                    variant="ghost"
                    className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
                    onClick={() => setEditCategory(undefined)}
                  >
                    Clear
                  </Badge>
                )}
              </div>
            </div>

            {/* Cuisine Types */}
            <div>
              <Label className="mb-3 block">Cuisine Types (optional, can select multiple)</Label>
              <div className="flex flex-wrap gap-2">
                {availableCuisineTypes.map((cuisineType) => (
                  <Badge
                    key={cuisineType}
                    variant={editCuisineTypes.includes(cuisineType) ? "default" : "outline"}
                    className={`cursor-pointer rounded-full transition-all ${
                      editCuisineTypes.includes(cuisineType)
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => toggleCuisineType(cuisineType)}
                  >
                    {cuisineTypeLabels[cuisineType]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Meal Component */}
            <div>
              <Label className="mb-3 block">Meal Component (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {availableMealComponents.map((component) => (
                  <Badge
                    key={component}
                    variant={editMealComponent === component ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      editMealComponent === component
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => setEditMealComponent(component)}
                  >
                    {mealComponentLabels[component]}
                  </Badge>
                ))}
                {editMealComponent && (
                  <Badge
                    variant="ghost"
                    className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
                    onClick={() => setEditMealComponent(undefined)}
                  >
                    Clear
                  </Badge>
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <Label className="mb-3 block">Ingredients</Label>
              <div className="space-y-2">
                {editIngredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      placeholder="e.g., 2 cups flour"
                      className="flex-1 bg-card border-border/50"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      disabled={editIngredients.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addIngredient} className="w-full rounded-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <Label className="mb-3 block">Instructions</Label>
              <div className="space-y-2">
                {editInstructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mt-2">
                      {index + 1}
                    </span>
                    <Textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder="Enter step..."
                      rows={2}
                      className="flex-1 bg-card border-border/50"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                      disabled={editInstructions.length === 1}
                      className="mt-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addInstruction} className="w-full rounded-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="mb-3 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={editTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer rounded-full transition-all ${
                      editTags.includes(tag)
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tagLabels[tag]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-3 block">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add any additional notes or tips..."
                rows={4}
                className="bg-card border-border/50"
              />
            </div>

            {/* Pairings */}
            <RecipePairingsManager
              currentRecipe={recipe}
              allRecipes={allRecipes}
              currentPairings={editPairings}
              onPairingsChange={setEditPairings}
            />

            {/* Cooking Tracking & Rating in Edit Mode */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {/* Cooking Log */}
              <div className="border border-border/50 rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Times Cooked</h3>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {recipe.timesCookedLog?.length || 0}
                  </span>
                </div>
                <Button
                  onClick={markAsCooked}
                  type="button"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Mark as Cooked Today
                </Button>
              </div>

              {/* Star Rating */}
              <div className="border border-border/50 rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Your Rating</h3>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateRating(star)}
                      className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          recipe.rating && star <= recipe.rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {recipe.rating && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Rated {recipe.rating} out of 5 stars
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex gap-3">
                <Button
                  onClick={saveChanges}
                  className="bg-primary/90 hover:bg-primary text-primary-foreground flex-1 rounded-xl shadow-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelEditing} 
                  className="rounded-xl border-border/60 hover:bg-accent"
                >
                  Cancel
                </Button>
              </div>
              
              {/* Delete button - separate row for safety */}
              <Button
                onClick={deleteRecipe}
                variant="ghost"
                className="text-muted-foreground hover:text-red-600 hover:bg-red-50/50 rounded-xl"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Recipe
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-12">
      {/* Header with Icon CTAs */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="rounded-lg -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-primary/5"
            onClick={() => setShowSaveDialog(true)}
          >
            <CalendarPlus className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-primary/5"
            onClick={toggleLoved}
          >
            <Heart
              className={`w-5 h-5 ${
                recipe.isLoved
                  ? "fill-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-primary/5"
            onClick={startEditing}
          >
            <Pencil className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </Button>
        </div>
      </div>

      {/* Save to Meal Plan Dialog */}
      <SaveToMealPlanDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        recipe={recipe}
      />

      {/* Cooking Mode */}
      {showCookingMode && (
        <CookingMode
          recipe={recipe}
          onClose={() => setShowCookingMode(false)}
        />
      )}

      {/* Recipe Header - Image + Info Side by Side */}
      <Card className="mb-6 border-border/50 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Recipe Image - Left Side */}
          {recipe.image && (
            <div className="md:w-64 md:flex-shrink-0">
              <img
                src={recipe.image}
                alt={recipe.name}
                className="w-full h-48 md:h-full object-cover"
                onError={(e) => {
                  console.error("Failed to load image:", recipe.image);
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          
          {/* Recipe Info - Right Side */}
          <div className="flex-1 p-6 bg-card">
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              {recipe.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatCookingTime(recipe.cookingTime)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} servings</span>
              </div>
            </div>

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {recipe.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full border-border/50 bg-muted/30 text-foreground text-xs"
                  >
                    {tagLabels[tag]}
                  </Badge>
                ))}
              </div>
            )}

            {/* Cooking Methods */}
            <div className="flex items-center gap-2 mb-3">
              {recipe.cookingMethod.map((method) => (
                <div
                  key={method}
                  className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-0.5 border border-border/30"
                >
                  <span className="text-sm">{cookingMethodIcons[method]}</span>
                  <span className="text-xs text-muted-foreground capitalize">{method}</span>
                </div>
              ))}
            </div>

            {/* Source Link */}
            {recipe.source && (
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View original source
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Play Cooking Mode Button - Prominent CTA */}
      <div className="mb-6">
        <Button
          onClick={() => setShowCookingMode(true)}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          Start Cooking Mode
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ingredients */}
        <Card className="lg:col-span-1 border-border/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChefHat className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Ingredients</h2>
          </div>
          <ul className="space-y-2.5">
            {recipe.ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span className="text-primary/60 mt-1 flex-shrink-0">•</span>
                <span>
                  <span className="font-medium text-foreground">{ingredient.amount}</span>{" "}
                  {ingredient.name}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Instructions */}
        <Card className="lg:col-span-2 border-border/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{index + 1}</span>
                </div>
                <p className="text-sm text-foreground/80 pt-0.5 flex-1 leading-relaxed">
                  {instruction}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Notes Section */}
      {recipe.notes && (
        <Card className="mt-6 border-border/50 p-6 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground mb-3">Notes & Adjustments</h2>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {recipe.notes}
          </p>
        </Card>
      )}

      {/* Recommended Pairings Section - Always visible if available */}
      {hasPairings && (
        <Card className="mt-6 border-2 border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {recipe.recommendedPairings && recipe.recommendedPairings.length > 0
                  ? "Recommended Pairings"
                  : "Suggested Complete Meal"}
              </h2>
            </div>
            {!recipe.recommendedPairings && (
              <Badge variant="outline" className="text-xs border-primary/30 bg-background/60">
                Auto-suggested
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {recipe.recommendedPairings && recipe.recommendedPairings.length > 0
              ? "These sides complement this dish perfectly"
              : "We think these sides would pair well with this recipe"}
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {displayPairings.map((pairing) => (
              <Link
                key={pairing.id}
                to={`/recipes/${pairing.id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/40 hover:border-primary/30 hover:bg-background/80 transition-all group"
              >
                {pairing.image && (
                  <img
                    src={pairing.image}
                    alt={pairing.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary truncate text-sm">
                    {pairing.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCookingTime(pairing.cookingTime)} • {pairing.servings} servings
                  </p>
                  {pairing.category && (
                    <Badge variant="outline" className="mt-1 text-xs border-border/50">
                      {pairing.category}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/30">
            <Button
              onClick={() => setShowSaveDialog(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Save Complete Meal to Plan
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}