import { useState, useEffect } from "react";
import { Recipe, RecipeCategory } from "../types";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Search, Plus, X, Check } from "lucide-react";

interface RecipePairingsManagerProps {
  currentRecipe: Recipe;
  allRecipes: Recipe[];
  currentPairings: string[];
  onPairingsChange: (pairings: string[]) => void;
}

const categoryLabels: Record<RecipeCategory, string> = {
  "main course": "Main Courses",
  "side": "Sides",
  "appetizer": "Appetizers",
  "dessert": "Desserts",
  "snack": "Snacks",
};

export function RecipePairingsManager({
  currentRecipe,
  allRecipes,
  currentPairings,
  onPairingsChange,
}: RecipePairingsManagerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | "all">("all");

  // Get suggested categories based on current recipe
  const getSuggestedCategories = (): RecipeCategory[] => {
    if (currentRecipe.category === "main course") {
      return ["side", "appetizer", "dessert"];
    }
    if (currentRecipe.category === "side") {
      return ["main course"];
    }
    if (currentRecipe.category === "appetizer") {
      return ["main course", "dessert"];
    }
    if (currentRecipe.category === "dessert") {
      return ["main course"];
    }
    return ["main course", "side", "appetizer", "dessert"];
  };

  const suggestedCategories = getSuggestedCategories();

  const filteredRecipes = allRecipes.filter((recipe) => {
    // Don't show current recipe
    if (recipe.id === currentRecipe.id) return false;

    // Filter by category
    if (selectedCategory !== "all" && recipe.category !== selectedCategory) return false;

    // Filter by search query
    if (searchQuery && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const selectedRecipes = allRecipes.filter((r) => currentPairings.includes(r.id));

  const togglePairing = (recipeId: string) => {
    if (currentPairings.includes(recipeId)) {
      onPairingsChange(currentPairings.filter((id) => id !== recipeId));
    } else {
      onPairingsChange([...currentPairings, recipeId]);
    }
  };

  return (
    <div>
      <Label className="mb-3 block">
        Recommended Pairings
        <span className="text-xs text-muted-foreground font-normal ml-2">
          (Select recipes that go well with this dish)
        </span>
      </Label>

      {/* Selected Pairings */}
      {selectedRecipes.length > 0 && (
        <div className="mb-4 space-y-2">
          {selectedRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20"
            >
              {recipe.image && (
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {recipe.name}
                </p>
                {recipe.category && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {recipe.category}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePairing(recipe.id)}
                className="flex-shrink-0 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Pairings Button */}
      {!isSearching ? (
        <Button
          variant="outline"
          onClick={() => setIsSearching(true)}
          className="w-full border-dashed border-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Pairing
        </Button>
      ) : (
        <div className="space-y-3 border border-border/50 rounded-lg p-4 bg-card">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="pl-9 bg-background border-border/50"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Badge>
            {suggestedCategories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer text-xs capitalize"
                onClick={() => setSelectedCategory(category)}
              >
                {categoryLabels[category]}
              </Badge>
            ))}
          </div>

          {/* Recipe List */}
          <ScrollArea className="h-[240px]">
            <div className="space-y-2 pr-3">
              {filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => {
                  const isSelected = currentPairings.includes(recipe.id);

                  return (
                    <button
                      key={recipe.id}
                      onClick={() => togglePairing(recipe.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/50 hover:border-border hover:bg-accent"
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
                        <p className="text-xs text-muted-foreground capitalize">
                          {recipe.category || "No category"}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recipes found
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Close Button */}
          <Button
            variant="outline"
            onClick={() => {
              setIsSearching(false);
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}