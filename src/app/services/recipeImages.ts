// Loads recipe photos one at a time, as they're needed, and keeps each one on the
// device so it never downloads twice. The recipe list itself comes without photos.

import { projectId, publicAnonKey } from '/utils/supabase/info';
import { idbGet, idbSet } from './persistentCache';
import type { Recipe } from '../types';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9a4224b7`;
const MAX_AT_ONCE = 4;
const TIMEOUT = 20000;

const mem = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();
const queue: Array<() => void> = [];
let active = 0;

/** Same fingerprint the server uses. */
export function imageVersionOf(image?: string): string | undefined {
  if (!image) return undefined;
  let h = 0;
  const tail = image.slice(-256);
  for (let i = 0; i < tail.length; i++) h = (h * 31 + tail.charCodeAt(i)) | 0;
  return `${image.length}-${(h >>> 0).toString(36)}`;
}

export function hasPhoto(recipe: Pick<Recipe, 'image' | 'hasImage'> | null | undefined): boolean {
  return !!(recipe && (recipe.image || recipe.hasImage));
}

const keyFor = (id: string, version?: string) => `img:${id}:${version || ''}`;

/** Remember a photo we already have (after saving a recipe), so it's never fetched. */
export function rememberImage(id: string, image: string | undefined) {
  if (!image) return;
  const k = keyFor(id, imageVersionOf(image));
  mem.set(k, image);
  void idbSet(k, { data: image, ts: Date.now() });
}

/** A photo already in memory, without waiting. */
export function peekImage(id: string, version?: string): string | null | undefined {
  return mem.get(keyFor(id, version));
}

function runQueued<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      task().then(resolve, reject).finally(() => {
        active--;
        queue.shift()?.();
      });
    };
    if (active < MAX_AT_ONCE) run();
    else queue.push(run);
  });
}

async function fetchJSON(path: string) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : null };
  } finally {
    clearTimeout(t);
  }
}

/** Get one recipe's photo: memory, then the device, then the server. */
export function loadRecipeImage(id: string, version?: string): Promise<string | null> {
  const k = keyFor(id, version);
  if (mem.has(k)) return Promise.resolve(mem.get(k)!);
  const existing = pending.get(k);
  if (existing) return existing;

  const p = (async () => {
    const stored = await idbGet<string>(k);
    if (stored?.data) {
      mem.set(k, stored.data);
      return stored.data;
    }
    return runQueued(async () => {
      let r = await fetchJSON(`/recipes/${id}/image`);
      let image: string | null = r.ok ? r.body?.image ?? null : null;
      // Older server without the photo endpoint: fall back to the whole recipe.
      if (!r.ok && r.status === 404) {
        r = await fetchJSON(`/recipes/${id}`);
        image = r.ok ? r.body?.recipe?.image ?? null : null;
      }
      if (!r.ok) throw new Error(`Photo failed to load (${r.status})`);
      mem.set(k, image);
      if (image) void idbSet(k, { data: image, ts: Date.now() });
      return image;
    });
  })().finally(() => pending.delete(k));

  pending.set(k, p);
  return p;
}
