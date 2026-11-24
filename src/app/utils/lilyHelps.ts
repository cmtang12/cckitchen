// "Lily helps": which recipe steps Lily can do, based on the skills she has.
//
// Skills are set once (Lily's skills) and every recipe updates from them. Steps are
// read for simple words (wash, peel, tear…) and matched to her skills. Anything with
// heat or a sharp knife on hard food is a grown-up step. Any step can be corrected
// with one tap; that choice is saved on the recipe as `lilySteps`.

import type { Recipe } from "../types";

export type LilySkill =
  | "wash"
  | "peel"
  | "tear"
  | "knife-soft"
  | "measure"
  | "timer"
  | "mix"
  | "pour"
  | "crack-eggs"
  | "sprinkle"
  | "poke"
  | "mash"
  | "squeeze"
  | "spread"
  | "roll"
  | "arrange"
  | "snap"
  | "brush";

export interface SkillInfo {
  id: LilySkill;
  label: string; // in a list of skills
  doing: string; // in a sentence: "Lily helps with washing"
  example: string;
}

export const LILY_SKILLS: SkillInfo[] = [
  { id: "wash", label: "Washing and scrubbing", doing: "washing", example: "Rinsing rice and produce, scrubbing sweet potatoes" },
  { id: "peel", label: "Peeling", doing: "peeling", example: "With a peeler or by hand" },
  { id: "poke", label: "Poking with a fork", doing: "poking with a fork", example: "Sweet potatoes and potatoes before baking" },
  { id: "measure", label: "Measuring", doing: "measuring", example: "Rice, water, flour: scooping and leveling" },
  { id: "tear", label: "Tearing herbs and greens", doing: "tearing herbs", example: "Basil, cilantro, lettuce, kale" },
  { id: "knife-soft", label: "Knife: soft foods", doing: "cutting soft foods", example: "Banana, cucumber, mushrooms, tofu" },
  { id: "timer", label: "Setting the timer", doing: "the timer", example: "Pressing start when it's time" },
  { id: "mix", label: "Mixing and stirring", doing: "mixing", example: "In a bowl, away from the stove" },
  { id: "pour", label: "Pouring", doing: "pouring", example: "Cold things into a bowl" },
  { id: "crack-eggs", label: "Cracking eggs", doing: "cracking eggs", example: "Into a separate small bowl" },
  { id: "sprinkle", label: "Sprinkling and topping", doing: "sprinkling", example: "Cheese, herbs, garnish" },
  { id: "mash", label: "Mashing", doing: "mashing", example: "Avocado, banana, cooked potatoes" },
  { id: "squeeze", label: "Squeezing citrus", doing: "squeezing", example: "Lemons and limes over a bowl" },
  { id: "spread", label: "Spreading", doing: "spreading", example: "Butter, sauce, nut butter with a dull knife" },
  { id: "roll", label: "Rolling and shaping", doing: "rolling and shaping", example: "Dough, meatballs, cookie balls" },
  { id: "arrange", label: "Arranging on a tray", doing: "arranging", example: "Laying things out on a cold pan or plate" },
  { id: "snap", label: "Snapping and shelling", doing: "snapping beans", example: "Green beans, peas, stripping kale" },
  { id: "brush", label: "Brushing on sauce or oil", doing: "brushing", example: "With a pastry brush, before it goes in" },
];

export const DEFAULT_SKILLS: LilySkill[] = ["wash", "peel", "poke", "measure", "tear", "knife-soft", "timer"];

const STORAGE_KEY = "cck_lily_skills";

export function loadLilySkills(): LilySkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SKILLS;
}

export function saveLilySkills(skills: LilySkill[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {}
}

// --- Reading a step ---------------------------------------------------------

// "baking sheet", "baking soda" etc. are things, not heat.
const HEAT = /\b(heat|heated|stove|stovetop|skillet|frying pan|saut[eé]|sear|fry|fried|frying|boil|boiling|simmer|broil|grill|oven|bake|baking(?! (sheet|dish|pan|tray|powder|soda|paper|mat))|roast|preheat|hot oil|deep|blender|food processor|mandoline|pressure|instant pot)\b/i;
const SOFT_FOODS = /\b(banana|cucumber|mushroom|strawberr|tomato|avocado|zucchini|tofu|butter|cheese|bread|kiwi|mango|peach|melon|watermelon|pear|scallion|green onion|basil|cilantro|parsley|mint|lettuce|cooked|hard[- ]boiled|egg|olive|grape|berr|cake|pancake|tortilla)/i;
const HARD_FOODS = /\b(carrot|onion|potato|sweet potato|squash|pumpkin|celery|apple|beet|ginger|garlic|chicken|beef|pork|lamb|steak|fish|salmon|shrimp|meat|bone|cabbage|cauliflower|broccoli|corn)\b/i;

const RULES: Array<{ skill: LilySkill; test: (s: string) => boolean; withHeat: boolean }> = [
  { skill: "wash", test: (s) => /\b(wash|rinse|scrub)/i.test(s), withHeat: true },
  { skill: "poke", test: (s) => /\b(poke|prick|pierce)/i.test(s), withHeat: true },
  { skill: "peel", test: (s) => /\bpeel/i.test(s), withHeat: true },
  { skill: "tear", test: (s) => /\b(tear|torn|pick the leaves|pluck)\b/i.test(s), withHeat: true },
  {
    skill: "knife-soft",
    test: (s) => /\b(slice|chop|dice|cut|halve|cube)\b/i.test(s) && SOFT_FOODS.test(s) && !HARD_FOODS.test(s),
    withHeat: false,
  },
  {
    skill: "measure",
    test: (s) =>
      /\bmeasure\b/i.test(s) ||
      /\b(combine|add|place|put|whisk together|mix together)\b.*\b(in|into|to) (a |the )?(large |medium |small |mixing )?bowl\b/i.test(s) ||
      /\b(in|into) (a |the )?(large |medium |small |mixing )?bowl\b.*\b(combine|add|whisk|mix|stir together)\b/i.test(s) ||
      /\b(add|put|place|combine|measure)\b[^.]*\b(\d+(\/\d+)?|one|two|half)\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp)\b[^.]*\b(rice cooker|bowl|measuring cup|jar)\b/i.test(s),
    withHeat: false,
  },
  { skill: "mix", test: (s) => /\b(stir|whisk|mix|toss|combine|fold)\b/i.test(s), withHeat: false },
  { skill: "pour", test: (s) => /\bpour\b/i.test(s), withHeat: false },
  { skill: "crack-eggs", test: (s) => /\bcrack\b.*\beggs?\b|\beggs?\b.*\bcrack/i.test(s), withHeat: false },
  { skill: "sprinkle", test: (s) => /\b(sprinkle|garnish|top with|scatter)\b/i.test(s), withHeat: false },
  { skill: "mash", test: (s) => /\bmash/i.test(s), withHeat: false },
  { skill: "squeeze", test: (s) => /\bsqueeze|\bjuice (of )?(a |the |half )/i.test(s), withHeat: false },
  { skill: "spread", test: (s) => /\bspread\b(?! out)/i.test(s), withHeat: false },
  { skill: "roll", test: (s) => /\bknead\b|\b(roll|shape|form)\b[^.]*\b(balls?|meatballs?|dough|logs?|patties|patty)\b/i.test(s), withHeat: false },
  {
    skill: "arrange",
    test: (s) => !/\bhot\b/i.test(s) && /\b(arrange|lay|place|spread out)\b[^.]*\b(on|onto) (a |the )?(lined |prepared )?(baking sheet|sheet pan|tray|platter|plate|board)\b/i.test(s),
    withHeat: true,
  },
  { skill: "snap", test: (s) => /\b(snap|shell|trim the ends)\b[^.]*\b(beans?|peas?)\b|\bstrip (the )?(leaves|kale)/i.test(s), withHeat: false },
  { skill: "brush", test: (s) => !/\bhot\b/i.test(s) && /\bbrush/i.test(s), withHeat: true },
];

const DURATION = /(\d+)\s*(?:-|to|–)?\s*(\d+)?\s*(minutes?|mins?|hours?|hrs?)\b/i;

export interface StepHelp {
  /** Skills from Lily's list that this step uses. */
  skills: LilySkill[];
  /** Step uses heat or a sharp tool: a grown-up does that part. */
  grownUp: boolean;
  /** Minutes for a timer Lily can start, if the step names a time. */
  timerMinutes?: number;
  /** Lily has something to do in this step. */
  forLily: boolean;
  /** You corrected this step with "Lily can do this" / "Not for Lily". */
  corrected?: boolean;
}

export function readStep(step: string, skills: LilySkill[], override?: boolean): StepHelp {
  const grownUp = HEAT.test(step);
  const matched = RULES.filter((r) => skills.includes(r.skill) && (r.withHeat || !grownUp) && r.test(step)).map(
    (r) => r.skill
  );
  let timerMinutes: number | undefined;
  const d = step.match(DURATION);
  if (d && skills.includes("timer")) {
    const n = Number(d[2] || d[1]);
    timerMinutes = /hour|hr/i.test(d[3]) ? n * 60 : n;
    if (!matched.includes("timer")) matched.push("timer");
  }
  const auto = matched.length > 0;
  const forLily = override === undefined ? auto : override;
  return { skills: forLily ? matched : [], grownUp, timerMinutes: forLily ? timerMinutes : undefined, forLily, corrected: override !== undefined };
}

export interface RecipeHelp {
  steps: StepHelp[];
  count: number;
  /** Plain list of what she'd do: "washing, peeling, the timer". */
  summary: string;
}

export function readRecipe(recipe: Pick<Recipe, "instructions" | "lilySteps">, skills: LilySkill[]): RecipeHelp {
  const steps = (recipe.instructions || []).map((s, i) => readStep(s, skills, recipe.lilySteps?.[i]));
  const used = new Set<LilySkill>();
  steps.forEach((s) => s.skills.forEach((k) => used.add(k)));
  const summary = LILY_SKILLS.filter((k) => used.has(k.id)).map((k) => k.doing).join(", ");
  return { steps, count: steps.filter((s) => s.forLily).length, summary };
}

export function skillLabel(id: LilySkill): string {
  return LILY_SKILLS.find((s) => s.id === id)?.doing ?? id;
}

/** Minutes named in a step ("Bake for 20-25 minutes" -> 25), for a timer anyone can start. */
export function stepMinutes(step: string): number | undefined {
  const d = step.match(DURATION);
  if (!d) return undefined;
  const n = Number(d[2] || d[1]);
  return /hour|hr/i.test(d[3]) ? n * 60 : n;
}
