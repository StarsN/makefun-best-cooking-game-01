// orders.js — the order board: tickets arrive, count down, and are served
// or lost. A ticket knows its dish, its customer and how long it has left;
// the board decides when new tickets appear and which ticket a plate matches.

import {
  recipesForLevel,
  maxOrdersForLevel,
  orderSecondsForLevel,
  spawnGapForLevel,
  pickRandom,
  recipeById,
} from './config.js';

let nextOrderId = 1;

// A few regulars, so tickets feel like people rather than timers.
const CUSTOMERS = [
  { name: 'Mara', colour: '#e07a5f', skin: '#f2c89b' },
  { name: 'Theo', colour: '#3d8bfd', skin: '#c98d5f' },
  { name: 'June', colour: '#7dc242', skin: '#f7d7b0' },
  { name: 'Omar', colour: '#9b5de5', skin: '#8a5a33' },
  { name: 'Lena', colour: '#f15bb5', skin: '#f2c89b' },
  { name: 'Kai', colour: '#00bbf9', skin: '#e8b06a' },
  { name: 'Rosa', colour: '#ef476f', skin: '#c98d5f' },
  { name: 'Finn', colour: '#06d6a0', skin: '#f7d7b0' },
];

export class Order {
  constructor(recipe, level, randomFn = Math.random) {
    this.id = nextOrderId++;
    this.recipe = recipe;
    this.level = level;
    this.total = orderSecondsForLevel(level);
    this.left = this.total;
    this.customer = pickRandom(CUSTOMERS, randomFn);
    this.shakeUntil = 0;
    this.justServed = false;
  }

  tick(dt) {
    this.left -= dt;
  }

  get expired() {
    return this.left <= 0;
  }

  get urgency() {
    return 1 - Math.max(0, this.left) / this.total;
  }

  // The ticket is in its last ten seconds: flash it so the player notices.
  get isUrgent() {
    return this.left <= 10;
  }

  shake(now) {
    this.shakeUntil = now + 0.35;
  }

  get shaking() {
    return performance.now() / 1000 < this.shakeUntil;
  }
}

export class OrderBoard {
  constructor() {
    this.orders = [];
    this.spawnIn = 2.5;
    this.randomFn = Math.random;
  }

  reset() {
    this.orders = [];
    this.spawnIn = 2.5;
  }

  // Advance every clock: count tickets down, drop expired ones, and spawn
  // new ones while the board has room. Returns the orders that just expired.
  tick(dt, level) {
    const expired = [];
    for (const order of this.orders) order.tick(dt);
    this.orders = this.orders.filter((order) => {
      if (order.expired) {
        expired.push(order);
        return false;
      }
      return true;
    });
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.orders.length < maxOrdersForLevel(level)) {
      this.spawnOrder(level);
      this.spawnIn = spawnGapForLevel(level);
    }
    return expired;
  }

  spawnOrder(level) {
    const recipe = pickRandom(recipesForLevel(level), this.randomFn);
    const order = new Order(recipe, level, this.randomFn);
    this.orders.push(order);
    return order;
  }

  // The oldest ticket whose dish exactly matches the plate's items, or null.
  // Items are compared as a multiset: two patties count twice.
  matchForPlate(plateItems) {
    const plateCounts = new Map();
    for (const item of plateItems) plateCounts.set(item, (plateCounts.get(item) ?? 0) + 1);
    for (const order of this.orders) {
      const need = new Map();
      for (const item of order.recipe.items) need.set(item, (need.get(item) ?? 0) + 1);
      if (need.size !== plateCounts.size) continue;
      let matches = true;
      for (const [item, count] of need) {
        if (plateCounts.get(item) !== count) {
          matches = false;
          break;
        }
      }
      if (matches) return order;
    }
    return null;
  }

  remove(order) {
    this.orders = this.orders.filter((o) => o !== order);
  }

  get count() {
    return this.orders.length;
  }
}

// Rebuild an order from a plain snapshot (used by the demo's saved state).
export function orderFromSnapshot(snapshot) {
  const recipe = recipeById(snapshot.recipeId);
  if (!recipe) return null;
  const order = new Order(recipe, snapshot.level);
  order.id = snapshot.id;
  order.left = snapshot.left;
  order.total = snapshot.total;
  return order;
}
