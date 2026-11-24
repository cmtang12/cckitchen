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
  const [failed, setFailed] = useState(false);
  const [src, setSrc] = useState<string | null>(
    recipe.image || peekImage(recipe.id, recipe.imageVersion) || null
  );

  useEffect(() => {
    setFailed(false);
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
      src={!failed && src ? src : BLANK}
      alt={alt}
      decoding="async"
      // Many recipe sites refuse photos requested from other apps; sending no
      // referrer gets most of them to load. If one still fails, show the soft placeholder.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ backgroundColor: src && !failed ? undefined : "#f1e7da", ...style }}
      {...imgProps}
    />
  );
}
