import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

// Store original console.error
const originalConsoleError = console.error;

// Override console.error to filter connection closed errors
console.error = (...args: any[]) => {
  // Convert all args to string for comprehensive checking
  const allArgsString = args.map(arg => {
    if (arg && typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join(' ').toLowerCase();

  // Check for connection error patterns
  if (allArgsString.includes('connection closed') ||
      allArgsString.includes('message completed') ||
      allArgsString.includes('broken pipe') ||
      allArgsString.includes('epipe') ||
      allArgsString.includes('respondwith') ||
      allArgsString.includes('ext:runtime')) {
    return; // Suppress - don't log
  }

  // Check each argument individually for error objects
  for (const arg of args) {
    if (arg && typeof arg === 'object' && arg.name === 'Http') {
      return; // Suppress Http errors immediately
    }
  }

  // If we got here, it's not a connection error - log it normally
  originalConsoleError.apply(console, args);
};

// Global error event handlers
globalThis.addEventListener("error", (event) => {
  const error = event.error;
  if (error && (error.name === "Http" || String(error.message || "").toLowerCase().includes("connection closed"))) {
    event.preventDefault();
  }
});

globalThis.addEventListener("unhandledrejection", (event) => {
  const error = event.reason;
  if (error && (error.name === "Http" || String(error.message || "").toLowerCase().includes("connection closed"))) {
    event.preventDefault();
  }
});

// Types
interface Recipe {
  id: string;
  name: string;
  image?: string;
  source?: string;
  servings: number;
  cookingTime: number;
  cookingMethod: string[];
  category?: string;
  mealComponent?: string; // NEW: protein | veggie | carb | complete-meal
  cuisineTypes?: string[]; // NEW: Types of cuisine (can be multiple)
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  customTags?: string[];
  isLoved?: boolean;
  notes?: string;
  dateAdded: string;
  timesCookedLog?: string[];
  rating?: number;
  recommendedPairings?: string[];
}

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  category: string;
}

interface MealPlan {
  id: string;
  name: string;
  dateCreated: string;
  rules: any;
  meals: PlannedMeal[];
  aiInsights?: any;
  notes?: string;
}

interface PlannedMeal {
  id: string;
  recipeId: string;
  dayOfWeek: number;
  mealType?: string;
  mealGroupId?: string; // Groups related recipes together (main + sides)
  comment?: string;
}

const app = new Hono();

// Custom logger that ignores connection errors
app.use('*', async (c, next) => {
  const start = Date.now();
  try {
    await next();
  } catch (error: any) {
    // Check for connection errors
    const errorStr = String(error.message || error || '').toLowerCase();
    const isConnectionError = errorStr.includes('broken pipe') ||
        errorStr.includes('connection closed') ||
        errorStr.includes('message completed') ||
        errorStr.includes('epipe') ||
        error.name === 'Http';

    if (!isConnectionError) {
      // Only re-throw non-connection errors
      throw error;
    }
    // For connection errors, silently continue (client already disconnected)
  }

  try {
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
  } catch {
    // Ignore logging errors
  }
});

// Add request size limit middleware
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    console.error(`[SIZE] Request too large: ${contentLength} bytes`);
    return c.json({ error: 'Request body too large. Maximum size is 10MB.' }, 413);
  }
  await next();
});

// Global error handler
app.onError((err, c) => {
  // Check if connection is already closed
  const errorStr = String(err.message || err || '').toLowerCase();
  if (errorStr.includes('broken pipe') || 
      errorStr.includes('connection closed') ||
      errorStr.includes('message completed') ||
      errorStr.includes('epipe') ||
      err.name === 'Http') {
    // Don't log connection errors - they're expected when clients navigate away
    return new Response(null, { status: 499 }); // 499 = Client Closed Request
  }
  
  console.error('Unhandled error in request:', err);
  
  return c.json({ 
    error: 'Internal server error', 
    message: err.message,
    details: String(err)
  }, 500);
});

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-9a4224b7/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== RECIPE ROUTES =====

// Get all recipes
app.get("/make-server-9a4224b7/recipes", async (c) => {
  try {
    const recipes = await kv.getByPrefix<Recipe>("recipe:");
    console.log(`[GET RECIPES] Fetched ${recipes?.length || 0} recipes from database`);

    // Log payload size for monitoring
    const payloadSize = JSON.stringify(recipes || []).length;
    const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
    console.log(`[GET RECIPES] Payload size: ${payloadSizeMB}MB`);

    return c.json({ recipes: recipes || [] });
  } catch (error) {
    console.error("[GET RECIPES] Error fetching recipes:", error);
    return c.json({ error: "Failed to fetch recipes", details: String(error) }, 500);
  }
});

// Get single recipe
app.get("/make-server-9a4224b7/recipes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const recipe = await kv.get<Recipe>(`recipe:${id}`);
    
    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }
    
    return c.json({ recipe });
  } catch (error) {
    console.log("Error fetching recipe:", error);
    return c.json({ error: "Failed to fetch recipe", details: String(error) }, 500);
  }
});

// Create recipe
app.post("/make-server-9a4224b7/recipes", async (c) => {
  try {
    console.log("[CREATE RECIPE] Starting recipe creation");

    let recipe: Recipe;
    try {
      recipe = await c.req.json();
      console.log("[CREATE RECIPE] Parsed recipe data:", JSON.stringify(recipe).substring(0, 300));
    } catch (parseError) {
      console.error("[CREATE RECIPE] Failed to parse request body:", parseError);
      return c.json({ error: "Invalid request body - JSON parse failed", details: String(parseError) }, 400);
    }

    // Validate required fields
    if (!recipe.name) {
      console.error("[CREATE RECIPE] Missing recipe name");
      return c.json({ error: "Recipe name is required" }, 400);
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.error("[CREATE RECIPE] Missing ingredients");
      return c.json({ error: "At least one ingredient is required" }, 400);
    }

    if (!recipe.instructions || recipe.instructions.length === 0) {
      console.error("[CREATE RECIPE] Missing instructions");
      return c.json({ error: "At least one instruction is required" }, 400);
    }

    if (!recipe.id) {
      recipe.id = crypto.randomUUID();
      console.log("[CREATE RECIPE] Generated new ID:", recipe.id);
    }

    if (!recipe.dateAdded) {
      recipe.dateAdded = new Date().toISOString();
      console.log("[CREATE RECIPE] Set dateAdded:", recipe.dateAdded);
    }

    console.log("[CREATE RECIPE] Saving to KV store with key:", `recipe:${recipe.id}`);
    await kv.set(`recipe:${recipe.id}`, recipe);
    console.log("[CREATE RECIPE] Recipe saved successfully");

    return c.json({ recipe, message: "Recipe created successfully" }, 201);
  } catch (error: any) {
    console.error("[CREATE RECIPE] Error creating recipe:", error);
    console.error("[CREATE RECIPE] Error stack:", error?.stack);
    return c.json({ error: "Failed to create recipe", details: String(error), stack: error?.stack }, 500);
  }
});

// Update recipe
app.put("/make-server-9a4224b7/recipes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`[UPDATE] Updating recipe ${id}`);
    
    let updates: Partial<Recipe>;
    try {
      updates = await c.req.json();
      console.log(`[UPDATE] Parsed updates:`, JSON.stringify(updates).substring(0, 200));
    } catch (parseError) {
      console.error(`[UPDATE] Failed to parse request body:`, parseError);
      return c.json({ error: "Invalid request body", details: String(parseError) }, 400);
    }
    
    const existing = await kv.get<Recipe>(`recipe:${id}`);
    if (!existing) {
      console.log(`[UPDATE] Recipe ${id} not found`);
      return c.json({ error: "Recipe not found" }, 404);
    }
    
    console.log(`[UPDATE] Merging updates with existing recipe`);
    const updated = { ...existing, ...updates, id };
    
    console.log(`[UPDATE] Saving updated recipe to KV store`);
    await kv.set(`recipe:${id}`, updated);
    
    console.log(`[UPDATE] Recipe ${id} updated successfully`);
    return c.json({ recipe: updated, message: "Recipe updated successfully" });
  } catch (error) {
    console.error(`[UPDATE] Error updating recipe:`, error);
    return c.json({ error: "Failed to update recipe", details: String(error) }, 500);
  }
});

// Delete recipe
app.delete("/make-server-9a4224b7/recipes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`recipe:${id}`);
    
    return c.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.log("Error deleting recipe:", error);
    return c.json({ error: "Failed to delete recipe", details: String(error) }, 500);
  }
});

// ===== MEAL PLAN ROUTES =====

// Get all meal plans
app.get("/make-server-9a4224b7/meal-plans", async (c) => {
  try {
    const plans = await kv.getByPrefix<MealPlan>("mealplan:");
    return c.json({ mealPlans: plans || [] });
  } catch (error) {
    console.log("Error fetching meal plans:", error);
    return c.json({ error: "Failed to fetch meal plans", details: String(error) }, 500);
  }
});

// Get single meal plan
app.get("/make-server-9a4224b7/meal-plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const plan = await kv.get<MealPlan>(`mealplan:${id}`);
    
    if (!plan) {
      return c.json({ error: "Meal plan not found" }, 404);
    }
    
    return c.json({ mealPlan: plan });
  } catch (error) {
    console.log("Error fetching meal plan:", error);
    return c.json({ error: "Failed to fetch meal plan", details: String(error) }, 500);
  }
});

// Create meal plan
app.post("/make-server-9a4224b7/meal-plans", async (c) => {
  try {
    const plan: MealPlan = await c.req.json();
    
    if (!plan.id) {
      plan.id = crypto.randomUUID();
    }
    
    if (!plan.dateCreated) {
      plan.dateCreated = new Date().toISOString();
    }
    
    await kv.set(`mealplan:${plan.id}`, plan);
    
    return c.json({ mealPlan: plan, message: "Meal plan created successfully" }, 201);
  } catch (error) {
    console.log("Error creating meal plan:", error);
    return c.json({ error: "Failed to create meal plan", details: String(error) }, 500);
  }
});

// Update meal plan
app.put("/make-server-9a4224b7/meal-plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates: Partial<MealPlan> = await c.req.json();
    
    const existing = await kv.get<MealPlan>(`mealplan:${id}`);
    if (!existing) {
      return c.json({ error: "Meal plan not found" }, 404);
    }
    
    const updated = { ...existing, ...updates, id };
    await kv.set(`mealplan:${id}`, updated);
    
    return c.json({ mealPlan: updated, message: "Meal plan updated successfully" });
  } catch (error) {
    console.log("Error updating meal plan:", error);
    return c.json({ error: "Failed to update meal plan", details: String(error) }, 500);
  }
});

// Delete meal plan
app.delete("/make-server-9a4224b7/meal-plans/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`mealplan:${id}`);
    
    return c.json({ message: "Meal plan deleted successfully" });
  } catch (error) {
    console.log("Error deleting meal plan:", error);
    return c.json({ error: "Failed to delete meal plan", details: String(error) }, 500);
  }
});

// ===== RECIPE EXTRACTION ROUTE =====

// Extract recipe from URL
app.post("/make-server-9a4224b7/extract-from-url", async (c) => {
  try {
    const { url } = await c.req.json();
    
    if (!url) {
      return c.json({ error: "URL is required" }, 400);
    }

    console.log("Extracting from URL:", url);
    
    // Check if it's an Instagram URL
    if (url.includes("instagram.com")) {
      console.log("Detected Instagram URL, using oEmbed API");
      const instagramResult = await extractInstagramViaOEmbed(url);
      return c.json(instagramResult);
    }

    // For non-Instagram URLs, fetch the page
    console.log("Fetching page HTML...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("Fetch failed:", fetchError.message);
      
      // Return partial result instead of error to allow manual entry
      return c.json({
        error: `Could not access the website: ${fetchError.message}. Please try pasting the recipe content manually.`,
        name: "",
        servings: null,
        cookingTime: null,
        cookingMethod: [],
        ingredients: [],
        instructions: [],
        source: url,
      }, 200);
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to fetch: HTTP ${response.status}`);
      return c.json({
        error: `Failed to fetch URL (HTTP ${response.status}). The website may be blocking automated access. Please try pasting the recipe content manually.`,
        name: "",
        servings: null,
        cookingTime: null,
        cookingMethod: [],
        ingredients: [],
        instructions: [],
        source: url,
      }, 200);
    }

    const html = await response.text();
    console.log("✓ Fetched HTML, length:", html.length);
    
    // Use the comprehensive extraction function
    const result = extractRecipeFromHTML(html, url);
    
    console.log("Extracted:", result.name, "- Ingredients:", result.ingredients.length, "- Instructions:", result.instructions.length);

    return c.json(result);

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log("Request timed out");
      return c.json({ 
        error: "Request timed out. The website took too long to respond.",
        name: "",
        servings: null,
        cookingTime: null,
        cookingMethod: [],
        ingredients: [],
        instructions: [],
        source: ""
      }, 200);
    }
    
    console.log("Extraction error:", error);
    return c.json({ 
      error: `Failed to extract recipe: ${error.message}`,
      name: "",
      servings: null,
      cookingTime: null,
      cookingMethod: [],
      ingredients: [],
      instructions: [],
      source: ""
    }, 200);
  }
});

// Parse recipe from pasted text (for Instagram)
app.post("/make-server-9a4224b7/parse-recipe-text", async (c) => {
  let responseSent = false;
  
  try {
    const { text, sourceUrl } = await c.req.json();
    
    if (!text) {
      responseSent = true;
      return c.json({ error: "Text is required" }, 400);
    }

    // Limit text size to prevent processing issues
    if (text.length > 100000) {
      responseSent = true;
      return c.json({ 
        error: "Text is too large. Please use shorter text (max 100,000 characters).",
        name: "",
        servings: null,
        cookingTime: null,
        cookingMethod: [],
        ingredients: [],
        instructions: [],
        source: sourceUrl || ""
      }, 200);
    }

    console.log("Parsing recipe, text length:", text.length);

    // Initialize empty result
    const emptyResult = {
      error: "",
      name: "",
      servings: null,
      cookingTime: null,
      cookingMethod: [],
      ingredients: [],
      instructions: [],
      source: sourceUrl || ""
    };

    // Quick synchronous parse - don't use promises/timeouts
    let extractedData: any;
    
    try {
      const startTime = Date.now();
      extractedData = extractRecipeFromInstagramText(text);
      const parseTime = Date.now() - startTime;
      
      console.log(`Parsed in ${parseTime}ms`);
      
      // If parsing took too long, log it
      if (parseTime > 5000) {
        console.warn(`Warning: Parsing took ${parseTime}ms - consider optimizing`);
      }
    } catch (parseError: any) {
      console.error("Parse function error:", parseError);
      responseSent = true;
      return c.json({
        ...emptyResult,
        error: "Failed to parse recipe text. The text format may not be recognized."
      }, 200);
    }
    
    // Ensure we have a valid response object
    if (!extractedData || typeof extractedData !== 'object') {
      responseSent = true;
      return c.json({
        ...emptyResult,
        error: "Failed to parse recipe text"
      }, 200);
    }
    
    extractedData.source = sourceUrl || "";

    // Ensure arrays exist and are valid
    extractedData.ingredients = Array.isArray(extractedData.ingredients) ? extractedData.ingredients.slice(0, 50) : [];
    extractedData.instructions = Array.isArray(extractedData.instructions) ? extractedData.instructions.slice(0, 50) : [];
    extractedData.cookingMethod = Array.isArray(extractedData.cookingMethod) ? extractedData.cookingMethod : [];

    console.log(`Result: ${extractedData.name}, Ingredients: ${extractedData.ingredients.length}, Instructions: ${extractedData.instructions.length}`);

    responseSent = true;
    return c.json(extractedData);

  } catch (error: any) {
    console.error("Error parsing recipe text:", error);
    
    // Only send response if we haven't already
    if (!responseSent) {
      responseSent = true;
      return c.json({ 
        error: "Failed to parse recipe text", 
        name: "",
        servings: null,
        cookingTime: null,
        cookingMethod: [],
        ingredients: [],
        instructions: [],
        source: ""
      }, 200);
    }
    
    // If we already sent a response, return a minimal one
    return new Response(null, { status: 499 });
  }
});

// Helper function to extract Instagram recipe
async function extractInstagramRecipe(html: string, url: string): Promise<any> {
  const result: any = {
    name: "",
    servings: null,
    cookingTime: null,
    cookingMethod: [],
    ingredients: [],
    instructions: [],
    source: url
  };

  try {
    console.log("Extracting Instagram data from HTML...");
    
    // Instagram embeds data in the HTML in several possible formats
    
    // Method 1: Try to find embedded JSON in <script> tag
    const scriptRegex = /<script type="application\/json" data-content-len="\d+"[^>]*>(.+?)<\/script>/s;
    const scriptMatch = html.match(scriptRegex);
    
    if (scriptMatch) {
      try {
        const jsonData = JSON.parse(scriptMatch[1]);
        console.log("Found Instagram embedded JSON data");
        
        // Navigate through Instagram's data structure
        // The structure varies, but caption is usually in edge_media_to_caption
        const caption = extractCaptionFromInstagramJSON(jsonData);
        
        if (caption) {
          console.log("Found Instagram caption, length:", caption.length);
          const extracted = extractRecipeFromInstagramText(caption);
          
          // Try to get image
          const imageUrl = extractImageFromInstagramJSON(jsonData);
          if (imageUrl) {
            extracted.image = imageUrl;
          }
          
          return { ...result, ...extracted };
        }
      } catch (e) {
        console.log("Error parsing Instagram JSON:", e);
      }
    }
    
    // Method 2: Try window._sharedData pattern
    const sharedDataRegex = /window\._sharedData\s*=\s*({.+?});<\/script>/s;
    const sharedDataMatch = html.match(sharedDataRegex);
    
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        console.log("Found Instagram _sharedData");
        
        const caption = extractCaptionFromInstagramJSON(sharedData);
        
        if (caption) {
          console.log("Found Instagram caption from _sharedData, length:", caption.length);
          const extracted = extractRecipeFromInstagramText(caption);
          
          const imageUrl = extractImageFromInstagramJSON(sharedData);
          if (imageUrl) {
            extracted.image = imageUrl;
          }
          
          return { ...result, ...extracted };
        }
      } catch (e) {
        console.log("Error parsing _sharedData:", e);
      }
    }
    
    // Method 3: Try meta tags as fallback
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescMatch) {
      const description = ogDescMatch[1];
      console.log("Found og:description, length:", description.length);
      
      if (description.length > 50) {
        const extracted = extractRecipeFromInstagramText(description);
        
        // Try to get image from og:image
        const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch) {
          extracted.image = ogImageMatch[1];
        }
        
        return { ...result, ...extracted };
      }
    }

  } catch (error) {
    console.log("Error parsing Instagram data:", error);
  }

  result.error = "Could not automatically extract recipe from Instagram. Please use the Instagram tab to paste the caption text manually.";
  return result;
}

// Helper to extract caption from Instagram JSON structure
function extractCaptionFromInstagramJSON(data: any): string | null {
  try {
    // Try different possible paths in Instagram's data structure
    const paths = [
      // Common structure in embedded JSON
      ['require', 0, 3, 0, '__bbox', 'require', 0, 3, 1, '__bbox', 'result', 'data', 'xdt_api__v1__media__shortcode__web_info', 'items', 0, 'caption', 'text'],
      ['require', 0, 3, 0, '__bbox', 'result', 'data', 'xdt_shortcode_media', 'edge_media_to_caption', 'edges', 0, 'node', 'text'],
      // _sharedData structure
      ['entry_data', 'PostPage', 0, 'graphql', 'shortcode_media', 'edge_media_to_caption', 'edges', 0, 'node', 'text'],
      ['entry_data', 'PostPage', 0, 'media', 'edge_media_to_caption', 'edges', 0, 'node', 'text'],
      // Simpler paths
      ['graphql', 'shortcode_media', 'edge_media_to_caption', 'edges', 0, 'node', 'text'],
      ['data', 'shortcode_media', 'edge_media_to_caption', 'edges', 0, 'node', 'text'],
    ];
    
    for (const path of paths) {
      let current = data;
      let found = true;
      
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          found = false;
          break;
        }
      }
      
      if (found && typeof current === 'string' && current.length > 0) {
        console.log("Found caption via path:", path.join(' > '));
        return current;
      }
    }
    
    // If structured paths don't work, try searching recursively
    const caption = searchForCaption(data);
    if (caption) {
      console.log("Found caption via recursive search");
      return caption;
    }
    
  } catch (e) {
    console.log("Error extracting caption:", e);
  }
  
  return null;
}

// Recursive search for caption in Instagram data
function searchForCaption(obj: any, depth: number = 0): string | null {
  // Limit recursion depth for performance
  if (depth > 10 || !obj || typeof obj !== 'object') return null;
  
  // Look for caption indicators
  if (obj.caption && typeof obj.caption === 'string' && obj.caption.length > 20) {
    return obj.caption;
  }
  
  if (obj.text && typeof obj.text === 'string' && obj.text.length > 50) {
    // Make sure it's not just a username or short text
    if (obj.text.split(' ').length > 5) {
      return obj.text;
    }
  }
  
  if (obj.edge_media_to_caption) {
    const edges = obj.edge_media_to_caption.edges;
    if (Array.isArray(edges) && edges.length > 0 && edges[0].node && edges[0].node.text) {
      return edges[0].node.text;
    }
  }
  
  // Recursively search in objects and arrays
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = searchForCaption(obj[key], depth + 1);
      if (result) return result;
    }
  }
  
  return null;
}

// Helper to extract image from Instagram JSON
function extractImageFromInstagramJSON(data: any): string | null {
  try {
    const paths = [
      ['require', 0, 3, 0, '__bbox', 'require', 0, 3, 1, '__bbox', 'result', 'data', 'xdt_api__v1__media__shortcode__web_info', 'items', 0, 'image_versions2', 'candidates', 0, 'url'],
      ['require', 0, 3, 0, '__bbox', 'result', 'data', 'xdt_shortcode_media', 'display_url'],
      ['entry_data', 'PostPage', 0, 'graphql', 'shortcode_media', 'display_url'],
      ['graphql', 'shortcode_media', 'display_url'],
      ['data', 'shortcode_media', 'display_url'],
    ];
    
    for (const path of paths) {
      let current = data;
      let found = true;
      
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          found = false;
          break;
        }
      }
      
      if (found && typeof current === 'string' && current.startsWith('http')) {
        return current;
      }
    }
  } catch (e) {
    console.log("Error extracting image:", e);
  }
  
  return null;
}

// Helper to use Instagram oEmbed API
async function extractInstagramViaOEmbed(url: string): Promise<any> {
  const result: any = {
    name: "",
    servings: null,
    cookingTime: null,
    cookingMethod: [],
    ingredients: [],
    instructions: [],
    source: url
  };
  
  try {
    // Instagram oEmbed endpoint
    const oembedUrl = `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=`;
    
    console.log("Trying Instagram oEmbed...");
    
    // Try without access token first (works for public posts)
    const oembedResponse = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
      }
    });
    
    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json();
      console.log("oEmbed response:", JSON.stringify(oembedData).substring(0, 500));
      
      // oEmbed gives us title which often includes the caption
      if (oembedData.title) {
        console.log("Found Instagram caption via oEmbed");
        const extracted = extractRecipeFromInstagramText(oembedData.title);
        
        // Set image if available
        if (oembedData.thumbnail_url) {
          extracted.image = oembedData.thumbnail_url;
        }
        
        return { ...result, ...extracted };
      }
    } else {
      console.log("oEmbed failed:", oembedResponse.status);
    }
    
  } catch (error) {
    console.log("oEmbed extraction failed:", error);
  }
  
  result.error = "Could not extract recipe from Instagram. Instagram requires authentication to access post content. Please:\n\n1. Open the Instagram post in your browser or app\n2. Copy the entire caption text\n3. Use the 'Paste Text' option in the Import Recipe section\n\nThis will allow us to extract the recipe details automatically.";
  return result;
}

// Helper to extract recipe from Instagram caption text
function extractRecipeFromInstagramText(text: string): any {
  const result: any = {
    name: "",
    servings: null,
    cookingTime: null,
    cookingMethod: [],
    ingredients: [],
    instructions: []
  };
  
  console.log("Extracting from Instagram text, length:", text.length);
  
  // Try to get recipe name from first line or title pattern
  const titlePatterns = [
    /^([A-Z][^.!?\n]{10,80}[^.!?\n])[\n.!]/,  // Capitalized sentence
    /Recipe:?\s*([^\n]{5,80})/i,
    /^(.{10,80})(?=\n)/  // First line if substantial
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.name = match[1].trim();
      console.log("Extracted name:", result.name);
      break;
    }
  }
  
  // Extract ingredients
  result.ingredients = extractIngredientsFromText(text);
  console.log("Extracted ingredients:", result.ingredients.length);
  
  // Extract instructions  
  result.instructions = extractInstructionsFromText(text);
  console.log("Extracted instructions:", result.instructions.length);
  
  // Try to find servings
  const servingsMatch = text.match(/(?:serves?|servings?|makes?):?\s*(\d+)/i);
  if (servingsMatch) {
    result.servings = parseInt(servingsMatch[1]);
    console.log("Extracted servings:", result.servings);
  }
  
  // Try to find cooking time
  const timeMatch = text.match(/(?:cook|prep|total)(?:\s+time)?:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
  if (timeMatch) {
    result.cookingTime = parseInt(timeMatch[1]);
    if (text.match(/hrs?|hours?/i)) {
      result.cookingTime *= 60; // Convert hours to minutes
    }
    console.log("Extracted cooking time:", result.cookingTime);
  }
  
  return result;
}

// Helper function to extract recipe from regular HTML
function extractRecipeFromHTML(html: string, url: string): any {
  const result: any = {
    name: "",
    servings: null,
    cookingTime: null,
    cookingMethod: [],
    ingredients: [],
    instructions: [],
    image: null,
    source: url
  };

  console.log("Starting recipe extraction from URL:", url);

  try {
    // Look for JSON-LD recipe schema (most common)
    // Try multiple regex patterns to catch different formats
    const patterns = [
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
      /<script type='application\/ld\+json'[^>]*>([\s\S]*?)<\/script>/gi,
    ];
    
    let matches: RegExpMatchArray[] = [];
    for (const pattern of patterns) {
      const found = Array.from(html.matchAll(pattern));
      if (found.length > 0) {
        matches = found;
        console.log(`Found ${found.length} JSON-LD script blocks`);
        break;
      }
    }
    
    if (matches.length === 0) {
      console.log("No JSON-LD script blocks found, trying HTML fallback");
    }
    
    let foundRecipe = false;
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      try {
        const jsonText = match[1].trim();
        const jsonData = JSON.parse(jsonText);
        
        // Handle both single recipe and graph with recipe
        let recipeData = null;
        
        // Check if @type is Recipe (handle string or array)
        const typeMatches = (type: any) => {
          if (typeof type === 'string') return type === 'Recipe';
          if (Array.isArray(type)) return type.includes('Recipe');
          return false;
        };
        
        if (typeMatches(jsonData['@type'])) {
          recipeData = jsonData;
        } else if (jsonData['@graph']) {
          recipeData = jsonData['@graph'].find((item: any) => typeMatches(item['@type']));
        } else if (Array.isArray(jsonData)) {
          recipeData = jsonData.find((item: any) => typeMatches(item['@type']));
        }

        if (recipeData) {
          console.log("✓ Found Recipe schema!");
          foundRecipe = true;
          
          result.name = recipeData.name || "";
          console.log("Extracted name:", result.name);
          
          result.servings = typeof recipeData.recipeYield === 'number' 
            ? recipeData.recipeYield 
            : parseServings(recipeData.recipeYield);
          console.log("Extracted servings:", result.servings);
          
          result.cookingTime = parseTimeToMinutes(recipeData.totalTime || recipeData.cookTime);
          console.log("Extracted cooking time:", result.cookingTime);
          
          result.cookingMethod = detectCookingMethod(recipeData);
          console.log("Detected cooking methods:", result.cookingMethod);
          
          result.ingredients = Array.isArray(recipeData.recipeIngredient) 
            ? recipeData.recipeIngredient 
            : [];
          console.log("Extracted ingredients count:", result.ingredients.length);
          
          result.instructions = parseInstructions(recipeData.recipeInstructions);
          console.log("Extracted instructions count:", result.instructions.length);
          
          // Extract image
          if (recipeData.image) {
            if (typeof recipeData.image === 'string') {
              result.image = recipeData.image;
            } else if (Array.isArray(recipeData.image) && recipeData.image.length > 0) {
              result.image = recipeData.image[0];
            } else if (recipeData.image.url) {
              result.image = recipeData.image.url;
            }
          }
          
          console.log("Extracted image URL:", result.image);
          return result;
        }
      } catch (e) {
        console.log("Error parsing JSON-LD block:", e);
        // Continue to next match
      }
    }

    if (!foundRecipe) {
      console.log("No Recipe schema found in any JSON-LD blocks");
    }

    // Fallback: Try to extract from HTML structure
    console.log("Trying HTML fallback extraction...");
    
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (titleMatch) {
      result.name = titleMatch[1].trim();
      console.log("Fallback: extracted title from H1:", result.name);
    }
    
    // Try to find Open Graph image as fallback
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (ogImageMatch) {
      result.image = ogImageMatch[1];
      console.log("Fallback: found OG image:", result.image);
    }
    
    // If we still have no data, log that extraction failed
    if (!result.name && result.ingredients.length === 0) {
      console.log("WARNING: Could not extract any recipe data from HTML");
      // Don't set an error - let the frontend handle empty results gracefully
      // The frontend will show appropriate UI for manual entry
    }

  } catch (error) {
    console.log("Error parsing HTML:", error);
  }

  return result;
}

// Helper function to parse instructions from various formats
function parseInstructions(instructions: any): string[] {
  if (!instructions) return [];
  
  if (Array.isArray(instructions)) {
    const result: string[] = [];
    
    for (const inst of instructions) {
      // Handle string instructions
      if (typeof inst === 'string') {
        result.push(inst);
      }
      // Handle HowToSection (recipes with sections like "For the sauce:")
      else if (inst['@type'] === 'HowToSection') {
        // Add the section name as a header
        if (inst.name) {
          result.push(inst.name);
        }
        
        // Process the steps within this section
        if (inst.itemListElement && Array.isArray(inst.itemListElement)) {
          for (const step of inst.itemListElement) {
            if (typeof step === 'string') {
              result.push(step);
            } else if (step.text) {
              result.push(step.text);
            } else if (step.name) {
              result.push(step.name);
            }
          }
        }
      }
      // Handle HowToStep
      else if (inst['@type'] === 'HowToStep') {
        if (inst.text) {
          result.push(inst.text);
        } else if (inst.name) {
          result.push(inst.name);
        }
      }
      // Handle generic objects with text or name
      else if (inst.text) {
        result.push(inst.text);
      } else if (inst.name) {
        result.push(inst.name);
      }
    }
    
    return result.filter((s: string) => s.length > 0);
  }
  
  if (typeof instructions === 'string') {
    // Split by newlines or numbered steps
    return instructions
      .split(/\n+|\d+\.|Step \d+/gi)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  return [];
}

// Helper function to parse time strings like "PT30M" or "30 minutes"
function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  
  // ISO 8601 duration format (PT30M, PT1H30M)
  const isoMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0');
    const minutes = parseInt(isoMatch[2] || '0');
    return hours * 60 + minutes;
  }
  
  // Plain number
  const numMatch = timeStr.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  
  return null;
}

// Helper to parse servings
function parseServings(servings: any): number | null {
  if (typeof servings === 'number') return servings;
  if (typeof servings === 'string') {
    const match = servings.match(/(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return null;
}

// Helper to detect cooking method from recipe content
function detectCookingMethod(recipe: any): string[] {
  const methods: string[] = [];
  const text = JSON.stringify(recipe).toLowerCase();
  
  if (text.includes('oven') || text.includes('bake') || text.includes('roast')) methods.push('oven');
  if (text.includes('stovetop') || text.includes('pan') || text.includes('sauté')) methods.push('stovetop');
  if (text.includes('grill')) methods.push('grill');
  if (text.includes('slow cooker') || text.includes('crockpot')) methods.push('slow cooker');
  if (text.includes('instant pot') || text.includes('pressure cooker')) methods.push('instant pot');
  if (text.includes('air fryer')) methods.push('air fryer');
  if (text.includes('microwave')) methods.push('microwave');
  
  return methods;
}

// Helper to extract recipe name from text
function extractRecipeNameFromText(text: string): string {
  const lines = text.split('\n').filter(l => l.trim());
  // First non-empty line is often the title
  if (lines.length > 0) {
    return lines[0].trim().substring(0, 100);
  }
  return "";
}

// Helper to extract ingredients from text
function extractIngredientsFromText(text: string): string[] {
  // Normalize line breaks and limit to first 2000 lines for performance
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = normalizedText.split('\n');
  const lines = allLines.slice(0, 2000); // Limit processing
  const ingredients: string[] = [];
  
  let inIngredientsSection = false;
  let foundIngredientsHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    if (!trimmed) continue;
    
    // Check for ingredient section header
    if (/^ingredients?:?$/i.test(trimmed) || /^🥘.*ingredients/i.test(trimmed)) {
      inIngredientsSection = true;
      foundIngredientsHeader = true;
      continue;
    }
    
    // Check for other section headers (end ingredients section)
    if (/^(?:instructions?|directions?|steps?|method|preparation|how to make):?$/i.test(trimmed) || 
        /^📝.*(?:instructions?|directions?|steps?)/i.test(trimmed)) {
      if (inIngredientsSection) break;
      continue;
    }
    
    // If we're in ingredients section, capture lines
    if (inIngredientsSection && trimmed) {
      let cleaned = trimmed
        .replace(/^[-•*▪️▫️◦‣⁃⦾⦿✓✔️☑️]+\s*/, '') // Remove bullet points but NOT numbers
        .replace(/^\d+[.)\]]\s*/, '') // Remove numbered list markers (e.g., "1. " or "1) ")
        .replace(/^[🔸🔹⭐️⚫️⚪️🔺🔻]\s*/g, '') // Remove emoji bullets
        .trim();
      
      const isHeader = /^(?:ingredients?|instructions?|directions?|steps?|method|preparation|notes?|tips?):?$/i.test(cleaned);
      
      if (!isHeader && cleaned.length > 2) {
        ingredients.push(cleaned);
        
        // Stop after finding 50 ingredients for performance
        if (ingredients.length >= 50) break;
      }
    }
  }
  
  // If we didn't find ingredients via explicit section, try quick pattern matching
  if (ingredients.length === 0 && !foundIngredientsHeader) {
    for (let i = 0; i < Math.min(lines.length, 500); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      
      if (/^(?:instructions?|directions?|steps?|method|preparation):?$/i.test(trimmed)) break;
      
      // Simplified ingredient detection
      const hasQuantity = /\d+\s*(?:cup|tbsp|tsp|oz|lb|g|kg|ml|l|bunch|clove|can|package)/i.test(trimmed);
      const startsWithBullet = /^[-•*▪️▫️◦‣⁃⦾⦿✓✔️☑️🔸🔹]/.test(trimmed);
      const startsWithNumber = /^\d+[.)\]]\s/.test(trimmed);
      
      if ((hasQuantity || startsWithBullet || startsWithNumber) && trimmed.length > 3 && trimmed.length < 200) {
        // Remove bullets and list markers but preserve numbers in ingredient amounts
        let cleaned = trimmed
          .replace(/^[-•*▪️▫️◦‣⁃⦾⦿✓✔️☑️🔸🔹]+\s*/, '') // Remove bullet points
          .replace(/^\d+[.)\]]\s*/, '') // Remove numbered list markers (e.g., "1. " or "1) ")
          .trim();
        ingredients.push(cleaned);
        
        if (ingredients.length >= 50) break;
      }
    }
  }
  
  return ingredients;
}

// Helper to extract instructions from text
function extractInstructionsFromText(text: string): string[] {
  // Normalize and limit lines for performance
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const allLines = normalizedText.split('\n');
  const lines = allLines.slice(0, 2000); // Limit processing
  const instructions: string[] = [];
  
  let inInstructionsSection = false;
  let foundInstructionsHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    if (!trimmed) continue;
    
    // Check for instructions section header
    if (/^instructions?:?$/i.test(trimmed) || /^📝.*instructions?/i.test(trimmed)) {
      inInstructionsSection = true;
      foundInstructionsHeader = true;
      continue;
    }
    
    // If we hit another major section, stop
    if (inInstructionsSection && /^(?:ingredients?|notes?|nutrition):?$/i.test(trimmed)) {
      break;
    }
    
    // Capture instruction lines (including subsection headers like "For the sauce:")
    if (inInstructionsSection && trimmed.length > 5) {
      // Check if this is a subsection header (e.g., "For the sauce:", "For the chicken:")
      const isSubsectionHeader = /^(?:for the|to make|to prepare|the|make the|prepare the)\s+[^:]{3,40}:$/i.test(trimmed);
      
      if (isSubsectionHeader) {
        // Include the subsection header as an instruction
        instructions.push(trimmed);
      } else {
        // Regular instruction - clean and add
        let cleaned = trimmed.replace(/^[-•*\d\.)]+\s*/, '').trim();
        
        if (cleaned.length > 5) {
          instructions.push(cleaned);
        }
      }
      
      // Stop after 50 instructions for performance
      if (instructions.length >= 50) break;
    }
  }
  
  // Quick pattern matching if no section found
  if (instructions.length === 0 && !foundInstructionsHeader) {
    let afterIngredients = false;
    
    for (let i = 0; i < Math.min(lines.length, 500); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      
      if (/^ingredients?:?$/i.test(trimmed)) {
        afterIngredients = true;
        continue;
      }
      
      // Simple detection: starts with number or bullet, or has action verb
      const startsWithNumber = /^\d+[\.)\]]\s/.test(trimmed);
      const hasActionVerb = /^(heat|cook|bake|mix|stir|add|pour)/i.test(trimmed);
      
      if (trimmed.length > 10 && trimmed.length < 500 && (startsWithNumber || (hasActionVerb && afterIngredients))) {
        let cleaned = trimmed.replace(/^[-•*\d\.)]+\s*/, '').trim();
        
        if (cleaned.length > 10) {
          instructions.push(cleaned);
          
          if (instructions.length >= 50) break;
        }
      }
    }
  }
  
  return instructions;
}

// Helper to check if error is a connection error
const isConnectionError = (error: any): boolean => {
  const errorStr = String(error.message || error || '').toLowerCase();
  return errorStr.includes('broken pipe') ||
         errorStr.includes('connection closed') ||
         errorStr.includes('message completed') ||
         errorStr.includes('epipe') ||
         error.name === 'Http';
};

// Handler that wraps the app
const handler = async (req: Request): Promise<Response> => {
  try {
    const response = await app.fetch(req);
    return response;
  } catch (error: any) {
    // Silently handle connection errors (client already gone)
    if (isConnectionError(error)) {
      return new Response(null, { status: 499 });
    }

    // Log unexpected errors only
    console.error('❌ Unexpected handler error:', error);

    try {
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch {
      // If we can't even create a response, return minimal one
      return new Response(null, { status: 500 });
    }
  }
};

// Wrap Deno.serve to catch runtime-level errors
Deno.serve({
  handler: async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error: any) {
      // Final safety net for connection errors
      if (isConnectionError(error)) {
        return new Response(null, { status: 499 });
      }
      console.error('❌ Uncaught server error:', error);
      return new Response(null, { status: 500 });
    }
  },
  onError: (error: Error): Response | Promise<Response> => {
    // Suppress logging for connection closed errors
    if (isConnectionError(error)) {
      // Silently return - don't log anything
      return new Response(null, { status: 499 });
    }

    // Only log unexpected errors
    console.error('❌ Server onError:', error);
    return new Response('Internal Server Error', { status: 500 });
  },
  onListen: () => {
    console.log('🚀 Server started successfully');
  }
});