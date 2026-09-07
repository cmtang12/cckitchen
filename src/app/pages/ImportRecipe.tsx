import { useState } from "react";
import { useNavigate } from "react-router";
import { CookingMethod, Recipe, RecipeTag, RecipeCategory, Ingredient, MealComponent, CuisineType } from "../types";
import { toast } from "sonner";
import { recipeAPI, extractionAPI } from "../services/api";
import { compressImage, fetchAndCompressImage } from "../utils/imageCompression";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Edit3, 
  Loader2, 
  Plus, 
  X, 
  CheckCircle2,
  Instagram,
  Sparkles,
  Copy,
  Check,
  Globe,
  Camera,
  PenLine,
  ImageUp,
  Scan
} from "lucide-react";
import Tesseract from "tesseract.js";

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

const availableCategories: Array<RecipeCategory> = ["appetizer", "side", "main-course", "dessert", "breakfast", "snack"];
const availableMealComponents: Array<MealComponent> = ["protein", "veggie", "carb", "complete-meal"];
const availableCuisineTypes: Array<CuisineType> = ["american", "asian", "hispanic"];

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

export function ImportRecipe() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"url" | "photo" | "manual">("url");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Form state
  const [url, setUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState<number>(4);
  const [cookingTime, setCookingTime] = useState<number>(30);
  const [selectedMethods, setSelectedMethods] = useState<CookingMethod[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | undefined>(undefined);
  const [selectedMealComponent, setSelectedMealComponent] = useState<MealComponent | undefined>(undefined);
  const [selectedCuisineTypes, setSelectedCuisineTypes] = useState<CuisineType[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [selectedTags, setSelectedTags] = useState<RecipeTag[]>([]);
  const [sourceLink, setSourceLink] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [instagramName, setInstagramName] = useState("");
  const [instagramIngredients, setInstagramIngredients] = useState("");
  const [instagramInstructions, setInstagramInstructions] = useState("");
  const [recipeImage, setRecipeImage] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [instagramPostText, setInstagramPostText] = useState("");
  const [isParsingInstagram, setIsParsingInstagram] = useState(false);
  const [instagramPhoto, setInstagramPhoto] = useState<File | null>(null);
  const [instagramPhotoPreview, setInstagramPhotoPreview] = useState<string>("");
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  
  // Manual OCR state - arrays so a recipe that doesn't fit in one screenshot
  // can be scanned from several photos, combined in upload order.
  const [manualPhotoPreviews, setManualPhotoPreviews] = useState<string[]>([]);
  const [manualPhotoTexts, setManualPhotoTexts] = useState<string[]>([]);
  const [isManualOcr, setIsManualOcr] = useState(false);

  const handleExtractFromUrl = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsExtracting(true);
    
    try {
      const extractedData = await extractionAPI.extractFromURL(url);
      
      // Check if there was an error (but only block Instagram URLs)
      if (extractedData.error) {
        // For Instagram, show helpful dialog and switch to manual paste tab
        if (url.includes("instagram.com")) {
          toast.error(extractedData.error, { duration: 8000 });
          // Auto-switch to Instagram tab with URL pre-filled
          setActiveTab("instagram");
          setInstagramUrl(url);
          return;
        }
        
        // For other URLs with errors, show warning but continue to review screen
        console.warn("Extraction error:", extractedData.error);
      }
      
      // Set the extracted data (even if partial)
      if (extractedData.name) {
        setRecipeName(extractedData.name);
      }
      
      if (extractedData.servings) {
        setServings(extractedData.servings);
      }
      
      if (extractedData.cookingTime) {
        setCookingTime(extractedData.cookingTime);
      }
      
      if (extractedData.cookingMethod && extractedData.cookingMethod.length > 0) {
        setSelectedMethods(extractedData.cookingMethod as CookingMethod[]);
      }
      
      if (extractedData.ingredients && extractedData.ingredients.length > 0) {
        setIngredients(extractedData.ingredients);
      } else {
        // Start with one empty ingredient field if none extracted
        setIngredients([""]);
      }
      
      if (extractedData.instructions && extractedData.instructions.length > 0) {
        setInstructions(extractedData.instructions);
      } else {
        // Start with one empty instruction field if none extracted
        setInstructions([""]);
      }
      
      // Set image if extracted - compress it first
      if (extractedData.image) {
        try {
          console.log("[Import] Compressing extracted image...");
          const compressedImage = await fetchAndCompressImage(extractedData.image, 800, 600, 0.75);
          setRecipeImage(compressedImage);
          console.log("[Import] Image compressed successfully");
        } catch (error) {
          console.error("[Import] Failed to compress image, using original:", error);
          setRecipeImage(extractedData.image);
        }
      }
      
      setSourceLink(url);
      
      // Always show review screen (will show paste fallback if extraction failed)
      setShowReview(true);
      
      // Show appropriate message based on extraction success
      if (extractedData.name || (extractedData.ingredients && extractedData.ingredients.length > 0)) {
        toast.success("Recipe data extracted! Please review and fill in any missing details.");
      } else {
        toast.warning("Could not extract recipe details. Please paste the recipe content below.");
      }
      
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract recipe. Please try again or enter manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleParseUrlPastedText = async () => {
    if (!pastedText.trim()) {
      toast.error("Please paste the recipe text");
      return;
    }

    setIsExtracting(true);

    try {
      const extractedData = await extractionAPI.parseRecipeText(
        pastedText,
        url || undefined
      );

      // Set extracted data
      if (extractedData.name) {
        setRecipeName(extractedData.name);
      }

      if (extractedData.servings) {
        setServings(extractedData.servings);
      }

      if (extractedData.cookingTime) {
        setCookingTime(extractedData.cookingTime);
      }

      if (extractedData.cookingMethod && extractedData.cookingMethod.length > 0) {
        setSelectedMethods(extractedData.cookingMethod as CookingMethod[]);
      }

      if (extractedData.ingredients && extractedData.ingredients.length > 0) {
        setIngredients(extractedData.ingredients);
      } else {
        setIngredients([""]);
      }

      if (extractedData.instructions && extractedData.instructions.length > 0) {
        setInstructions(extractedData.instructions);
      } else {
        setInstructions([""]);
      }

      if (url.trim()) {
        setSourceLink(url.trim());
      }

      setShowReview(true);
      toast.success("Recipe extracted! Please review and fill in any missing details.");
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse recipe. Please try entering manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Photo extraction not yet implemented
      toast.info("Photo extraction is coming soon! Please use URL import or manual entry for now.");
      // Clear the file
      setTimeout(() => {
        setPhotoFile(null);
        // Reset the input
        const input = document.getElementById('photo-upload') as HTMLInputElement;
        if (input) input.value = '';
      }, 2000);
    }
  };

  const handleManualEntry = () => {
    if (!recipeName) {
      toast.error("Please enter a recipe name");
      return;
    }
    setShowReview(true);
  };

  // Resize an image to a max width for faster OCR, mirroring the single-photo flow.
  const resizeImageForOcr = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;
        const maxWidth = 1200;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // Parse the combined OCR text from every uploaded screenshot and populate the form.
  const applyParsedRecipeText = async (combinedText: string) => {
    if (!combinedText || combinedText.trim().length < 20) {
      toast.error("Could not extract enough text from the image(s). Please try clearer photos.");
      return;
    }

    toast.success("Text extracted! Now parsing recipe...", { duration: 2000 });

    try {
      const extractedData = await extractionAPI.parseRecipeText(combinedText);

      if (extractedData.name) setRecipeName(extractedData.name);
      if (extractedData.servings) setServings(extractedData.servings);
      if (extractedData.cookingTime) setCookingTime(extractedData.cookingTime);
      if (extractedData.cookingMethod && extractedData.cookingMethod.length > 0) {
        setSelectedMethods(extractedData.cookingMethod as CookingMethod[]);
      }
      if (extractedData.ingredients && extractedData.ingredients.length > 0) {
        setIngredients(extractedData.ingredients);
      }
      if (extractedData.instructions && extractedData.instructions.length > 0) {
        setInstructions(extractedData.instructions);
      }

      toast.success("Recipe extracted from photo! Review the details below.");
    } catch (apiError: any) {
      console.error("API parsing error:", apiError);
      toast.error("Failed to parse recipe. Please enter details manually.");
    }
  };

  // Run OCR on newly-added screenshots, append their text to any already scanned,
  // then re-parse everything combined so a recipe split across photos comes
  // together as one recipe.
  const handleManualPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const oversized = selectedFiles.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      toast.error("Each image must be under 10MB.");
      e.target.value = '';
      return;
    }

    e.target.value = '';

    const newPreviews = await Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const dataUrl = reader.result as string;
              try {
                resolve(await compressImage(dataUrl, 800, 600, 0.75));
              } catch (error) {
                console.error("[Import] Failed to compress manual preview, using original:", error);
                resolve(dataUrl);
              }
            };
            reader.readAsDataURL(file);
          })
      )
    );
    setManualPhotoPreviews((prev) => [...prev, ...newPreviews]);

    setIsManualOcr(true);
    setOcrProgress(0);

    try {
      toast.info(
        selectedFiles.length > 1 ? "Scanning text from images..." : "Scanning text from image...",
        { duration: 2000 }
      );

      let completedCount = 0;
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const overallProgress = ((completedCount + m.progress) / selectedFiles.length) * 100;
            setOcrProgress(Math.round(overallProgress));
          }
        },
      });

      const newTexts: string[] = [];
      for (const selectedFile of selectedFiles) {
        const resizedImage = await resizeImageForOcr(selectedFile);
        const { data } = await worker.recognize(resizedImage);
        newTexts.push(data.text);
        completedCount++;
        setOcrProgress(Math.round((completedCount / selectedFiles.length) * 100));
      }

      await worker.terminate();

      const combinedTexts = [...manualPhotoTexts, ...newTexts];
      setManualPhotoTexts(combinedTexts);

      await applyParsedRecipeText(combinedTexts.join("\n\n"));
    } catch (error: any) {
      console.error("OCR error:", error);
      toast.error("Failed to extract text from image. Please try entering manually.");
    } finally {
      setIsManualOcr(false);
      setOcrProgress(0);
    }
  };

  // Remove one screenshot and re-parse the remaining ones combined.
  const handleRemoveManualPhoto = async (index: number) => {
    const remainingTexts = manualPhotoTexts.filter((_, i) => i !== index);
    setManualPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    setManualPhotoTexts(remainingTexts);

    const input = document.getElementById('manual-photo-upload') as HTMLInputElement;
    if (input) input.value = '';

    if (remainingTexts.length > 0) {
      await applyParsedRecipeText(remainingTexts.join("\n\n"));
    }
  };

  const handleParseInstagramText = async () => {
    // Validate fields
    if (!instagramName.trim() && !instagramIngredients.trim() && !instagramInstructions.trim()) {
      toast.error("Please fill in at least the recipe name, ingredients, or instructions");
      return;
    }

    // Parse ingredients and instructions by splitting on newlines
    const parsedIngredients = instagramIngredients
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const parsedInstructions = instagramInstructions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Set the data
    if (instagramName.trim()) {
      setRecipeName(instagramName.trim());
    }

    if (parsedIngredients.length > 0) {
      setIngredients(parsedIngredients);
    } else {
      setIngredients([""]);
    }

    if (parsedInstructions.length > 0) {
      setInstructions(parsedInstructions);
    } else {
      setInstructions([""]);
    }

    if (instagramUrl.trim()) {
      setSourceLink(instagramUrl.trim());
    }

    setShowReview(true);
    toast.success("Recipe imported! Please review and fill in any missing details.");
  };

  const handleAutoParseInstagram = async () => {
    if (!instagramPostText.trim()) {
      toast.error("Please paste the Instagram post text");
      return;
    }

    setIsParsingInstagram(true);

    try {
      const extractedData = await extractionAPI.parseRecipeText(
        instagramPostText,
        instagramUrl || undefined
      );

      // Set extracted data
      if (extractedData.name) {
        setRecipeName(extractedData.name);
      }

      if (extractedData.servings) {
        setServings(extractedData.servings);
      }

      if (extractedData.cookingTime) {
        setCookingTime(extractedData.cookingTime);
      }

      if (extractedData.cookingMethod && extractedData.cookingMethod.length > 0) {
        setSelectedMethods(extractedData.cookingMethod as CookingMethod[]);
      }

      if (extractedData.ingredients && extractedData.ingredients.length > 0) {
        setIngredients(extractedData.ingredients);
      } else {
        setIngredients([""]);
      }

      if (extractedData.instructions && extractedData.instructions.length > 0) {
        setInstructions(extractedData.instructions);
      } else {
        setInstructions([""]);
      }

      if (instagramUrl.trim()) {
        setSourceLink(instagramUrl.trim());
      }

      setShowReview(true);
      toast.success("Recipe extracted! Please review and fill in any missing details.");
    } catch (error) {
      console.error("Parse error:", error);
      toast.error("Failed to parse recipe. Please try entering manually.");
    } finally {
      setIsParsingInstagram(false);
    }
  };

  const handleInstagramPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Please upload an image under 10MB.");
      return;
    }

    setInstagramPhoto(file);

    // Create preview with compression
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      try {
        console.log("[Import] Compressing Instagram photo preview...");
        const compressedImage = await compressImage(dataUrl, 800, 600, 0.75);
        setInstagramPhotoPreview(compressedImage);
        console.log("[Import] Photo preview compressed successfully");
      } catch (error) {
        console.error("[Import] Failed to compress preview, using original:", error);
        setInstagramPhotoPreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Start OCR
    setIsParsingInstagram(true);
    setOcrProgress(0);

    try {
      toast.info("Scanning text from image...", { duration: 2000 });

      const { data } = await Tesseract.recognize(
        file,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      const extractedText = data.text;
      console.log("OCR extracted text:", extractedText);

      if (!extractedText || extractedText.trim().length < 20) {
        toast.error("Could not extract enough text from the image. Please try a clearer photo or paste the text manually.");
        setIsParsingInstagram(false);
        return;
      }

      // Set the text in the textarea so user can see what was extracted
      setInstagramPostText(extractedText);

      toast.success("Text extracted! Now parsing recipe details...", { duration: 2000 });

      // Parse the extracted text
      const extractedData = await extractionAPI.parseRecipeText(
        extractedText,
        instagramUrl || undefined
      );

      // Set extracted data
      if (extractedData.name) {
        setRecipeName(extractedData.name);
      }

      if (extractedData.servings) {
        setServings(extractedData.servings);
      }

      if (extractedData.cookingTime) {
        setCookingTime(extractedData.cookingTime);
      }

      if (extractedData.cookingMethod && extractedData.cookingMethod.length > 0) {
        setSelectedMethods(extractedData.cookingMethod as CookingMethod[]);
      }

      if (extractedData.ingredients && extractedData.ingredients.length > 0) {
        setIngredients(extractedData.ingredients);
      } else {
        setIngredients([""]);
      }

      if (extractedData.instructions && extractedData.instructions.length > 0) {
        setInstructions(extractedData.instructions);
      } else {
        setInstructions([""]);
      }

      if (instagramUrl.trim()) {
        setSourceLink(instagramUrl.trim());
      }

      setShowReview(true);
      toast.success("Recipe extracted from photo! Please review and edit as needed.");

    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to extract text from image. Please try pasting the text manually instead.");
    } finally {
      setIsParsingInstagram(false);
      setOcrProgress(0);
    }
  };

  const clearInstagramPhoto = () => {
    setInstagramPhoto(null);
    setInstagramPhotoPreview("");
    const input = document.getElementById('instagram-photo-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const addIngredient = () => {
    setIngredients([...ingredients, ""]);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

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

  const toggleCuisineType = (cuisineType: CuisineType) => {
    setSelectedCuisineTypes((prev) =>
      prev.includes(cuisineType) ? prev.filter((c) => c !== cuisineType) : [...prev, cuisineType]
    );
  };

  const handleSaveRecipe = async () => {
    try {
      // Validate required fields
      if (!recipeName.trim()) {
        toast.error("Recipe name is required");
        return;
      }
      
      if (selectedMethods.length === 0) {
        toast.error("Please select at least one cooking method");
        return;
      }

      if (ingredients.filter(i => i.trim()).length === 0) {
        toast.error("Please add at least one ingredient");
        return;
      }

      if (instructions.filter(i => i.trim()).length === 0) {
        toast.error("Please add at least one instruction");
        return;
      }

      // Prepare recipe data
      const recipe = {
        name: recipeName,
        servings,
        cookingTime,
        cookingMethod: selectedMethods,
        category: selectedCategory,
        mealComponent: selectedMealComponent,
        cuisineTypes: selectedCuisineTypes.length > 0 ? selectedCuisineTypes : undefined,
        ingredients: ingredients
          .filter(i => i.trim())
          .map((ing, idx) => {
            // Simple parsing: try to extract amount from the beginning, rest is the name
            const trimmed = ing.trim();
            const amountMatch = trimmed.match(/^([\d\s\/\.\-]+(?:oz|lb|g|kg|ml|l|tsp|tbsp|cup|cups|teaspoon|tablespoon|ounce|ounces|pound|pounds|gram|grams)?\.?\s*(?:\([^)]+\))?)\s+(.+)$/i);
            
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
        instructions: instructions.filter(i => i.trim()),
        tags: selectedTags,
        source: sourceLink || undefined,
        image: recipeImage || undefined,
        notes: notes || undefined,
      };

      console.log("[IMPORT RECIPE] Attempting to save recipe:", {
        name: recipe.name,
        ingredientCount: recipe.ingredients.length,
        instructionCount: recipe.instructions.length,
        tags: recipe.tags,
        hasImage: !!recipe.image,
      });

      console.log("[IMPORT RECIPE] Full recipe object:", JSON.stringify(recipe, null, 2));

      const result = await recipeAPI.create(recipe);

      console.log("[IMPORT RECIPE] ✅ Recipe saved successfully:", {
        id: result.id,
        name: result.name,
      });

      toast.success(`Recipe "${recipe.name}" saved successfully!`);
      navigate("/");
    } catch (error: any) {
      console.error("[IMPORT RECIPE] ❌ Failed to save recipe");
      console.error("[IMPORT RECIPE] Error type:", error?.constructor?.name);
      console.error("[IMPORT RECIPE] Error message:", error?.message);
      console.error("[IMPORT RECIPE] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });

      // More specific error messages
      if (error?.message?.includes('timeout')) {
        toast.error('Request timed out. Please check your connection and try again.');
      } else if (error?.message?.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(`Failed to save recipe: ${error?.message || 'Unknown error. Check console for details.'}`);
      }
    }
  };

  if (showReview) {
    // Check if extraction was unsuccessful (no ingredients and no instructions)
    const extractionFailed = ingredients.filter(i => i.trim()).length === 0 && 
                             instructions.filter(i => i.trim()).length === 0;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-foreground">
                {extractionFailed ? "Extraction Failed - Paste Content" : "Review & Edit Recipe"}
              </CardTitle>
            </div>
            <CardDescription>
              {extractionFailed 
                ? "We couldn't extract the recipe details. Please paste the full recipe content below."
                : "Review the extracted information and make any necessary edits"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {extractionFailed ? (
              /* Show paste content fallback when extraction failed */
              <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Copy className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">Website blocked automatic extraction</p>
                      <p className="text-muted-foreground">
                        This website prevents automated access. To import the recipe:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Open the recipe page in your browser</li>
                        <li>Select and copy all the recipe text (title, ingredients, instructions)</li>
                        <li>Paste it in the box below</li>
                        <li>Click "Parse Recipe Content" - our AI will organize it automatically</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="fallback-paste" className="flex items-center justify-between mb-2">
                    <span>Paste Full Recipe Content</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {pastedText.length} characters
                    </span>
                  </Label>
                  <Textarea
                    id="fallback-paste"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste the entire recipe here including title, ingredients, and instructions..."
                    className="min-h-[300px] bg-card border-border/50 resize-none font-mono text-sm"
                    disabled={isExtracting}
                  />
                </div>

                <Button
                  onClick={handleParseUrlPastedText}
                  disabled={isExtracting || !pastedText.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing recipe...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Parse Recipe Content
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={() => setShowReview(false)} 
                  className="w-full rounded-lg"
                >
                  Go Back
                </Button>
              </div>
            ) : (
              /* Show normal review form when extraction succeeded */
              <>
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Recipe Name</Label>
                <Input
                  id="name"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Enter recipe name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Cooking Time (minutes)</Label>
                  <Input
                    id="time"
                    type="number"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>

              {sourceLink && (
                <div>
                  <Label htmlFor="source">Source URL</Label>
                  <Input
                    id="source"
                    value={sourceLink}
                    onChange={(e) => setSourceLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            {/* Cooking Methods */}
            <div>
              <Label className="mb-3 block">Cooking Methods</Label>
              <div className="flex flex-wrap gap-2">
                {cookingMethods.map((method) => (
                  <Badge
                    key={method}
                    variant={selectedMethods.includes(method) ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      selectedMethods.includes(method)
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
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      selectedCategory === category
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {categoryLabels[category]}
                  </Badge>
                ))}
                {selectedCategory && (
                  <Badge
                    variant="ghost"
                    className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
                    onClick={() => setSelectedCategory(undefined)}
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
                    variant={selectedCuisineTypes.includes(cuisineType) ? "default" : "outline"}
                    className={`cursor-pointer rounded-full transition-all ${
                      selectedCuisineTypes.includes(cuisineType)
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
                    variant={selectedMealComponent === component ? "default" : "outline"}
                    className={`cursor-pointer capitalize rounded-full transition-all ${
                      selectedMealComponent === component
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "border-border/50 hover:border-border"
                    }`}
                    onClick={() => setSelectedMealComponent(component)}
                  >
                    {mealComponentLabels[component]}
                  </Badge>
                ))}
                {selectedMealComponent && (
                  <Badge
                    variant="ghost"
                    className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground border-border/50 hover:border-border"
                    onClick={() => setSelectedMealComponent(undefined)}
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
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      placeholder="e.g., 2 cups flour"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addIngredient} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <Label className="mb-3 block">Instructions</Label>
              <div className="space-y-2">
                {instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mt-2">
                      {index + 1}
                    </span>
                    <Textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder="Enter step..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                      disabled={instructions.length === 1}
                      className="mt-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addInstruction} className="w-full">
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
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer rounded-full transition-all ${
                      selectedTags.includes(tag)
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or comments about the recipe"
                rows={4}
                className="flex-1"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveRecipe}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 rounded-lg"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Recipe
              </Button>
              <Button variant="outline" onClick={() => setShowReview(false)} className="rounded-lg">
                Cancel
              </Button>
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Import Recipe</h1>
        <p className="text-muted-foreground text-sm">
          Add a new recipe to your collection
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="url" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4 mr-2" />
            URL
          </TabsTrigger>
          <TabsTrigger value="photo" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Camera className="w-4 h-4 mr-2" />
            Photo
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <PenLine className="w-4 h-4 mr-2" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* URL Import */}
        <TabsContent value="url">
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Import from URL</CardTitle>
                    <CardDescription>
                      Paste a recipe URL from Instagram, blogs, or cooking websites
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="url">Recipe URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/recipe"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={isExtracting}
                      className="bg-card border-border/50"
                    />
                  </div>
                  <Button
                    onClick={handleExtractFromUrl}
                    disabled={isExtracting || !url}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extract Recipe
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    AI will automatically extract recipe details. If extraction fails, you'll be able to paste the content manually.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Photo Import */}
        <TabsContent value="photo">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Upload Photo</CardTitle>
                  <CardDescription>
                    Upload a photo of a cookbook page or handwritten recipe
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/30 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={isExtracting}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <ImageUp className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium text-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG up to 10MB
                    </p>
                  </label>
                </div>
                {photoFile && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <Check className="w-5 h-5 text-primary" />
                    <span className="text-sm text-primary">{photoFile.name}</span>
                  </div>
                )}
                {isExtracting && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-foreground">AI is reading your recipe...</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  AI will scan and extract the recipe from your photo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry */}
        <TabsContent value="manual">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
              <CardDescription>
                Enter recipe details manually or scan a photo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Photo Upload with OCR */}
                <div>
                  <Label className="mb-2 block">Scan Recipe from Photo (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    If the recipe doesn't fit in one screenshot, upload multiple and they'll be combined.
                  </p>
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/30 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleManualPhotosUpload}
                      className="hidden"
                      id="manual-photo-upload"
                      disabled={isManualOcr}
                    />
                    <label htmlFor="manual-photo-upload" className="cursor-pointer">
                      <Scan className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-medium text-foreground mb-1 text-sm">
                        {manualPhotoPreviews.length > 0 ? "Add another screenshot" : "Scan recipe from photo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to upload • PNG, JPG up to 10MB each
                      </p>
                    </label>
                  </div>
                  {manualPhotoPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {manualPhotoPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-border/50"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-background/80 backdrop-blur-sm hover:bg-background"
                            onClick={() => handleRemoveManualPhoto(index)}
                            disabled={isManualOcr}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isManualOcr && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-foreground">Scanning recipe... {ocrProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="manual-name">Recipe Name</Label>
                  <Input
                    id="manual-name"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="Enter recipe name"
                    className="bg-card border-border/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manual-servings">Servings</Label>
                    <Input
                      id="manual-servings"
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value))}
                      min={1}
                      className="bg-card border-border/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-time">Cooking Time (min)</Label>
                    <Input
                      id="manual-time"
                      type="number"
                      value={cookingTime}
                      onChange={(e) => setCookingTime(Number(e.target.value))}
                      min={1}
                      className="bg-card border-border/50"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleManualEntry}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  Continue to Full Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}