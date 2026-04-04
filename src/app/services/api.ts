import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Recipe, MealPlan } from '../types';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9a4224b7`;

// Increased timeout for extraction endpoints
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const EXTRACTION_TIMEOUT = 45000; // 45 seconds for extraction (OCR can take time)

// In-memory cache for GET requests — cleared on any mutation
const cache = new Map<string, unknown>();

function invalidateCache() {
  cache.clear();
}

async function fetchAPI(endpoint: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT) {
  const isGet = !options.method || options.method === 'GET';

  if (isGet && cache.has(endpoint)) {
    return cache.get(endpoint);
  }
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  console.log(`[API] Making request to: ${url}`);
  console.log(`[API] Request options:`, { method: options.method || 'GET', headers });

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

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API] Error response:`, errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[API] Success response:`, result);
    if (isGet) cache.set(endpoint, result);
    else invalidateCache();
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