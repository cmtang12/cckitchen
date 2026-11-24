import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Recipe, MealPlan } from '../types';
import { normalizeRecipe } from '../utils/recipeOptions';
import { idbGet, idbSet, idbDeletePrefix } from './persistentCache';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9a4224b7`;

// Increased timeout for extraction endpoints
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const EXTRACTION_TIMEOUT = 45000; // 45 seconds for extraction (OCR can take time)

// How caching works:
// - Responses are kept in memory and in IndexedDB (localStorage was too small for
//   the recipe list with its photos, so it was never actually cached).
// - A saved copy is shown straight away. If it's more than a couple of minutes old,
//   a fresh copy is fetched in the background and pages listening for it update.
// - Saving, adding or deleting updates the saved copy directly instead of throwing
//   it away, so the next screen doesn't have to download everything again.
const FRESH_FOR = 2 * 60 * 1000; // 2 minutes: no background refresh
const KEEP_FOR = 30 * 24 * 60 * 60 * 1000; // 30 days: older copies are ignored

interface Entry { data: any; ts: number }
const memCache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<any>>();
const listeners = new Map<string, Set<(data: any) => void>>();

// Clear the old localStorage cache from before (it could never hold the recipe list).
try {
  Object.keys(localStorage).filter(k => k.startsWith('cck_cache_')).forEach(k => localStorage.removeItem(k));
} catch {}

async function readCache(endpoint: string): Promise<Entry | null> {
  const mem = memCache.get(endpoint);
  if (mem) return mem;
  const stored = await idbGet<any>(endpoint);
  if (!stored || Date.now() - stored.ts > KEEP_FOR) return null;
  memCache.set(endpoint, stored);
  return stored;
}

function writeCache(endpoint: string, data: any) {
  const entry = { data, ts: Date.now() };
  memCache.set(endpoint, entry);
  void idbSet(endpoint, entry);
}

/** Change a saved copy in place (after a save), keeping its age. */
async function patchCache(endpoint: string, change: (data: any) => any) {
  const entry = await readCache(endpoint);
  if (!entry) return;
  const next = { data: change(entry.data), ts: entry.ts };
  memCache.set(endpoint, next);
  void idbSet(endpoint, next);
}

function dropCache(endpoint: string) {
  memCache.delete(endpoint);
  void idbDeletePrefix(endpoint);
}

/** Get told when a background refresh brings newer data for an endpoint. */
export function onFreshData(endpoint: string, cb: (data: any) => void): () => void {
  if (!listeners.has(endpoint)) listeners.set(endpoint, new Set());
  listeners.get(endpoint)!.add(cb);
  return () => listeners.get(endpoint)?.delete(cb);
}

function refreshInBackground(endpoint: string) {
  if (inFlight.has(endpoint)) return;
  const p = networkGet(endpoint)
    .then((data) => listeners.get(endpoint)?.forEach((cb) => cb(data)))
    .catch(() => {})
    .finally(() => inFlight.delete(endpoint));
  inFlight.set(endpoint, p);
}

async function networkGet(endpoint: string) {
  const existing = inFlight.get(endpoint + '#net');
  if (existing) return existing;
  const p = request(endpoint, {}, DEFAULT_TIMEOUT).then((data) => {
    writeCache(endpoint, data);
    return data;
  }).finally(() => inFlight.delete(endpoint + '#net'));
  inFlight.set(endpoint + '#net', p);
  return p;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT) {
  const isGet = !options.method || options.method === 'GET';
  if (!isGet) return request(endpoint, options, timeoutMs);

  const cached = await readCache(endpoint);
  if (cached) {
    if (Date.now() - cached.ts > FRESH_FOR) refreshInBackground(endpoint);
    return cached.data;
  }
  return networkGet(endpoint);
}

async function request(endpoint: string, options: RequestInit, timeoutMs: number) {
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

    // Don't log response bodies: recipe payloads embed base64 images and can be many MB.
    return await response.json();
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
    return (data.recipes || []).map(normalizeRecipe);
  },

  async getById(id: string): Promise<Recipe> {
    // Opening a recipe from the list: use the copy we already have instead of downloading it again.
    if (!memCache.has(`/recipes/${id}`)) {
      const list = await readCache('/recipes');
      const fromList = list?.data?.recipes?.find((r: Recipe) => r.id === id);
      if (fromList) return normalizeRecipe(fromList);
    }
    const data = await fetchAPI(`/recipes/${id}`);
    return data.recipe ? normalizeRecipe(data.recipe) : data.recipe;
  },

  async create(recipe: Omit<Recipe, 'id' | 'dateAdded'>): Promise<Recipe> {
    const data = await fetchAPI('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
    if (data.recipe) {
      await patchCache('/recipes', (d) => ({ ...d, recipes: [...(d.recipes || []), data.recipe] }));
    } else {
      dropCache('/recipes');
    }
    return data.recipe;
  },

  async update(id: string, updates: Partial<Recipe>): Promise<Recipe> {
    const data = await fetchAPI(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const saved = data.recipe;
    await patchCache('/recipes', (d) => ({
      ...d,
      recipes: (d.recipes || []).map((r: Recipe) => (r.id === id ? { ...r, ...updates, ...(saved || {}) } : r)),
    }));
    if (saved) writeCache(`/recipes/${id}`, { recipe: saved });
    else dropCache(`/recipes/${id}`);
    return saved;
  },

  async delete(id: string): Promise<void> {
    await fetchAPI(`/recipes/${id}`, {
      method: 'DELETE',
    });
    await patchCache('/recipes', (d) => ({ ...d, recipes: (d.recipes || []).filter((r: Recipe) => r.id !== id) }));
    dropCache(`/recipes/${id}`);
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
    if (data.mealPlan) {
      await patchCache('/meal-plans', (d) => ({ ...d, mealPlans: [...(d.mealPlans || []), data.mealPlan] }));
    } else {
      dropCache('/meal-plans');
    }
    return data.mealPlan;
  },

  async update(id: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    const data = await fetchAPI(`/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const saved = data.mealPlan;
    await patchCache('/meal-plans', (d) => ({
      ...d,
      mealPlans: (d.mealPlans || []).map((p: MealPlan) => (p.id === id ? { ...p, ...updates, ...(saved || {}) } : p)),
    }));
    if (saved) writeCache(`/meal-plans/${id}`, { mealPlan: saved });
    else dropCache(`/meal-plans/${id}`);
    return saved;
  },

  async delete(id: string): Promise<void> {
    await fetchAPI(`/meal-plans/${id}`, {
      method: 'DELETE',
    });
    await patchCache('/meal-plans', (d) => ({ ...d, mealPlans: (d.mealPlans || []).filter((p: MealPlan) => p.id !== id) }));
    dropCache(`/meal-plans/${id}`);
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