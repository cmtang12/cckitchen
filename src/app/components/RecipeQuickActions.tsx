import { Recipe } from "../types";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { Heart, Bookmark, CalendarPlus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { RecipeImage } from "./RecipeImage";
import { hasPhoto } from "../services/recipeImages";

interface RecipeQuickActionsProps {
  recipe: Recipe | null;
  onClose: () => void;
  onToggleFavorite: (recipe: Recipe) => void;
  onToggleWantToTry: (recipe: Recipe) => void;
  onAddToMealPlan: (recipe: Recipe) => void;
}

/**
 * The menu that opens when you press and hold a recipe (or right-click it on a computer).
 * Quick changes without opening the recipe.
 */
export function RecipeQuickActions({
  recipe,
  onClose,
  onToggleFavorite,
  onToggleWantToTry,
  onAddToMealPlan,
}: RecipeQuickActionsProps) {
  const navigate = useNavigate();
  const wantToTry = !!recipe?.tags.includes("want-to-try");

  const Row = ({
    icon,
    label,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 h-14 text-left text-[15px] text-foreground hover:bg-muted/40 active:bg-muted/60 transition-colors"
    >
      <span className="w-5 flex justify-center text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );

  return (
    <Sheet open={!!recipe} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 gap-0 max-w-xl mx-auto border-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        {recipe && (
          <>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/recipes/${recipe.id}`);
              }}
              className="flex items-center gap-3 px-4 pt-5 pb-4 text-left border-b border-border/60"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#f6ede1] shrink-0">
                {hasPhoto(recipe) && <RecipeImage recipe={recipe} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <SheetTitle className="text-base font-medium leading-snug line-clamp-2">{recipe.name}</SheetTitle>
                <SheetDescription className="text-xs">Open recipe</SheetDescription>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="py-1">
              <Row
                icon={<Heart className={`w-5 h-5 ${recipe.isLoved ? "fill-[#e0725c] text-[#e0725c]" : ""}`} />}
                label={recipe.isLoved ? "Remove from Favorites" : "Add to Favorites"}
                onClick={() => {
                  onToggleFavorite(recipe);
                  onClose();
                }}
              />
              <Row
                icon={<Bookmark className={`w-5 h-5 ${wantToTry ? "fill-current text-foreground" : ""}`} />}
                label={wantToTry ? "Remove from Want to Try" : "Add to Want to Try"}
                onClick={() => {
                  onToggleWantToTry(recipe);
                  onClose();
                }}
              />
              <Row
                icon={<CalendarPlus className="w-5 h-5" />}
                label="Add to meal plan"
                onClick={() => {
                  onClose();
                  onAddToMealPlan(recipe);
                }}
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
