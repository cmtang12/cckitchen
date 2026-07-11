import { useState, useEffect, useMemo } from "react";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Package, Copy, Download, Mail, Share2, Check, X, GripVertical, Clock, Users, Plus, Pencil } from "lucide-react";
import { Input } from "../components/ui/input";
import { Link } from "react-router";
import { MealPlan, Recipe, Ingredient } from "../types";
import { toast } from "sonner";
import { cleanIngredientName, normalizeIngredientKey, formatDisplayName, formatEstimate } from "../utils/groceryList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Categories for organizing ingredients
const INGREDIENT_CATEGORIES = {
  produce: ["onion", "garlic", "tomato", "lettuce", "carrot", "celery", "potato", "bell pepper", "spinach", "broccoli", "cauliflower", "cucumber", "zucchini", "mushroom", "corn", "peas", "bean", "lemon", "lime", "orange", "apple", "banana", "avocado", "fresh herbs", "parsley", "cilantro", "fresh basil", "fresh thyme", "fresh rosemary", "ginger", "kale", "cabbage", "squash", "eggplant", "asparagus", "green bean", "snap pea"],
  meat: ["chicken", "beef", "pork", "turkey", "lamb", "duck", "bacon", "sausage", "ham", "steak", "ground beef", "ground turkey", "ground chicken", "ribeye", "sirloin", "tenderloin", "thigh", "breast", "drumstick", "wing"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "sour cream", "cottage cheese", "cheddar", "mozzarella", "parmesan", "feta", "goat cheese", "cream cheese", "heavy cream", "half and half", "whipping cream", "egg"],
  frozen: ["frozen"],
  spices: ["salt", "pepper", "black pepper", "white pepper", "red pepper", "red pepper flakes", "crushed red pepper", "cayenne", "paprika", "cumin", "coriander", "turmeric", "cinnamon", "nutmeg", "cloves", "cardamom", "curry", "chili powder", "garlic powder", "onion powder", "oregano", "dried thyme", "dried rosemary", "dried basil", "sage", "bay leaf", "bay leaves", "dill", "tarragon", "fennel", "allspice", "ginger powder", "ground ginger", "mustard powder", "cornstarch", "corn starch", "powder", "dried", "ground", "crushed", "spice", "seasoning", "vanilla extract", "almond extract", "extract"],
  pantry: ["stock", "broth", "oil", "olive oil", "vegetable oil", "canola oil", "coconut oil", "sesame oil", "cooking oil", "vinegar", "apple cider vinegar", "balsamic vinegar", "red wine vinegar", "white wine vinegar", "rice vinegar", "tomato paste", "paste"] // Explicitly include stock, broth, oils, vinegars, and pastes
};

interface CategorizedIngredient {
  key: string; // stable identity used for merging/checking/removing/editing, independent of display text
  name: string;
  estimate: string; // e.g. "(2)", or "" when no meaningful count (measured amounts like "1 tablespoon")
  amounts: Array<{ amount: string; recipeId: string }>;
  recipeNames: string[];
  category: string;
}

function categorizeIngredient(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase();
  
  // Check for frozen items first - highest priority for frozen
  if (lowerName.includes("frozen")) {
    return "frozen";
  }
  
  // Check for oil to ensure they go to pantry
  if (lowerName.includes("oil")) {
    return "pantry";
  }
  
  // Check for vinegar to ensure they go to pantry
  if (lowerName.includes("vinegar")) {
    return "pantry";
  }
  
  // Check for stock/broth to ensure they go to pantry
  if (lowerName.includes("stock") || lowerName.includes("broth")) {
    return "pantry";
  }
  
  // Check for paste (tomato paste, etc.) to ensure they go to pantry
  if (lowerName.includes("paste")) {
    return "pantry";
  }
  
  // Check for spice indicators (before produce, since many spices contain produce words)
  // Strong spice indicators
  const spiceIndicators = ["powder", "ground", "dried", "crushed", "extract", "seasoning", "spice"];
  for (const indicator of spiceIndicators) {
    if (lowerName.includes(indicator)) {
      return "spices";
    }
  }
  
  // Check specific spice keywords
  const spiceKeywords = INGREDIENT_CATEGORIES.spices;
  for (const keyword of spiceKeywords) {
    if (lowerName.includes(keyword)) {
      return "spices";
    }
  }
  
  // Then check other categories
  for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (category === "pantry" || category === "spices" || category === "frozen") continue; // Already checked
    
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }
  
  return "pantry"; // Default category
}

// Draggable Ingredient Item Component
interface DraggableIngredientProps {
  item: CategorizedIngredient;
  isChecked: boolean;
  onToggleCheck: (key: string) => void;
  onRemove: (key: string) => void;
  onEdit: (item: CategorizedIngredient) => void;
}

const DraggableIngredient = ({ item, isChecked, onToggleCheck, onRemove, onEdit }: DraggableIngredientProps) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'INGREDIENT',
    item: { key: item.key },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [item.key]);

  return (
    <div
      ref={preview}
      className={`flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <button
        onClick={() => onToggleCheck(item.key)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer ${
          isChecked
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        }`}
      >
        {isChecked && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
      </button>
      <div
        ref={drag}
        className="cursor-move flex-shrink-0 mt-0.5"
        title="Drag to move to another category"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-all ${
          isChecked
            ? "line-through text-muted-foreground/50"
            : "text-foreground"
        }`}>
          {item.name}{item.estimate ? ` ${item.estimate}` : ""}
        </p>
        {item.recipeNames.length > 1 && (
          <p className={`text-xs mt-0.5 transition-opacity ${
            isChecked
              ? "text-muted-foreground/30"
              : "text-muted-foreground"
          }`}>
            Used in {item.recipeNames.length} recipes
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(item)}
        className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Edit ingredient"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.key)}
        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Remove ingredient"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Droppable Category Component
interface DroppableCategoryProps {
  category: string;
  children: React.ReactNode;
  onDrop: (ingredientName: string, targetCategory: string) => void;
}

const DroppableCategory = ({ category, children, onDrop }: DroppableCategoryProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'INGREDIENT',
    drop: (item: { key: string }) => {
      onDrop(item.key, category);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [category, onDrop]);

  return (
    <div
      ref={drop}
      className={`transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
};

export function GroceryList() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [removedIngredients, setRemovedIngredients] = useState<Set<string>>(new Set());
  const [removedCategories, setRemovedCategories] = useState<Set<string>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, string>>(new Map());
  const [adHocItems, setAdHocItems] = useState<CategorizedIngredient[]>([]);
  const [itemEdits, setItemEdits] = useState<Map<string, { name: string; estimate: string }>>(new Map());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('pantry');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEstimate, setEditEstimate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Load persisted state when meal plan changes
  useEffect(() => {
    if (!selectedPlanId) return;

    // Load category overrides
    const savedOverrides = localStorage.getItem(`grocery-overrides-${selectedPlanId}`);
    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides);
        setCategoryOverrides(new Map(Object.entries(parsed)));
      } catch (error) {
        console.error("Failed to load category overrides:", error);
      }
    } else {
      setCategoryOverrides(new Map());
    }

    // Load checked items
    const savedChecked = localStorage.getItem(`grocery-checked-${selectedPlanId}`);
    if (savedChecked) {
      try {
        const parsed = JSON.parse(savedChecked);
        setCheckedIngredients(new Set(parsed));
      } catch (error) {
        console.error("Failed to load checked items:", error);
      }
    } else {
      setCheckedIngredients(new Set());
    }

    // Load removed ingredients
    const savedRemovedIngredients = localStorage.getItem(`grocery-removed-ingredients-${selectedPlanId}`);
    if (savedRemovedIngredients) {
      try {
        const parsed = JSON.parse(savedRemovedIngredients);
        setRemovedIngredients(new Set(parsed));
      } catch (error) {
        console.error("Failed to load removed ingredients:", error);
      }
    } else {
      setRemovedIngredients(new Set());
    }

    // Load removed categories
    const savedRemovedCategories = localStorage.getItem(`grocery-removed-categories-${selectedPlanId}`);
    if (savedRemovedCategories) {
      try {
        const parsed = JSON.parse(savedRemovedCategories);
        setRemovedCategories(new Set(parsed));
      } catch (error) {
        console.error("Failed to load removed categories:", error);
      }
    } else {
      setRemovedCategories(new Set());
    }

    // Load ad hoc items
    const savedAdHoc = localStorage.getItem(`grocery-adhoc-${selectedPlanId}`);
    if (savedAdHoc) {
      try {
        setAdHocItems(JSON.parse(savedAdHoc));
      } catch (error) {
        console.error("Failed to load ad hoc items:", error);
        setAdHocItems([]);
      }
    } else {
      setAdHocItems([]);
    }

    // Load manual item edits
    const savedEdits = localStorage.getItem(`grocery-edits-${selectedPlanId}`);
    if (savedEdits) {
      try {
        const parsed = JSON.parse(savedEdits);
        setItemEdits(new Map(Object.entries(parsed)));
      } catch (error) {
        console.error("Failed to load item edits:", error);
        setItemEdits(new Map());
      }
    } else {
      setItemEdits(new Map());
    }
  }, [selectedPlanId]);

  // Persist category overrides
  useEffect(() => {
    if (!selectedPlanId) return;
    
    const overridesObj = Object.fromEntries(categoryOverrides);
    localStorage.setItem(`grocery-overrides-${selectedPlanId}`, JSON.stringify(overridesObj));
  }, [categoryOverrides, selectedPlanId]);

  // Persist checked items
  useEffect(() => {
    if (!selectedPlanId) return;
    
    const checkedArray = Array.from(checkedIngredients);
    localStorage.setItem(`grocery-checked-${selectedPlanId}`, JSON.stringify(checkedArray));
  }, [checkedIngredients, selectedPlanId]);

  // Persist removed ingredients
  useEffect(() => {
    if (!selectedPlanId) return;
    
    const removedArray = Array.from(removedIngredients);
    localStorage.setItem(`grocery-removed-ingredients-${selectedPlanId}`, JSON.stringify(removedArray));
  }, [removedIngredients, selectedPlanId]);

  // Persist removed categories
  useEffect(() => {
    if (!selectedPlanId) return;

    const removedArray = Array.from(removedCategories);
    localStorage.setItem(`grocery-removed-categories-${selectedPlanId}`, JSON.stringify(removedArray));
  }, [removedCategories, selectedPlanId]);

  // Persist ad hoc items
  useEffect(() => {
    if (!selectedPlanId) return;
    localStorage.setItem(`grocery-adhoc-${selectedPlanId}`, JSON.stringify(adHocItems));
  }, [adHocItems, selectedPlanId]);

  // Persist manual item edits
  useEffect(() => {
    if (!selectedPlanId) return;
    const editsObj = Object.fromEntries(itemEdits);
    localStorage.setItem(`grocery-edits-${selectedPlanId}`, JSON.stringify(editsObj));
  }, [itemEdits, selectedPlanId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, recipesData] = await Promise.all([
        mealPlanAPI.getAll(),
        recipeAPI.getAll(),
      ]);
      setMealPlans(plansData);
      setRecipes(recipesData);
      
      // Auto-select based on count
      if (plansData.length === 1) {
        // Only one plan - auto-select it
        setSelectedPlanId(plansData[0].id);
      } else if (plansData.length > 1) {
        // Multiple plans - select the most recent
        const sortedPlans = [...plansData].sort(
          (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
        );
        setSelectedPlanId(sortedPlans[0].id);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const recipeMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r])),
    [recipes]
  );

  const generateGroceryList = (): Record<string, CategorizedIngredient[]> => {
    if (!selectedPlanId) return {};

    const plan = mealPlans.find((p) => p.id === selectedPlanId);
    if (!plan) return {};

    // Collect all ingredients from all meals in the plan, merging duplicates
    // (e.g. "1/2 onion" in two recipes) by a normalized key rather than raw text.
    interface RawIngredientGroup {
      rawName: string;
      amounts: Array<{ amount: string; recipeId: string }>;
      recipeNames: string[];
      category: string;
    }
    const ingredientMap = new Map<string, RawIngredientGroup>();

    plan.meals.forEach((meal) => {
      const recipe = recipeMap.get(meal.recipeId);
      if (recipe) {
        recipe.ingredients.forEach((ing) => {
          const key = normalizeIngredientKey(ing.name) || ing.name.toLowerCase().trim();
          if (!key) return;

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.amounts.push({ amount: ing.amount, recipeId: recipe.id });
            if (!existing.recipeNames.includes(recipe.name)) {
              existing.recipeNames.push(recipe.name);
            }
          } else {
            const cleanedName = cleanIngredientName(ing.name) || ing.name.trim();
            // Check for user override first, then auto-categorize
            const autoCategory = categorizeIngredient(cleanedName);
            const category = categoryOverrides.get(key) || autoCategory;
            ingredientMap.set(key, {
              rawName: cleanedName,
              amounts: [{ amount: ing.amount, recipeId: recipe.id }],
              recipeNames: [recipe.name],
              category,
            });
          }
        });
      }
    });

    // Group by category
    const categorized: Record<string, CategorizedIngredient[]> = {
      produce: [],
      meat: [],
      dairy: [],
      frozen: [],
      spices: [],
      pantry: [],
    };

    ingredientMap.forEach((group, key) => {
      // Skip removed ingredients
      if (removedIngredients.has(key)) return;

      const estimate = formatEstimate(group.amounts.map((a) => a.amount));
      const item: CategorizedIngredient = {
        key,
        name: formatDisplayName(group.rawName, estimate !== ""),
        estimate,
        amounts: group.amounts,
        recipeNames: group.recipeNames,
        category: group.category,
      };

      // Apply category override if exists
      const finalCategory = categoryOverrides.get(key) || item.category;
      (categorized[finalCategory] ?? (categorized[finalCategory] = [])).push(item);
    });

    // Include ad hoc items
    adHocItems.forEach((item) => {
      if (removedIngredients.has(item.key)) return;
      const finalCategory = categoryOverrides.get(item.key) || item.category;
      const bucket = categorized[finalCategory] ?? (categorized[finalCategory] = []);
      // Avoid duplicates with recipe ingredients
      if (!bucket.some((i) => i.key === item.key)) {
        bucket.push(item);
      }
    });

    // Apply manual edits (user-entered overrides of name/estimate) as the final step
    Object.values(categorized).forEach((items) => {
      items.forEach((item) => {
        const edit = itemEdits.get(item.key);
        if (edit) {
          item.name = edit.name;
          item.estimate = edit.estimate;
        }
      });
    });

    // Sort within each category
    Object.keys(categorized).forEach((category) => {
      categorized[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return categorized;
  };

  const findItemName = (key: string): string => {
    for (const items of Object.values(categorizedList)) {
      const found = items.find((i) => i.key === key);
      if (found) return found.name;
    }
    return key;
  };

  const moveIngredient = (key: string, targetCategory: string) => {
    setCategoryOverrides(prev => {
      const newMap = new Map(prev);
      newMap.set(key, targetCategory);
      return newMap;
    });
    toast.success(`Moved ${findItemName(key)} to ${categoryNames[targetCategory]}`);
  };

  const categoryNames: Record<string, string> = {
    produce: "Produce",
    meat: "Meat & Seafood",
    dairy: "Dairy & Eggs",
    frozen: "Frozen",
    spices: "Spices",
    pantry: "Pantry & Other"
  };

  const categorizedList = useMemo(
    () => generateGroceryList(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPlanId, mealPlans, recipeMap, categoryOverrides, removedIngredients, adHocItems, itemEdits]
  );
  const totalItems = useMemo(
    () => Object.values(categorizedList).reduce((sum, items) => sum + items.length, 0),
    [categorizedList]
  );

  const recipeNames = useMemo((): string => {
    if (!selectedPlanId) return "";
    const plan = mealPlans.find((p) => p.id === selectedPlanId);
    if (!plan) return "";
    return plan.meals.map((meal) => recipeMap.get(meal.recipeId)?.name || "Unknown Recipe").join(", ");
  }, [selectedPlanId, mealPlans, recipeMap]);

  const DRINK_KEYWORDS = ['smoothie', 'juice', 'shake', 'drink', 'beverage', 'latte', 'coffee', 'tea', 'matcha', 'lemonade', 'milk'];

  const menuRecipes = useMemo(() => {
    if (!selectedPlanId) return { meals: [], snacks: [] };
    const plan = mealPlans.find((p) => p.id === selectedPlanId);
    if (!plan) return { meals: [], snacks: [] };

    const seen = new Set<string>();
    const meals: { recipe: typeof recipeMap extends Map<string, infer V> ? V : never; mealType?: string }[] = [];
    const snacks: { recipe: typeof recipeMap extends Map<string, infer V> ? V : never }[] = [];

    plan.meals.forEach((meal) => {
      if (seen.has(meal.recipeId)) return;
      seen.add(meal.recipeId);
      const recipe = recipeMap.get(meal.recipeId);
      if (!recipe) return;
      const nameLower = recipe.name.toLowerCase();
      const isDrink = DRINK_KEYWORDS.some(k => nameLower.includes(k));
      if (recipe.category === 'snack' || recipe.category === 'dessert' || isDrink) {
        snacks.push({ recipe });
      } else {
        meals.push({ recipe, mealType: meal.mealType });
      }
    });

    return { meals, snacks };
  }, [selectedPlanId, mealPlans, recipeMap]);

  const formatGroceryListText = () => {
    const selectedPlan = mealPlans.find((p) => p.id === selectedPlanId);
    const planName = selectedPlan?.name || "Meal Plan";
    
    let text = `SmartMeal Planner - Grocery List\n`;
    text += `${planName}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    text += `SHOPPING LIST\n`;
    text += `${"=".repeat(40)}\n\n`;

    const categoryNames: Record<string, string> = {
      produce: "PRODUCE",
      meat: "MEAT & SEAFOOD",
      dairy: "DAIRY & EGGS",
      frozen: "FROZEN",
      spices: "SPICES",
      pantry: "PANTRY & OTHER"
    };

    Object.entries(categorizedList).forEach(([category, items]) => {
      if (items.length === 0) return;
      
      text += `${categoryNames[category]}\n`;
      text += `${"-".repeat(40)}\n`;
      
      items.forEach((item) => {
        text += `☐ ${item.name}`;
        if (item.estimate) text += ` ${item.estimate}`;
        if (item.recipeNames.length > 1) {
          text += ` — used in ${item.recipeNames.length} recipes`;
        }
        text += `\n`;
      });
      
      text += `\n`;
    });

    return text;
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatGroceryListText());
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = formatGroceryListText();
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopied(true);
          toast.success("Copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Fallback copy failed:", err);
          toast.error("Failed to copy to clipboard");
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Unable to copy. Please try downloading instead.");
    }
  };

  const downloadAsText = () => {
    const text = formatGroceryListText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grocery-list-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Grocery list downloaded!");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("SmartMeal Planner - Grocery List");
    const body = encodeURIComponent(formatGroceryListText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaWebShare = async () => {
    if (!navigator.share || !navigator.canShare) {
      toast.error("Share not supported on this device");
      return;
    }

    try {
      const shareData = {
        title: "SmartMeal Planner - Grocery List",
        text: formatGroceryListText(),
      };

      if (navigator.canShare && !navigator.canShare(shareData)) {
        toast.error("Unable to share this content");
        return;
      }

      await navigator.share(shareData);
      toast.success("Shared successfully!");
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }
      
      console.error("Failed to share:", error);
      
      if (error.name === "NotAllowedError") {
        toast.error("Share permission denied. Try Email or Download instead.");
      } else {
        toast.error("Unable to share. Try Email or Download instead.");
      }
    }
  };

  const addAdHocItem = () => {
    const rawName = newItemName.trim();
    if (!rawName) return;
    const key = normalizeIngredientKey(rawName) || rawName.toLowerCase();
    const category = categoryOverrides.get(key) || newItemCategory;
    const amount = newItemAmount.trim();
    const estimate = amount ? formatEstimate([amount]) : '';
    const newItem: CategorizedIngredient = {
      key,
      name: formatDisplayName(cleanIngredientName(rawName) || rawName, estimate !== ""),
      estimate,
      amounts: amount ? [{ amount, recipeId: 'adhoc' }] : [],
      recipeNames: [],
      category,
    };
    setAdHocItems(prev => {
      const exists = prev.findIndex(i => i.key === key);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });
    // Also un-remove it if it was previously removed
    setRemovedIngredients(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
    setNewItemName('');
    setNewItemAmount('');
    setNewItemCategory('pantry');
    setShowAddForm(false);
    toast.success(`Added ${newItem.name}`);
  };

  const removeIngredient = (key: string) => {
    // If it's an ad hoc item, delete it directly instead of hiding via removedIngredients
    const isAdHoc = adHocItems.some(i => i.key === key);
    if (isAdHoc) {
      setAdHocItems(prev => prev.filter(i => i.key !== key));
    } else {
      setRemovedIngredients(prev => {
        const newSet = new Set(prev);
        newSet.add(key);
        return newSet;
      });
    }
    // Clear any manual edit for this item too
    setItemEdits(prev => {
      if (!prev.has(key)) return prev;
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
    toast.success(`Removed ${findItemName(key)}`);
  };

  const removeCategory = (category: string) => {
    setRemovedCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(category);
      return newSet;
    });
    toast.success(`Removed ${category} category`);
  };

  const toggleIngredientCheck = (key: string) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const startEdit = (item: CategorizedIngredient) => {
    setEditingKey(item.key);
    setEditName(item.name);
    setEditEstimate(item.estimate.replace(/^\(|\)$/g, ''));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
    setEditEstimate('');
  };

  const saveEdit = () => {
    if (!editingKey) return;
    const name = editName.trim();
    if (!name) {
      cancelEdit();
      return;
    }
    const estimateRaw = editEstimate.trim();
    const estimate = estimateRaw ? (estimateRaw.startsWith('(') ? estimateRaw : `(${estimateRaw})`) : '';
    setItemEdits(prev => {
      const newMap = new Map(prev);
      newMap.set(editingKey, { name, estimate });
      return newMap;
    });
    cancelEdit();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="h-9 w-48 bg-muted/60 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full bg-muted/40 rounded-lg animate-pulse mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-8">
            <div className="h-6 w-32 bg-muted/60 rounded animate-pulse mb-4" />
            <div className="rounded-xl border border-border/50 p-6 space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-10 w-full bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mealPlans.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Grocery List</h1>
          <p className="text-muted-foreground text-sm">
            Automatically generated shopping lists from your meal plans
          </p>
        </div>

        {/* Empty State */}
        <Card className="border-border/50">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Package className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              No Grocery List Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create and save a meal plan to automatically generate your grocery list
            </p>
            <Link to="/meal-plans">
              <Button className="bg-primary hover:bg-primary/90">
                Go to Meal Planner
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <DndProvider backend={HTML5Backend}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground mb-6">Meal Plan</h1>
        <Select value={selectedPlanId || undefined} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-full border-border/50">
            <SelectValue placeholder="Select a meal plan" />
          </SelectTrigger>
          <SelectContent>
            {mealPlans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="menu">
        <TabsList className="mb-6">
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="grocery">Grocery List</TabsTrigger>
        </TabsList>

        {/* ── MENU TAB ── */}
        <TabsContent value="menu">
          {menuRecipes.meals.length === 0 && menuRecipes.snacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipes in this plan.</p>
          ) : (
            <div className="space-y-12">

              {/* Meals */}
              {menuRecipes.meals.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Meals</h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-0 divide-y divide-border/50">
                    {menuRecipes.meals.map(({ recipe, mealType }) => (
                      <div key={recipe.id} className="py-5 flex gap-4">
                        {recipe.image && (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <Link to={`/recipes/${recipe.id}`} className="font-semibold text-foreground leading-snug hover:text-primary transition-colors">
                              {recipe.name}
                            </Link>
                            {mealType && (
                              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                                {mealType}
                              </span>
                            )}
                          </div>
                          {recipe.cuisineTypes && recipe.cuisineTypes.length > 0 && (
                            <p className="text-xs text-muted-foreground mb-2 italic">
                              {recipe.cuisineTypes.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {recipe.ingredients.slice(0, 6).map(i => i.name).join(", ")}
                            {recipe.ingredients.length > 6 && ` +${recipe.ingredients.length - 6} more`}
                          </p>
                          {recipe.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-2 italic">{recipe.notes}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {recipe.cookingTime > 0 && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookingTime}m</span>
                            )}
                            {recipe.servings > 0 && (
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snacks, Drinks & Desserts */}
              {menuRecipes.snacks.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Snacks, Drinks & Desserts</h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-0 divide-y divide-border/50">
                    {menuRecipes.snacks.map(({ recipe }) => (
                      <div key={recipe.id} className="py-5 flex gap-4">
                        {recipe.image && (
                          <img
                            src={recipe.image}
                            alt={recipe.name}
                            className="w-20 h-20 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <Link to={`/recipes/${recipe.id}`} className="font-semibold text-foreground leading-snug hover:text-primary transition-colors mb-1 block">
                            {recipe.name}
                          </Link>
                          {recipe.cuisineTypes && recipe.cuisineTypes.length > 0 && (
                            <p className="text-xs text-muted-foreground mb-2 italic">
                              {recipe.cuisineTypes.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {recipe.ingredients.slice(0, 6).map(i => i.name).join(", ")}
                            {recipe.ingredients.length > 6 && ` +${recipe.ingredients.length - 6} more`}
                          </p>
                          {recipe.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-2 italic">{recipe.notes}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {recipe.cookingTime > 0 && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.cookingTime}m</span>
                            )}
                            {recipe.servings > 0 && (
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </TabsContent>

        {/* ── GROCERY LIST TAB ── */}
        <TabsContent value="grocery">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Copy to clipboard">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={downloadAsText} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Download as text">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={shareViaEmail} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Share via email">
                <Mail className="w-4 h-4" />
              </Button>
              {navigator.share && (
                <Button variant="ghost" size="icon" onClick={shareViaWebShare} className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Share">
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Add Ingredient Button / Form */}
          <div className="mb-6">
            {showAddForm ? (
              <div className="flex flex-col sm:flex-row gap-2 p-4 rounded-lg border border-border/50 bg-muted/20">
                <Input
                  placeholder="Ingredient name"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAdHocItem(); if (e.key === 'Escape') setShowAddForm(false); }}
                  autoFocus
                  className="flex-1"
                />
                <Input
                  placeholder="Estimate (optional)"
                  value={newItemAmount}
                  onChange={e => setNewItemAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAdHocItem(); if (e.key === 'Escape') setShowAddForm(false); }}
                  className="sm:w-36"
                />
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground sm:w-40"
                >
                  {Object.entries(categoryNames).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button onClick={addAdHocItem} className="flex-1 sm:flex-none" disabled={!newItemName.trim()}>
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewItemName(''); setNewItemAmount(''); setNewItemCategory('pantry'); }} className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} className="w-full border-dashed text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            )}
          </div>

          <div className="space-y-8">
            {Object.entries(categorizedList).map(([category, items]) => {
              if (items.length === 0 || removedCategories.has(category)) return null;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">{categoryNames[category]}</h2>
                    {category === "spices" && (
                      <Button variant="ghost" size="sm" onClick={() => removeCategory(category)} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5 mr-1.5" />Remove all spices
                      </Button>
                    )}
                  </div>
                  <DroppableCategory category={category} onDrop={moveIngredient}>
                    <Card className="border-border/50">
                      <CardContent className="p-6">
                        <div className="space-y-2">
                          {items.map((item) => (
                            editingKey === item.key ? (
                              <div
                                key={item.key}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-lg border border-primary/50 bg-muted/20"
                              >
                                <Input
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                  autoFocus
                                  className="flex-1"
                                />
                                <Input
                                  value={editEstimate}
                                  onChange={e => setEditEstimate(e.target.value)}
                                  placeholder="Estimate e.g. 2"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                  className="sm:w-32"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEdit} disabled={!editName.trim()} className="flex-1 sm:flex-none">
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit} className="flex-1 sm:flex-none">
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <DraggableIngredient
                                key={item.key}
                                item={item}
                                isChecked={checkedIngredients.has(item.key)}
                                onToggleCheck={toggleIngredientCheck}
                                onRemove={removeIngredient}
                                onEdit={startEdit}
                              />
                            )
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </DroppableCategory>
                </div>
              );
            })}

            {totalItems === 0 && (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No ingredients in this meal plan</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

    </div>
    </DndProvider>
  );
}