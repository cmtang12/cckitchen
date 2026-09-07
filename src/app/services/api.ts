import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Recipe, MealPlan } from '../types';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9a4224b7`;

// Increased timeout for extraction endpoints
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const EXTRACTION_TIMEOUT = 45000; // 45 seconds for extraction (OCR can take time)

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_PREFIX = 'cck_cache_';

// In-memory layer (fastest, cleared on mutation)
const memCache = new Map<string, unknown>();

function readCache(endpoint: string): unknown | null {
  if (memCache.has(endpoint)) return memCache.get(endpoint);
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + endpoint);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + endpoint); return null; }
    memCache.set(endpoint, data);
    return data;
  } catch { return null; }
}

function writeCache(endpoint: string, data: unknown) {
  memCache.set(endpoint, data);
  try { localStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

// Only the resource that was actually mutated needs its cache cleared, e.g.
// "/recipes/abc" -> "/recipes". Scoping this means editing a meal plan doesn't
// force the (much larger, image-heavy) recipes list to refetch on next visit.
function getResourcePrefix(endpoint: string): string {
  const [, resource] = endpoint.split('/');
  return resource ? `/${resource}` : endpoint;
}

function invalidateCache(resourcePrefix: string) {
  for (const key of Array.from(memCache.keys())) {
    if (key.startsWith(resourcePrefix)) memCache.delete(key);
  }
  Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX + resourcePrefix))
    .forEach(k => localStorage.removeItem(k));
}

async function fetchAPI(endpoint: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT) {
  const isGet = !options.method || options.method === 'GET';

  if (isGet) {
    const cached = readCache(endpoint);
    if (cached !== null) return cached;
  }
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API] Error response (${endpoint}):`, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    // Avoid logging full response bodies: recipe payloads embed base64 images
    // and can be several MB, which makes devtools formatting genuinely slow.
    if (isGet) writeCache(endpoint, result);
    else invalidateCache(getResourcePrefix(endpoint));
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error(`[API] Timeout (${endpoint}): Request took longer than ${timeoutMs}ms`);
      throw new Error('Request timed out. Please try again.');
    }

    console.error(`[API] Error (${endpoint}):`, error);
    throw error;
  }
}

// Recipe API
export const recipeAPI = {
  async getAll(): Promise<Recipe[]> {
    const data = await fetchAPI('/recipes');
    return data.recipes || [];
  },

  async getById(id: string): Promise<Recipe> {
    const data = await fetchAPI(`/recipes/${id}`);
    return data.recipe;
  },

  async create(recipe: Omit<Recipe, 'id' | 'dateAdded'>): Promise<Recipe> {
    console.log('[API] Creating recipe:', recipe);
    console.log('[API] Stringified recipe:', JSON.stringify(recipe));
    const data = await fetchAPI('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
    console.log('[API] Recipe created successfully:', data);
    return data.recipe;
  },

  async update(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const data = await fetchAPI(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.recipe;
  },

  async delete(id: string): Promise<void> {
    await fetchAPI(`/recipes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Meal Plan API
export const mealPlanAPI = {
  async getAll(): Promise<MealPlan[]> {
    const data = await fetchAPI('/meal-plans');
    return data.mealPlans || [];
  },

  async getById(id: string): Promise<MealPlan> {
    const data = await fetchAPI(`/meal-plans/${id}`);
    return data.mealPlan;
  },

  async create(plan: Omit<MealPlan, 'id' | 'dateCreated'>): Promise<MealPlan> {
    const data = await fetchAPI('/meal-plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
    return data.mealPlan;
  },

  async update(id: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    const data = await fetchAPI(`/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.mealPlan;
  },

  async delete(id: string): Promise<void> {
    await fetchAPI(`/meal-plans/${id}`, {
      method: 'DELETE',
    });
  },
};

// Recipe Extraction API
export const extractionAPI = {
  async extractFromURL(url: string): Promise<{
    name: string;
    servings: number | null;
    cookingTime: number | null;
    cookingMethod: string[];
    ingredients: string[];
    instructions: string[];
    image?: string;
    source: string;
    error?: string;
  }> {
    const data = await fetchAPI('/extract-from-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }, EXTRACTION_TIMEOUT);
    return data;
  },

  async parseRecipeText(text: string, sourceUrl?: string): Promise<{
    name: string;
    servings: number | null;
    cookingTime: number | null;
    cookingMethod: string[];
    ingredients: string[];
    instructions: string[];
    source: string;
  }> {
    const data = await fetchAPI('/parse-recipe-text', {
      method: 'POST',
      body: JSON.stringify({ text, sourceUrl }),
    }, EXTRACTION_TIMEOUT);
    return data;
  },
};