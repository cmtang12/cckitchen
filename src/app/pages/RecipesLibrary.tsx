import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { recipeAPI } from "../services/api";
import { Recipe, RecipeTag, CookingMethod, RecipeCategory, MealComponent, CuisineType } from "../types";
import { RecipeCard } from "../components/RecipeCard";
import { OnboardingBanner } from "../components/OnboardingBanner";
import { BulkSaveToMealPlanDialog } from "../components/BulkSaveToMealPlanDialog";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Filter, X, Loader2, ChevronDown, ChevronUp, Star, Heart, Flame, Trash2, FolderPlus, CheckSquare, Square } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Slider } from "../components/ui/slider";
import { formatCookingTime } from "../utils/formatTime";

const tagLabels: Record<RecipeTag, string> = {
  "lily-safe": "Lily Safe",
  "tried-true": "Tried & True",
  "want-to-try": "Want to Try",
  "high-protein": "High Protein",
  "quick-easy": "Quick & Easy",
};

const availableTags: RecipeTag[] = [
  "lily-safe",
  "tried-true",
  "want-to-try",
  "high-protein",
  "quick-easy",
];

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

const cuisineTypes: CuisineType[] = [
  "asian",
  "american",
  "mexican",
  "italian",
  "mediterranean",
  "indian",
  "middle-eastern",
  "french",
  "spanish",
  "thai",
  "japanese",
  "korean",
  "chinese",
  "vietnamese",
  "greek",
];

const categories: RecipeCategory[] = [
  "appetizer",
  "side",
  "main course",
  "dessert",
  "breakfast",
  "snack",
];

const mealComponents: MealComponent[] = ["protein", "veggie", "carb", "complete-meal"];

const categoryLabels: Record<RecipeCategory, string> = {
  "side": "Side",
  "appetizer": "Appetizer",
  "main course": "Main Course",
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

export function RecipesLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<RecipeTag[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<CookingMethod[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategory[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<MealComponent[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [maxCookingTime, setMaxCookingTime] = useState<number[]>([720]); // 12 hours default to include slow cooker recipes
  const [minRating, setMinRating] = useState<number>(0);
  const [showOnlyCooked, setShowOnlyCooked] = useState(false);
  const [showOnlyLoved, setShowOnlyLoved] = useState(false);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [showBulkMealPlanDialog, setShowBulkMealPlanDialog] = useState(false);

  // Expandable filter sections
  const [expandedSections, setExpandedSections] = useState({
    tags: true,
    methods: false,
    cuisines: false,
    categories: false,
    components: false,
    time: false,
    rating: false,
    other: false,
  });

  useEffect(() => {
    console.log("[RecipesLibrary] Component mounted or location changed, loading recipes...");
    loadRecipes();
  }, [location.pathname]); // Reload when navigating back to this page

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      console.log("[RecipesLibrary] 🔄 Loading recipes...");
      const data = await recipeAPI.getAll();
      console.log("[RecipesLibrary] ✅ Loaded", data.length, "recipes");
      setRecipes(data);
    } catch (error: any) {
      console.error("[RecipesLibrary] ❌ Failed to load recipes:", error);
      toast.error(`Failed to load recipes: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Search filter
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => recipe.tags.includes(tag));

      // Cooking method filter
      const matchesMethods =
        selectedMethods.length === 0 ||
        selectedMethods.some((method) => recipe.cookingMethod.includes(method));

      // Cuisine type filter
      const matchesCuisines =
        selectedCuisines.length === 0 ||
        (recipe.cuisineTypes && selectedCuisines.some((cuisine) => recipe.cuisineTypes?.includes(cuisine)));

      // Category filter
      const matchesCategories =
        selectedCategories.length === 0 ||
        (recipe.category && selectedCategories.includes(recipe.category));

      // Meal component filter
      const matchesComponents =
        selectedComponents.length === 0 ||
        (recipe.mealComponent && selectedComponents.includes(recipe.mealComponent));

      // Cooking time filter
      const matchesCookingTime = recipe.cookingTime <= maxCookingTime[0];

      // Rating filter
      const matchesRating = minRating === 0 || (recipe.rating && recipe.rating >= minRating);

      // Cooked filter (has timesCookedLog with entries)
      const matchesCooked =
        !showOnlyCooked || (recipe.timesCookedLog && recipe.timesCookedLog.length > 0);

      // Loved filter
      const matchesLoved = !showOnlyLoved || recipe.isLoved === true;

      return (
        matchesSearch &&
        matchesTags &&
        matchesMethods &&
        matchesCuisines &&
        matchesCategories &&
        matchesComponents &&
        matchesCookingTime &&
        matchesRating &&
        matchesCooked &&
        matchesLoved
      );
    });
  }, [
    recipes,
    searchQuery,
    selectedTags,
    selectedMethods,
    selectedCuisines,
    selectedCategories,
    selectedComponents,
    maxCookingTime,
    minRating,
    showOnlyCooked,
    showOnlyLoved,
  ]);

  const toggleTag = (tag: RecipeTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleMethod = (method: CookingMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const toggleCuisine = (cuisine: CuisineType) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  const toggleCategory = (category: RecipeCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleComponent = (component: MealComponent) => {
    setSelectedComponents((prev) =>
      prev.includes(component) ? prev.filter((c) => c !== component) : [...prev, component]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedMethods([]);
    setSelectedCuisines([]);
    setSelectedCategories([]);
    setSelectedComponents([]);
    setSearchQuery("");
    setMaxCookingTime([720]);
    setMinRating(0);
    setShowOnlyCooked(false);
    setShowOnlyLoved(false);
  };

  // Bulk selection handlers
  const handleSelectionChange = (recipeId: string, selected: boolean) => {
    setSelectedRecipeIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(recipeId);
      } else {
        newSet.delete(recipeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allVisibleIds = new Set(filteredRecipes.map((r) => r.id));
    setSelectedRecipeIds(allVisibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedRecipeIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedRecipeIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedRecipeIds.size} recipe${selectedRecipeIds.size > 1 ? "s" : ""}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedRecipeIds).map((id) => recipeAPI.delete(id))
      );

      toast.success(`Deleted ${selectedRecipeIds.size} recipe${selectedRecipeIds.size > 1 ? "s" : ""}`);
      setSelectedRecipeIds(new Set());
      setSelectionMode(false);
      loadRecipes();
    } catch (error) {
      console.error("Failed to delete recipes:", error);
      toast.error("Failed to delete some recipes");
    }
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedRecipeIds(new Set());
  };

  const selectedRecipes = recipes.filter((r) => selectedRecipeIds.has(r.id));

  const hasFilters =
    selectedTags.length > 0 ||
    searchQuery.length > 0 ||
    selectedMethods.length > 0 ||
    selectedCuisines.length > 0 ||
    selectedCategories.length > 0 ||
    selectedComponents.length > 0 ||
    maxCookingTime[0] < 720 ||
    minRating > 0 ||
    showOnlyCooked ||
    showOnlyLoved;

  const activeFilterCount =
    selectedTags.length +
    selectedMethods.length +
    selectedCuisines.length +
    selectedCategories.length +
    selectedComponents.length +
    (maxCookingTime[0] < 720 ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (showOnlyCooked ? 1 : 0) +
    (showOnlyLoved ? 1 : 0);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground">C&C's Kitchen</h1>
      </div>

      {/* Onboarding Banner */}
      {recipes.length === 0 && !hasFilters && (
        <div className="mb-8">
          <OnboardingBanner />
        </div>
      )}

      {/* Search Bar with Filter Icon */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-card border-border/50 focus:border-primary/30 rounded-lg"
            />
          </div>

          {/* Desktop only - Bulk select button */}
          <Button
            variant="outline"
            onClick={() => setSelectionMode(!selectionMode)}
            className={`hidden md:flex h-11 px-4 rounded-lg transition-colors ${
              selectionMode
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-card border-border/50"
            }`}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            <span className="hidden lg:inline">{selectionMode ? "Exit Select" : "Select"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-lg transition-colors relative ${
              showFilters || hasFilters
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-card border-border/50"
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar - Desktop only */}
      {selectionMode && selectedRecipeIds.size > 0 && (
        <div className="hidden md:block mb-6 bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-foreground">
                {selectedRecipeIds.size} recipe{selectedRecipeIds.size > 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-2">
                {selectedRecipeIds.size < filteredRecipes.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 text-xs"
                  >
                    Select All ({filteredRecipes.length})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkMealPlanDialog(true)}
                className="h-9"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                Add to Meal Plan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-9"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitSelectionMode}
                className="h-9"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters - Collapsible Sections */}
      {showFilters && (
        <div className="mb-8 bg-card border border-border/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">Advanced Filters</h3>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Tags Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("tags")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Recipe Tags</span>
              <div className="flex items-center gap-2">
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedTags.length}
                  </Badge>
                )}
                {expandedSections.tags ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.tags && (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all rounded-full px-3 py-1 ${
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                          : "bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tagLabels[tag]}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cooking Methods Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("methods")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Cooking Methods</span>
              <div className="flex items-center gap-2">
                {selectedMethods.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedMethods.length}
                  </Badge>
                )}
                {expandedSections.methods ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.methods && (
              <div className="flex flex-wrap gap-2">
                {cookingMethods.map((method) => {
                  const isSelected = selectedMethods.includes(method);
                  return (
                    <Badge
                      key={method}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all rounded-full px-3 py-1 capitalize ${
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                          : "bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                      }`}
                      onClick={() => toggleMethod(method)}
                    >
                      {method}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cuisine Types Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("cuisines")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Cuisine Types</span>
              <div className="flex items-center gap-2">
                {selectedCuisines.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCuisines.length}
                  </Badge>
                )}
                {expandedSections.cuisines ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.cuisines && (
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.map((cuisine) => {
                  const isSelected = selectedCuisines.includes(cuisine);
                  return (
                    <Badge
                      key={cuisine}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all rounded-full px-3 py-1 capitalize ${
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                          : "bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                      }`}
                      onClick={() => toggleCuisine(cuisine)}
                    >
                      {cuisine}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Categories Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("categories")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Recipe Categories</span>
              <div className="flex items-center gap-2">
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCategories.length}
                  </Badge>
                )}
                {expandedSections.categories ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.categories && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <Badge
                      key={category}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all rounded-full px-3 py-1 ${
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                          : "bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      {categoryLabels[category]}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Meal Components Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("components")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Meal Components</span>
              <div className="flex items-center gap-2">
                {selectedComponents.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedComponents.length}
                  </Badge>
                )}
                {expandedSections.components ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.components && (
              <div className="flex flex-wrap gap-2">
                {mealComponents.map((component) => {
                  const isSelected = selectedComponents.includes(component);
                  return (
                    <Badge
                      key={component}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer transition-all rounded-full px-3 py-1 ${
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
                          : "bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                      }`}
                      onClick={() => toggleComponent(component)}
                    >
                      {mealComponentLabels[component]}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cooking Time Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("time")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Max Cooking Time</span>
              <div className="flex items-center gap-2">
                {maxCookingTime[0] < 720 && (
                  <Badge variant="secondary" className="text-xs">
                    {formatCookingTime(maxCookingTime[0])}
                  </Badge>
                )}
                {expandedSections.time ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.time && (
              <div className="space-y-3">
                <Slider
                  value={maxCookingTime}
                  onValueChange={setMaxCookingTime}
                  max={720}
                  step={15}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum: <span className="font-medium text-foreground">{formatCookingTime(maxCookingTime[0])}</span>
                </p>
              </div>
            )}
          </div>

          {/* Rating Filter */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("rating")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Minimum Rating</span>
              <div className="flex items-center gap-2">
                {minRating > 0 && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    {minRating} <Star className="w-3 h-3 fill-current" />
                  </Badge>
                )}
                {expandedSections.rating ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.rating && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${
                        minRating === rating
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-card border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      {rating === 0 ? (
                        <span className="text-sm font-medium">Any</span>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Other Filters */}
          <div className="border-t border-border/30 pt-4">
            <button
              onClick={() => toggleSection("other")}
              className="flex items-center justify-between w-full text-left mb-3 hover:text-primary transition-colors"
            >
              <span className="text-sm font-medium text-foreground">Other Filters</span>
              <div className="flex items-center gap-2">
                {(showOnlyCooked || showOnlyLoved) && (
                  <Badge variant="secondary" className="text-xs">
                    {(showOnlyCooked ? 1 : 0) + (showOnlyLoved ? 1 : 0)}
                  </Badge>
                )}
                {expandedSections.other ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.other && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showOnlyCooked}
                    onChange={() => setShowOnlyCooked(!showOnlyCooked)}
                    className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-primary transition-colors">
                    <Flame className="w-4 h-4" />
                    <span>Show only recipes I've cooked</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showOnlyLoved}
                    onChange={() => setShowOnlyLoved(!showOnlyLoved)}
                    className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <div className="flex items-center gap-2 text-sm text-foreground group-hover:text-primary transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>Show only loved recipes</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Count */}
      {recipes.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRecipes.length}</span> recipe
            {filteredRecipes.length !== 1 ? "s" : ""}
            {hasFilters && <span className="ml-1">(filtered)</span>}
          </p>
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selectionMode={selectionMode}
              isSelected={selectedRecipeIds.has(recipe.id)}
              onSelectionChange={handleSelectionChange}
            />
          ))}
        </div>
      ) : recipes.length === 0 && !hasFilters ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Search className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No recipes yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Start building your collection by importing your first recipe
          </p>
          <Button
            onClick={() => navigate("/import")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
          >
            Import Recipe
          </Button>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No recipes found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Try adjusting your search or filters
          </p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="rounded-lg">
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Bulk Save to Meal Plan Dialog */}
      <BulkSaveToMealPlanDialog
        open={showBulkMealPlanDialog}
        onOpenChange={setShowBulkMealPlanDialog}
        recipes={selectedRecipes}
      />
    </div>
  );
}
