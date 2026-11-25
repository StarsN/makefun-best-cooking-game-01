// config.js — every tunable fact about Sizzle & Serve lives here:
// the canvas size, the ingredients, the recipes, the levels and the shift.
// Nothing in this file knows about drawing or input; the other modules
// read these tables and build the game from them.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;

// One full shift lasts three minutes of real time.
export const SHIFT_SECONDS = 180;

// How many raw items the chef can carry at once.
export const HAND_CAPACITY = 3;

// A patty left on the grill past this many seconds burns.
export const GRILL_BURN_SECONDS = 9;

// The chef's walking speed in logical pixels per second.
export const CHEF_SPEED = 520;

// ---------------------------------------------------------------- ingredients

// prep tells the kitchen what a raw ingredient needs before it can be plated:
//   'none'  — ready the moment it is picked up (bun, cheese)
//   'chop'  — must spend time on the chopping board
//   'grill' — must spend time on the grill
// prepSeconds is how long that work takes. Every ingredient also carries the
// flat colours its drawn shape uses, so the art stays in one place.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     prep: 'none',  prepSeconds: 0,   colour: '#e8b06a', dark: '#c98d45', key: '1' },
  { id: 'patty',   name: 'Patty',   prep: 'grill', prepSeconds: 4,   colour: '#8a5a33', dark: '#5f3a1e', key: '2' },
  { id: 'cheese',  name: 'Cheese',  prep: 'none',  prepSeconds: 0,   colour: '#ffc93c', dark: '#e0a51c', key: '3' },
  { id: 'lettuce', name: 'Lettuce', prep: 'chop',  prepSeconds: 2.5, colour: '#7dc242', dark: '#4e8f24', key: '4' },
  { id: 'tomato',  name: 'Tomato',  prep: 'chop',  prepSeconds: 2.5, colour: '#e84a3a', dark: '#b32a1e', key: '5' },
  { id: 'onion',   name: 'Onion',   prep: 'chop',  prepSeconds: 2,   colour: '#f2e9f5', dark: '#b9a3c9', key: '6' },
];

export function ingredientById(id) {
  return INGREDIENTS.find((ing) => ing.id === id) ?? null;
}

// A prepared item id is the ingredient id plus a suffix when it needed work:
// 'patty' becomes 'patty-cooked', 'lettuce' becomes 'lettuce-chopped'.
// Items that need no prep keep the plain ingredient id.
export function preparedIdOf(ingredientId) {
  const ing = ingredientById(ingredientId);
  if (!ing) return ingredientId;
  if (ing.prep === 'chop') return `${ingredientId}-chopped`;
  if (ing.prep === 'grill') return `${ingredientId}-cooked`;
  return ingredientId;
}

export function ingredientOfPreparedId(preparedId) {
  return INGREDIENTS.find((ing) => preparedIdOf(ing.id) === preparedId) ?? null;
}

// ---------------------------------------------------------------- recipes

// A recipe is a dish: the prepared items it needs, in any order, and the
// base points serving it earns. The plate must hold exactly these items.
export const RECIPES = [
  {
    id: 'sunny-burger',
    name: 'Sunny Burger',
    items: ['bun', 'patty-cooked', 'cheese'],
    basePoints: 100,
    colour: '#f4a259',
  },
  {
    id: 'garden-burger',
    name: 'Garden Burger',
    items: ['bun', 'patty-cooked', 'lettuce-chopped', 'tomato-chopped'],
    basePoints: 140,
    colour: '#7dc242',
  },
  {
    id: 'cheesy-melt',
    name: 'Cheesy Melt',
    items: ['bun', 'patty-cooked', 'cheese', 'onion-chopped'],
    basePoints: 130,
    colour: '#ffc93c',
  },
  {
    id: 'veggie-stack',
    name: 'Veggie Stack',
    items: ['bun', 'lettuce-chopped', 'tomato-chopped', 'onion-chopped'],
    basePoints: 120,
    colour: '#9ccc65',
  },
  {
    id: 'double-stack',
    name: 'Double Stack',
    items: ['bun', 'patty-cooked', 'patty-cooked', 'cheese'],
    basePoints: 170,
    colour: '#b5651d',
  },
  {
    id: 'sunrise-stack',
    name: 'Sunrise Stack',
    items: ['bun', 'patty-cooked', 'patty-cooked', 'cheese', 'tomato-chopped'],
    basePoints: 200,
    colour: '#e8734a',
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) ?? null;
}

// Recipes a level may order: early levels only serve the simple dishes,
// harder ones unlock as the shift goes on.
export function recipesForLevel(level) {
  if (level <= 1) return RECIPES.slice(0, 3);
  if (level === 2) return RECIPES.slice(0, 4);
  if (level === 3) return RECIPES.slice(0, 5);
  return RECIPES;
}

// ---------------------------------------------------------------- levels

// Every four served dishes the kitchen levels up: more orders at once,
// orders arrive faster and their timers get shorter.
export function levelForServed(servedCount) {
  return Math.min(6, 1 + Math.floor(servedCount / 4));
}

export function maxOrdersForLevel(level) {
  return Math.min(2 + (level - 1), 5);
}

export function orderSecondsForLevel(level) {
  return Math.max(42, 82 - (level - 1) * 7);
}

export function spawnGapForLevel(level) {
  return Math.max(6, 15 - (level - 1) * 1.6);
}

// ---------------------------------------------------------------- scoring

export function pointsForServe(recipe, timeLeft, timeTotal, combo) {
  const timeBonus = Math.round((timeLeft / timeTotal) * 50);
  const comboBonus = combo * 15;
  return recipe.basePoints + timeBonus + comboBonus;
}

export function coinsForPoints(points) {
  return Math.max(1, Math.round(points / 10));
}

// ---------------------------------------------------------------- helpers

// A tiny seeded random generator, used only by demo mode so its playthrough
// is the same every run. Real play uses Math.random.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function pickRandom(list, randomFn = Math.random) {
  return list[Math.floor(randomFn() * list.length)];
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest.toString().padStart(2, '0')}`;
}
