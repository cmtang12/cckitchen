import { useEffect, useRef, useState } from "react";
import type { Recipe } from "../types";
import { loadRecipeImage, peekImage } from "../services/recipeImages";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  recipe: Pick<Recipe, "id" | "image" | "hasImage" | "imageVersion">;
};

/**
 * A recipe photo that only downloads when it's about to scroll into view,
 * then stays saved on the device. Shows a soft placeholder until it arrives.
 */
export function RecipeImage({ recipe, style, alt = "", ...imgProps }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(
    recipe.image || peekImage(recipe.id, recipe.imageVersion) || null
  );

  useEffect(() => {
    if (recipe.image) {
      setSrc(recipe.image);
      return;
    }
    if (!recipe.hasImage) {
      setSrc(null);
      return;
    }
    const cached = peekImage(recipe.id, recipe.imageVersion);
    if (cached) {
      setSrc(cached);
      return;
    }
    setSrc(null);
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const load = () =>
      loadRecipeImage(recipe.id, recipe.imageVersion)
        .then((img) => !cancelled && setSrc(img))
        .catch(() => {});
    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => { cancelled = true; };
    }
    // Start a little before it's on screen so it's usually ready in time.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [recipe.id, recipe.image, recipe.hasImage, recipe.imageVersion]);

  return (
    <img
      ref={ref}
      src={src || BLANK}
      alt={alt}
      decoding="async"
      style={{ backgroundColor: src ? undefined : "#f1e7da", ...style }}
      {...imgProps}
    />
  );
}
