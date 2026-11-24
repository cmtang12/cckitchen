import { Link } from "react-router";
import { Recipe } from "../types";
import { useRef } from "react";
import { Heart, Star, Check, MoreHorizontal } from "lucide-react";
import { formatCookingTime } from "../utils/formatTime";
import { methodLabel, allTags, tagLabel } from "../utils/recipeOptions";
import { CatMark } from "./CatMark";
import { RecipeImage } from "./RecipeImage";
import { hasPhoto } from "../services/recipeImages";

interface RecipeCardProps {
  recipe: Recipe;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  /** Press and hold (or right-click) opens quick actions for this recipe. */
  onLongPress?: (recipe: Recipe) => void;
}

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;

/**
 * A recipe in a grid: the photo, the name, and one quiet line of details.
 * Used everywhere a list of recipes appears so they all look and act the same.
 */
export function RecipeCard({ recipe, selectionMode = false, isSelected = false, onSelectionChange, onLongPress }: RecipeCardProps) {
  // Press and hold: open quick actions instead of the recipe.
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancelHold = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  const openActions = () => {
    fired.current = true;
    cancelHold();
    try { navigator.vibrate?.(10); } catch {}
    onLongPress?.(recipe);
  };

  const holdHandlers = onLongPress && !selectionMode ? {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(openActions, HOLD_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      if (Math.abs(e.clientX - start.current.x) > MOVE_TOLERANCE || Math.abs(e.clientY - start.current.y) > MOVE_TOLERANCE) cancelHold();
    },
    onPointerUp: cancelHold,
    onPointerCancel: cancelHold,
    onPointerLeave: cancelHold,
    // Right-click on a computer; also Android's own long-press signal.
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!fired.current) openActions();
    },
    // Don't also open the recipe when the finger lifts after a hold.
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
  } : {};

  const details = [
    recipe.cookingTime ? formatCookingTime(recipe.cookingTime) : "",
    recipe.cookingMethod.slice(0, 2).map(methodLabel).join(", "),
  ].filter(Boolean).join(" · ");

  const lilySafe = allTags(recipe).includes("lily-safe");

  const content = (
    <article className="group">
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f6ede1] ${
          selectionMode && isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
      >
        {hasPhoto(recipe) ? (
          <RecipeImage
            recipe={recipe}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center">
            <CatMark className="w-2/3 h-2/3 text-[#c99a7d]" mood="sleepy" />
          </div>
        )}

        {selectionMode && (
          <span
            aria-hidden
            className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
              isSelected ? "bg-primary border-primary" : "bg-white/80 border-white"
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />}
          </span>
        )}

        {onLongPress && !selectionMode && (
          <button
            type="button"
            aria-label="More actions"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLongPress(recipe);
            }}
            className="hidden md:flex absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/85 items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4 text-foreground" />
          </button>
        )}

        {recipe.isLoved && !selectionMode && (
          <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/85 flex items-center justify-center" title="Favorite">
            <Heart className="w-3.5 h-3.5 fill-[#e0725c] text-[#e0725c]" />
          </span>
        )}
      </div>

      <div className="pt-2.5 px-0.5">
        <h3 className="text-[15px] leading-snug font-medium text-foreground line-clamp-2">
          {recipe.name}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="truncate">{details}</span>
          {recipe.rating ? (
            <span className="ml-auto shrink-0 inline-flex items-center gap-0.5 tabular-nums">
              <Star className="w-3 h-3 fill-[#d9a54a] text-[#d9a54a]" />
              {recipe.rating}
            </span>
          ) : null}
        </div>
        {lilySafe && (
          <p className="mt-1 text-[12px] text-[#5e8f6f]">{tagLabel("lily-safe")}</p>
        )}
      </div>
    </article>
  );

  if (selectionMode) {
    return (
      <button
        type="button"
        onClick={() => onSelectionChange?.(recipe.id, !isSelected)}
        className="text-left w-full"
        aria-pressed={isSelected}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      draggable={false}
      className="block select-none [-webkit-touch-callout:none]"
      {...holdHandlers}
    >
      {content}
    </Link>
  );
}
