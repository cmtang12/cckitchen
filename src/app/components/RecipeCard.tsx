import { Link } from "react-router";
import { Recipe } from "../types";
import { Clock, Users, Heart, ChefHat } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { formatCookingTime } from "../utils/formatTime";

interface RecipeCardProps {
  recipe: Recipe;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
}

const cookingMethodIcons: Record<string, string> = {
  stovetop: "🍳",
  oven: "🔥",
  "air fryer": "💨",
  "slow cooker": "🥘",
  "instant pot": "⚡",
  grill: "🔥",
  microwave: "📡",
  "no cook": "✨",
};

const tagLabels: Record<string, string> = {
  "lily-safe": "Lily Safe",
  "tried-true": "Tried & True",
  "want-to-try": "Want to Try",
  "high-protein": "High Protein",
  "quick-easy": "Quick & Easy",
};

export function RecipeCard({ recipe, selectionMode = false, isSelected = false, onSelectionChange }: RecipeCardProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(recipe.id, !isSelected);
    }
  };

  const cardContent = (
    <Card className={`group overflow-hidden transition-all duration-200 h-full border-border/50 ${
      selectionMode
        ? isSelected
          ? 'ring-2 ring-primary shadow-lg'
          : 'hover:shadow-md'
        : 'hover:shadow-md'
    }`}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent">
            <ChefHat className="w-12 h-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Checkbox - desktop only, top left corner */}
        {selectionMode && (
          <div
            className="hidden md:block absolute top-2 left-2 z-10"
            onClick={handleCheckboxClick}
          >
            <div className="bg-card/95 backdrop-blur-sm rounded border border-border/50 p-1.5 shadow-sm hover:bg-card transition-colors">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectionChange?.(recipe.id, checked === true)}
                className="w-4 h-4"
              />
            </div>
          </div>
        )}

        {recipe.isLoved && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 fill-red-400 text-red-400" />
          </div>
        )}
      </div>
      <CardContent className="p-5 pt-3">
        <h3 className="font-medium text-base text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatCookingTime(recipe.cookingTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{recipe.servings}</span>
          </div>
          <div className="flex items-center gap-1">
            {recipe.cookingMethod.slice(0, 2).map((method) => (
              <span
                key={method}
                className="text-base opacity-70"
                title={method.charAt(0).toUpperCase() + method.slice(1)}
              >
                {cookingMethodIcons[method]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs bg-primary/10 text-primary/80 border-0 rounded-full px-2.5 py-0.5"
            >
              {tagLabels[tag] || tag}
            </Badge>
          ))}
          {recipe.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-0 rounded-full px-2.5 py-0.5">
              +{recipe.tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // In selection mode, clicking the card selects it instead of navigating
  if (selectionMode) {
    return (
      <div onClick={() => onSelectionChange?.(recipe.id, !isSelected)} className="cursor-pointer">
        {cardContent}
      </div>
    );
  }

  return (
    <Link to={`/recipes/${recipe.id}`}>
      {cardContent}
    </Link>
  );
}