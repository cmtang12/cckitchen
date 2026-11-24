import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { recipeAPI, onFreshData, RECIPES_LIST } from "../services/api";
import { normalizeRecipe } from "../utils/recipeOptions";
import { Recipe } from "../types";
import { RecipeCard } from "../components/RecipeCard";
import { OnboardingBanner } from "../components/OnboardingBanner";
import { BulkSaveToMealPlanDialog } from "../components/BulkSaveToMealPlanDialog";
import { RecipeQuickActions } from "../components/RecipeQuickActions";
import { Input } from "../components/ui/input";
import { Search, SlidersHorizontal, X, ChevronDown, Star, Trash2, CalendarPlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Slider } from "../components/ui/slider";
import { formatCookingTime } from "../utils/formatTime";
import { CatMark } from "../components/CatMark";
import { LilySkill, loadLilySkills, fetchLilySkills, isLilyFriendly } from "../utils/lilyHelps";
import {
  TAGS,
  COOKING_METHODS,
  CATEGORIES,
  MEAL_COMPONENTS,
  CUISINES,
  tagLabel,
  methodLabel,
  categoryLabel,
  cuisineLabel,
  mealComponentLabel,
  allTags,
} from "../utils/recipeOptions";

// "hide-low" is the default: recipes rated 3 stars or less stay out of the way,
// unrated recipes still show.
type RatingFilter = "all" | "hide-low" | "4plus" | "5";

const RATING_OPTIONS: Array<{ value: RatingFilter; label: string }> = [
  { value: "all", label: "Show all" },
  { value: "hide-low", label: "Hide 3★ and under" },
  { value: "4plus", label: "4★ and up" },
  { value: "5", label: "5★ only" },
];

const MAX_TIME = 720;

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 inline-flex items-center gap-1 h-8 px-3.5 rounded-full text-sm border transition-colors ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}

function FilterSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border/60 py-4 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-medium text-foreground">
          {title}
          {count ? <span className="ml-1.5 text-muted-foreground font-normal">· {count}</span> : null}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Known options first (in their usual order), then anything else found on recipes. */
function optionsFromData(known: string[], found: Iterable<string | undefined>): string[] {
  const seen = new Set<string>();
  for (const f of found) if (f) seen.add(f);
  const extras = Array.from(seen).filter((v) => !known.includes(v)).sort();
  return [...known.filter((k) => seen.has(k)), ...extras];
}

export function RecipesLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [maxCookingTime, setMaxCookingTime] = useState<number[]>([MAX_TIME]);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("hide-low");
  const [showOnlyCooked, setShowOnlyCooked] = useState(false);
  const [showOnlyLoved, setShowOnlyLoved] = useState(false);
  const [showLilyHelps, setShowLilyHelps] = useState(false);
  const [lilySkills, setLilySkills] = useState<LilySkill[]>(loadLilySkills);
  useEffect(() => {
    fetchLilySkills().then(setLilySkills);
  }, []);

  // Selecting several recipes at once (add to a plan, delete)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [showBulkMealPlanDialog, setShowBulkMealPlanDialog] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [location.pathname]);

  // The list opens from the saved copy; when a newer copy arrives in the background, show it.
  useEffect(
    () => onFreshData(RECIPES_LIST, (data) => setRecipes((data?.recipes || []).map(normalizeRecipe))),
    []
  );

  const loadRecipes = async () => {
    try {
      setIsLoading(true);
      const data = await recipeAPI.getAll();
      setRecipes(data);
    } catch (error: any) {
      console.error("[RecipesLibrary] Failed to load recipes:", error);
      toast.error(`Couldn't load recipes: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter options come from the recipes themselves, so every tag, cuisine and
  // category that's actually in use shows up, and nothing that would match zero recipes.
  const options = useMemo(() => ({
    tags: optionsFromData(TAGS, recipes.flatMap(allTags)),
    methods: optionsFromData(COOKING_METHODS, recipes.flatMap((r) => r.cookingMethod)),
    cuisines: optionsFromData(CUISINES, recipes.flatMap((r) => r.cuisineTypes || [])),
    categories: optionsFromData(CATEGORIES, recipes.map((r) => r.category)),
    components: optionsFromData(MEAL_COMPONENTS, recipes.map((r) => r.mealComponent)),
  }), [recipes]);

  const matchesRating = (recipe: Recipe, filter: RatingFilter) => {
    const r = recipe.rating || 0;
    switch (filter) {
      case "all": return true;
      case "hide-low": return r === 0 || r > 3;
      case "4plus": return r >= 4;
      case "5": return r >= 5;
    }
  };

  const matchesEverythingButRating = (recipe: Recipe) => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !recipe.name.toLowerCase().includes(q)) return false;
    const tags = allTags(recipe);
    if (selectedTags.length && !selectedTags.every((t) => tags.includes(t))) return false;
    if (selectedMethods.length && !selectedMethods.some((m) => recipe.cookingMethod.includes(m as any))) return false;
    if (selectedCuisines.length && !selectedCuisines.some((c) => recipe.cuisineTypes?.includes(c as any))) return false;
    if (selectedCategories.length && !(recipe.category && selectedCategories.includes(recipe.category))) return false;
    if (selectedComponents.length && !(recipe.mealComponent && selectedComponents.includes(recipe.mealComponent))) return false;
    if (maxCookingTime[0] < MAX_TIME && recipe.cookingTime > maxCookingTime[0]) return false;
    if (showOnlyCooked && !(recipe.timesCookedLog && recipe.timesCookedLog.length > 0)) return false;
    if (showOnlyLoved && !recipe.isLoved) return false;
    if (showLilyHelps && !isLilyFriendly(recipe, lilySkills)) return false;
    return true;
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => matchesEverythingButRating(r) && matchesRating(r, ratingFilter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recipes, searchQuery, selectedTags, selectedMethods, selectedCuisines, selectedCategories,
    selectedComponents, maxCookingTime, ratingFilter, showOnlyCooked, showOnlyLoved, showLilyHelps, lilySkills,
  ]);

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedMethods([]);
    setSelectedCuisines([]);
    setSelectedCategories([]);
    setSelectedComponents([]);
    setSearchQuery("");
    setMaxCookingTime([MAX_TIME]);
    setRatingFilter("all");
    setShowOnlyCooked(false);
    setShowOnlyLoved(false);
    setShowLilyHelps(false);
  };

  // The rating filter is on by default (hiding 3★ and under), so the Filters
  // button shows "1" until it's changed to "Show all".
  const activeFilterCount =
    selectedTags.length +
    selectedMethods.length +
    selectedCuisines.length +
    selectedCategories.length +
    selectedComponents.length +
    (maxCookingTime[0] < MAX_TIME ? 1 : 0) +
    (ratingFilter !== "all" ? 1 : 0) +
    (showOnlyCooked ? 1 : 0) +
    (showOnlyLoved ? 1 : 0) +
    (showLilyHelps ? 1 : 0);
  const hasFilters = activeFilterCount > 0 || searchQuery.length > 0;

  // Selection
  const handleSelectionChange = (recipeId: string, selected: boolean) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(recipeId);
      else next.delete(recipeId);
      return next;
    });
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedRecipeIds(new Set());
  };

  const handleBulkDelete = async () => {
    const n = selectedRecipeIds.size;
    if (n === 0) return;
    if (!window.confirm(`Delete ${n} recipe${n > 1 ? "s" : ""}? This can't be undone.`)) return;
    try {
      await Promise.all(Array.from(selectedRecipeIds).map((id) => recipeAPI.delete(id)));
      toast.success(`Deleted ${n} recipe${n > 1 ? "s" : ""}`);
      exitSelection();
      loadRecipes();
    } catch (error) {
      console.error("Failed to delete recipes:", error);
      toast.error("Couldn't delete some recipes");
    }
  };

  const selectedRecipes = recipes.filter((r) => selectedRecipeIds.has(r.id));

  // Press-and-hold quick actions
  const [actionRecipe, setActionRecipe] = useState<Recipe | null>(null);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);

  const saveChange = async (recipe: Recipe, changes: Partial<Recipe>, message: string) => {
    const before: Partial<Recipe> = {};
    (Object.keys(changes) as Array<keyof Recipe>).forEach((k) => { (before as any)[k] = recipe[k]; });
    const apply = (c: Partial<Recipe>) =>
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, ...c } : r)));
    apply(changes);
    try {
      await recipeAPI.update(recipe.id, changes);
      toast.success(message, {
        action: {
          label: "Undo",
          onClick: async () => {
            apply(before);
            try { await recipeAPI.update(recipe.id, before); } catch { toast.error("Couldn't undo"); }
          },
        },
      });
    } catch {
      apply(before);
      toast.error("Couldn't save that change");
    }
  };

  const toggleFavorite = (recipe: Recipe) =>
    saveChange(recipe, { isLoved: !recipe.isLoved }, recipe.isLoved ? "Removed from Favorites" : "Added to Favorites");

  const toggleWantToTry = (recipe: Recipe) => {
    const has = recipe.tags.includes("want-to-try");
    const tags = has ? recipe.tags.filter((t) => t !== "want-to-try") : [...recipe.tags, "want-to-try" as const];
    saveChange(recipe, { tags }, has ? "Removed from Want to Try" : "Added to Want to Try");
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-11 w-full bg-muted/60 rounded-full animate-pulse mb-4" />
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 w-24 bg-muted/50 rounded-full animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <div className="aspect-[4/3] bg-muted/50 rounded-2xl animate-pulse mb-3" />
              <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-muted/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 md:pb-10">
      {recipes.length === 0 && (
        <div className="mb-8">
          <OnboardingBanner />
        </div>
      )}

      {/* Search, filters, select */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search recipes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-border rounded-full"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 rounded-full px-4 ${showFilters ? "border-foreground/40" : "border-border bg-card"}`}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1.5 min-w-5 h-5 px-1.5 inline-flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          className={`h-11 rounded-full px-4 ${selectionMode ? "border-foreground/40" : "border-border bg-card"}`}
        >
          {selectionMode ? "Done" : "Select"}
        </Button>
      </div>

      {/* Quick filters: one tap for the things you reach for most */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto mb-5">
        <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
          <FilterChip selected={showOnlyLoved} onClick={() => setShowOnlyLoved(!showOnlyLoved)}>
            Favorites
          </FilterChip>
          <FilterChip
            selected={selectedTags.includes("lily-safe")}
            onClick={() => setSelectedTags(toggleIn(selectedTags, "lily-safe"))}
          >
            {tagLabel("lily-safe")}
          </FilterChip>
          <FilterChip selected={showLilyHelps} onClick={() => setShowLilyHelps(!showLilyHelps)}>
            Little Helper Friendly
          </FilterChip>
          <FilterChip
            selected={selectedTags.includes("want-to-try")}
            onClick={() => setSelectedTags(toggleIn(selectedTags, "want-to-try"))}
          >
            {tagLabel("want-to-try")}
          </FilterChip>
        </div>
      </div>

      {/* All filters */}
      {showFilters && (
        <div className="mb-6 bg-card border border-border rounded-2xl p-5">
          <FilterSection title="Rating" count={ratingFilter !== "all" ? 1 : 0} defaultOpen>
            {RATING_OPTIONS.map((o) => (
              <FilterChip key={o.value} selected={ratingFilter === o.value} onClick={() => setRatingFilter(o.value)}>
                {o.label}
              </FilterChip>
            ))}
          </FilterSection>

          {options.tags.length > 0 && (
            <FilterSection title="Tags" count={selectedTags.length} defaultOpen>
              {options.tags.map((tag) => (
                <FilterChip key={tag} selected={selectedTags.includes(tag)} onClick={() => setSelectedTags(toggleIn(selectedTags, tag))}>
                  {tagLabel(tag)}
                </FilterChip>
              ))}
            </FilterSection>
          )}

          {options.categories.length > 0 && (
            <FilterSection title="Course" count={selectedCategories.length}>
              {options.categories.map((c) => (
                <FilterChip key={c} selected={selectedCategories.includes(c)} onClick={() => setSelectedCategories(toggleIn(selectedCategories, c))}>
                  {categoryLabel(c)}
                </FilterChip>
              ))}
            </FilterSection>
          )}

          {options.cuisines.length > 0 && (
            <FilterSection title="Cuisine" count={selectedCuisines.length}>
              {options.cuisines.map((c) => (
                <FilterChip key={c} selected={selectedCuisines.includes(c)} onClick={() => setSelectedCuisines(toggleIn(selectedCuisines, c))}>
                  {cuisineLabel(c)}
                </FilterChip>
              ))}
            </FilterSection>
          )}

          {options.methods.length > 0 && (
            <FilterSection title="Cooked in" count={selectedMethods.length}>
              {options.methods.map((m) => (
                <FilterChip key={m} selected={selectedMethods.includes(m)} onClick={() => setSelectedMethods(toggleIn(selectedMethods, m))}>
                  {methodLabel(m)}
                </FilterChip>
              ))}
            </FilterSection>
          )}

          {options.components.length > 0 && (
            <FilterSection title="Part of the meal" count={selectedComponents.length}>
              {options.components.map((c) => (
                <FilterChip key={c} selected={selectedComponents.includes(c)} onClick={() => setSelectedComponents(toggleIn(selectedComponents, c))}>
                  {mealComponentLabel(c)}
                </FilterChip>
              ))}
            </FilterSection>
          )}

          <FilterSection title="Time" count={maxCookingTime[0] < MAX_TIME ? 1 : 0}>
            <div className="w-full space-y-3">
              <Slider value={maxCookingTime} onValueChange={setMaxCookingTime} max={MAX_TIME} step={15} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {maxCookingTime[0] < MAX_TIME ? `Up to ${formatCookingTime(maxCookingTime[0])}` : "Any time"}
              </p>
            </div>
          </FilterSection>

          <FilterSection title="More" count={(showOnlyCooked ? 1 : 0) + (showOnlyLoved ? 1 : 0) + (showLilyHelps ? 1 : 0)}>
            <FilterChip selected={showLilyHelps} onClick={() => setShowLilyHelps(!showLilyHelps)}>Little Helper Friendly</FilterChip>
            <FilterChip selected={showOnlyLoved} onClick={() => setShowOnlyLoved(!showOnlyLoved)}>Favorites</FilterChip>
            <FilterChip selected={showOnlyCooked} onClick={() => setShowOnlyCooked(!showOnlyCooked)}>Cooked before</FilterChip>
          </FilterSection>

          {hasFilters && (
            <div className="pt-4 border-t border-border/60">
              <button onClick={clearFilters} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Count */}
      {recipes.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {filteredRecipes.length} {filteredRecipes.length === 1 ? "recipe" : "recipes"}
        </p>
      )}

      {/* Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selectionMode={selectionMode}
              isSelected={selectedRecipeIds.has(recipe.id)}
              onSelectionChange={handleSelectionChange}
              onLongPress={setActionRecipe}
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <CatMark className="w-24 h-24 mx-auto mb-4 text-[#9a5b3f]" mood="sleepy" />
          <h3 className="text-lg font-medium text-foreground mb-1">No recipes yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Add your first one and it'll live here.</p>
          <Button onClick={() => navigate("/import")} className="rounded-full h-11 px-6">Add a recipe</Button>
        </div>
      ) : (
        <div className="text-center py-16">
          <CatMark className="w-20 h-20 mx-auto mb-4 text-[#9a5b3f]" mood="sleepy" />
          <h3 className="text-base font-medium text-foreground mb-1">Nothing matches</h3>
          <p className="text-muted-foreground text-sm mb-6">Try fewer filters.</p>
          <Button variant="outline" onClick={clearFilters} className="rounded-full">Clear filters</Button>
        </div>
      )}

      {/* Actions for selected recipes (phone and computer) */}
      {selectionMode && (
        <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+104px)] md:bottom-6 z-[60] px-4 md:pl-24 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto bg-card border border-border rounded-2xl shadow-[0_8px_30px_rgba(80,50,30,0.12)] p-3 flex items-center gap-2">
            <span className="text-sm text-foreground px-2 mr-auto whitespace-nowrap">
              {selectedRecipeIds.size} selected
            </span>
            <Button
              size="sm"
              disabled={selectedRecipeIds.size === 0}
              onClick={() => setShowBulkMealPlanDialog(true)}
              className="rounded-full h-9"
            >
              <CalendarPlus className="w-4 h-4 mr-1.5" />
              Add to plan
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={selectedRecipeIds.size === 0}
              onClick={handleBulkDelete}
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={exitSelection} className="rounded-full h-9 w-9" title="Cancel">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <RecipeQuickActions
        recipe={actionRecipe}
        onClose={() => setActionRecipe(null)}
        onToggleFavorite={toggleFavorite}
        onToggleWantToTry={toggleWantToTry}
        onAddToMealPlan={setPlanRecipe}
      />

      <BulkSaveToMealPlanDialog
        open={!!planRecipe}
        onOpenChange={(open) => !open && setPlanRecipe(null)}
        recipes={planRecipe ? [planRecipe] : []}
      />

      <BulkSaveToMealPlanDialog
        open={showBulkMealPlanDialog}
        onOpenChange={setShowBulkMealPlanDialog}
        recipes={selectedRecipes}
      />
    </div>
  );
}
