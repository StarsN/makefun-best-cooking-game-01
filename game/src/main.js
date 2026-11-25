// main.js — Sizzle & Serve: the game loop, the state machine (title,
// playing, paused, over), the scoring, and the demo autopilot that plays
// the real game through the same actions the player uses. This module wires
// config, orders, kitchen, render, input and audio together.

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIFT_SECONDS,
  HAND_CAPACITY,
  INGREDIENTS,
  ingredientById,
  preparedIdOf,
  levelForServed,
  pointsForServe,
  coinsForPoints,
  seededRandom,
} from './config.js';
import { OrderBoard } from './orders.js';
import { Kitchen, stationFrontX } from './kitchen.js';
import { drawGame } from './render.js';
import { bindInput } from './input.js';
import { SoundBoard } from './audio.js';

const BEST_SCORE_KEY = 'sizzle-and-serve-best-score';

function loadBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Storage may be unavailable; the score still counts for this shift.
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBoard();
    this.kitchen = new Kitchen(this.sound);
    this.orderBoard = new OrderBoard();
    this.state = 'title';
    this.now = 0;
    this.lastFrame = 0;
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.lost = 0;
    this.level = 1;
    this.shiftTotal = SHIFT_SECONDS;
    this.shiftLeft = SHIFT_SECONDS;
    this.toasts = [];
    this.popups = [];
    this.muted = false;
    this.bestScore = loadBestScore();
    this.demo = false;
    this.demoTimer = 0;
    this.lastTickSecond = -1;

    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      this.demo = true;
      const seed = Number.parseInt(params.get('seed') ?? '42', 10);
      this.orderBoard.randomFn = seededRandom(Number.isFinite(seed) ? seed : 42);
      // demoServeDelay (seconds): how long the autopilot holds a finished
      // plate before serving it — 0 in normal play, a few seconds when the
      // screenshots need to catch a plate ready to serve.
      const delay = Number.parseFloat(params.get('serveDelay') ?? '0');
      this.demoServeDelay = Number.isFinite(delay) && delay > 0 ? delay : 0;
      this.demoServeReadyAt = null;
    }
  }

  // ------------------------------------------------------------ lifecycle

  start() {
    bindInput(this.canvas, this);
    this.lastFrame = performance.now();
    const loop = (timestamp) => {
      const dt = Math.min(0.05, Math.max(0, (timestamp - this.lastFrame) / 1000));
      this.lastFrame = timestamp;
      this.now = timestamp / 1000;
      this.update(dt);
      drawGame(this.ctx, this);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (this.demo) this.startGame();
  }

  resetShift() {
    this.kitchen.reset();
    this.orderBoard.reset();
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.served = 0;
    this.lost = 0;
    this.level = 1;
    this.shiftLeft = this.shiftTotal;
    this.toasts = [];
    this.popups = [];
    this.lastTickSecond = -1;
  }

  startGame() {
    this.resetShift();
    this.state = 'playing';
    this.addToast('Lunch rush! First orders are coming in…', '#ffc93c');
  }

  restart() {
    this.startGame();
  }

  endShift() {
    this.state = 'over';
    this.sound.stopSizzle();
    this.sound.gameOver();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      saveBestScore(this.score);
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.sound.stopSizzle();
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.sound.setMuted(this.muted);
  }

  // ------------------------------------------------------------ per-frame

  update(dt) {
    if (this.state !== 'playing') return;
    this.shiftLeft -= dt;
    if (this.shiftLeft <= 0) {
      this.shiftLeft = 0;
      this.endShift();
      return;
    }

    // A soft tick in the last ten seconds of the shift.
    const whole = Math.ceil(this.shiftLeft);
    if (this.shiftLeft <= 10 && whole !== this.lastTickSecond) {
      this.lastTickSecond = whole;
      this.sound.tick();
    }

    const expired = this.orderBoard.tick(dt, this.level);
    for (const order of expired) {
      this.lost++;
      this.combo = 0;
      this.score = Math.max(0, this.score - 25);
      this.addToast(`${order.customer.name} left — ${order.recipe.name} took too long (−25)`, '#ff9f9f');
      this.sound.orderExpired();
    }

    this.kitchen.update(dt);
    this.handleKitchenEvents();

    // The chef's busy marker floats above their hat while chopping.
    this.kitchen.chef.busyMarker = this.kitchen.busyJob?.kind === 'chop' ? 'chopping…' : null;

    // Drop old toasts and popups.
    this.toasts = this.toasts.filter((t) => this.now - t.born < 2.8);
    this.popups = this.popups.filter((p) => this.now - p.born < 1.2);

    if (this.demo) {
      this.demoTimer -= dt;
      if (this.demoTimer <= 0) {
        this.demoTimer = 0.22;
        this.runDemoStep();
      }
    }
  }

  handleKitchenEvents() {
    for (const event of this.kitchen.takeEvents()) {
      switch (event.type) {
        case 'hand-full':
          this.addToast('Your hands are full!', '#ff9f9f');
          break;
        case 'nothing-to-chop':
          this.addToast('Hold a raw veggie to chop it', '#ff9f9f');
          break;
        case 'nothing-to-grill':
          this.addToast('Hold a raw patty to grill it', '#ff9f9f');
          break;
        case 'grill-busy':
          this.addToast('The grill is already busy', '#ff9f9f');
          break;
        case 'board-busy':
          this.addToast('The board is already busy', '#ff9f9f');
          break;
        case 'grill-not-ready':
          this.addToast('That patty is still cooking', '#ff9f9f');
          break;
        case 'grill-burnt':
          this.addToast('The patty burnt! Toss it from the grill', '#ff9f9f');
          break;
        case 'not-ready':
          this.addToast('That still needs chopping or grilling', '#ff9f9f');
          break;
        case 'chopped':
          this.addToast(`${ingredientById(event.ingredientId)?.name ?? 'Veggie'} chopped`, '#9fe8b4');
          break;
        case 'grilled':
          this.addToast('Patty cooked — nice and juicy', '#9fe8b4');
          break;
        default:
          break;
      }
    }
  }

  // ------------------------------------------------------------ player actions

  // Every action below goes through the chef: the kitchen walks them to the
  // station and runs the action on arrival.

  pickIngredient(ingredientId) {
    if (this.state !== 'playing') return;
    if (this.kitchen.handFull) {
      this.addToast('Your hands are full!', '#ff9f9f');
      this.sound.error();
      return;
    }
    this.kitchen.requestAction({
      kind: 'pick',
      ingredientId,
      stationX: stationFrontX('pantry'),
    });
  }

  chopOrTake() {
    if (this.state !== 'playing') return;
    const kitchen = this.kitchen;
    if (kitchen.board.item && kitchen.board.waiting) {
      kitchen.requestAction({ kind: 'take-board', stationX: stationFrontX('board') });
    } else {
      kitchen.requestAction({ kind: 'chop', stationX: stationFrontX('board') });
    }
  }

  grillOrTake() {
    if (this.state !== 'playing') return;
    const kitchen = this.kitchen;
    if (kitchen.grill.item && kitchen.grill.burnt) {
      kitchen.requestAction({ kind: 'trash-grill', stationX: stationFrontX('grill') });
    } else if (kitchen.grill.item && kitchen.grill.progress >= kitchen.grill.needed) {
      kitchen.requestAction({ kind: 'take-grill', stationX: stationFrontX('grill') });
    } else {
      kitchen.requestAction({ kind: 'grill', stationX: stationFrontX('grill') });
    }
  }

  plateTopItem() {
    if (this.state !== 'playing') return;
    const kitchen = this.kitchen;
    const readyIndex = kitchen.readyHandIndex;
    if (readyIndex >= 0) {
      kitchen.requestAction({ kind: 'plate', handIndex: readyIndex, stationX: stationFrontX('plating') });
    } else if (kitchen.plate.length > 0) {
      // Clicking the plate with nothing ready in hand clears it.
      kitchen.requestAction({ kind: 'clear-plate', stationX: stationFrontX('plating') });
    } else {
      this.addToast('Nothing ready to plate yet', '#ff9f9f');
      this.sound.error();
    }
  }

  trashHandItem(handIndex) {
    if (this.state !== 'playing') return;
    if (this.kitchen.trashHandItem(handIndex)) {
      this.addToast('Tossed it', '#c9b8a3');
    }
  }

  servePlate() {
    if (this.state !== 'playing') return;
    const match = this.orderBoard.matchForPlate(this.kitchen.plate);
    if (!match) {
      if (this.kitchen.plate.length === 0) {
        this.addToast('The plate is empty — build a dish first', '#ff9f9f');
      } else {
        this.addToast('No order wants this dish yet', '#ff9f9f');
      }
      this.sound.error();
      return;
    }
    this.serveToOrder(match);
  }

  serveToOrder(order) {
    if (this.state !== 'playing') return;
    const match = this.orderBoard.matchForPlate(this.kitchen.plate);
    if (!match || match !== order) {
      order.shake(this.now);
      if (this.kitchen.plate.length > 0) {
        this.addToast(`That plate is not a ${order.recipe.name}`, '#ff9f9f');
      }
      this.sound.error();
      return;
    }
    const points = pointsForServe(order.recipe, order.left, order.total, this.combo);
    const coins = coinsForPoints(points);
    this.score += points;
    this.coins += coins;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.served++;
    this.popups.push({
      x: 1173,
      y: 200,
      text: `+${points}`,
      colour: '#2e9e5b',
      born: this.now,
    });
    this.addToast(
      `Served ${order.recipe.name} to ${order.customer.name}! +${points} pts, +${coins} coins`,
      '#9fe8b4',
    );
    this.orderBoard.remove(order);
    this.kitchen.plate = [];
    this.sound.serve();
    const newLevel = levelForServed(this.served);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.addToast(`Level ${newLevel}! More orders, faster timers`, '#ffc93c');
      this.sound.levelUp();
    }
  }

  // ------------------------------------------------------------ feedback

  addToast(text, colour = '#ffffff') {
    this.toasts.push({ text, colour, born: this.now });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  // ------------------------------------------------------------ demo autopilot

  // Plays the real game through the same actions a player uses: pick the
  // oldest order, fetch what it is missing, prep it, plate it and serve it.
  // "Needed" counts what the order still lacks after everything already in
  // hand, on the plate, on the grill or on the board — so the autopilot
  // never fetches a duplicate or waits on a full hand.
  runDemoStep() {
    const kitchen = this.kitchen;
    if (kitchen.busyJob || kitchen.pendingAction || !kitchen.chef.arrived) return;
    const board = this.orderBoard;

    // 1. A finished plate goes straight to its customer — after the
    // screenshot hold, when one is set.
    const match = board.matchForPlate(kitchen.plate);
    if (match) {
      if (this.demoServeDelay > 0) {
        if (!this.demoServeReadyAt) this.demoServeReadyAt = this.now + this.demoServeDelay;
        if (this.now < this.demoServeReadyAt) return;
        this.demoServeReadyAt = null;
      }
      this.serveToOrder(match);
      return;
    }
    this.demoServeReadyAt = null;

    const target = board.orders[0];
    // 2. A plate that no open order can use gets cleared.
    if (kitchen.plate.length > 0) {
      if (!target || !this.plateFitsRecipe(kitchen.plate, target.recipe.items)) {
        kitchen.clearPlate();
        return;
      }
    }
    if (!target) return;

    // What the order still lacks on the plate (for using what is in hand)
    // and what it still lacks anywhere at all (for fetching new items).
    const plateMissing = this.missingOnPlate(target);
    const needed = this.stillNeededForOrder(target);

    // 3. A burnt patty comes off the grill before anything else.
    if (kitchen.grill.item?.burnt) {
      this.grillOrTake();
      return;
    }
    // 4. Take finished work off the stations while there is room to hold it.
    if (
      kitchen.grill.item &&
      kitchen.grill.progress >= kitchen.grill.needed &&
      !kitchen.handFull
    ) {
      this.grillOrTake();
      return;
    }
    if (kitchen.board.item?.waiting && !kitchen.handFull) {
      this.chopOrTake();
      return;
    }

    // 5. Toss a carried item the order cannot use: one the recipe never
    // asks for, or a duplicate past what the plate, grill and board already
    // cover. This frees a hand slot for a cooked patty waiting on the grill.
    const useless = this.uselessHandIndex(target);
    if (useless >= 0) {
      this.trashHandItem(useless);
      return;
    }

    // 6. Plate a ready item the plate still needs.
    const readyIndex = kitchen.hand.findIndex(
      (item) => item.state === 'ready' && plateMissing.includes(preparedIdOf(item.ingredientId)),
    );
    if (readyIndex >= 0) {
      kitchen.requestAction({ kind: 'plate', handIndex: readyIndex, stationX: stationFrontX('plating') });
      return;
    }

    // 7. Prep a raw item the plate still needs.
    const choppable = kitchen.hand.findIndex(
      (item) =>
        item.state === 'raw' &&
        ingredientById(item.ingredientId)?.prep === 'chop' &&
        plateMissing.includes(preparedIdOf(item.ingredientId)),
    );
    if (choppable >= 0 && !kitchen.board.item) {
      this.chopOrTake();
      return;
    }
    const grillable = kitchen.hand.findIndex(
      (item) =>
        item.state === 'raw' &&
        ingredientById(item.ingredientId)?.prep === 'grill' &&
        plateMissing.includes(preparedIdOf(item.ingredientId)),
    );
    if (grillable >= 0 && !kitchen.grill.item) {
      this.grillOrTake();
      return;
    }

    // 8. Fetch the first still-needed item's ingredient.
    if (!kitchen.handFull && needed.length > 0) {
      const next = needed[0];
      const ing = INGREDIENTS.find((candidate) => preparedIdOf(candidate.id) === next);
      if (ing) {
        this.pickIngredient(ing.id);
      }
    }
  }

  // The first hand item the target order cannot use: its prepared id is not
  // in the recipe, or the hand holds more of it than the order still needs
  // after what the plate, grill and board already cover. -1 when every
  // carried item still has a job.
  uselessHandIndex(order) {
    const counts = new Map();
    for (const item of order.recipe.items) counts.set(item, (counts.get(item) ?? 0) + 1);
    const cover = (preparedId) => {
      const left = counts.get(preparedId) ?? 0;
      if (left > 0) counts.set(preparedId, left - 1);
    };
    for (const item of this.kitchen.plate) cover(item);
    if (this.kitchen.grill.item) cover(preparedIdOf(this.kitchen.grill.item.ingredientId));
    if (this.kitchen.board.item) cover(preparedIdOf(this.kitchen.board.item.ingredientId));
    const seen = new Map();
    for (let i = 0; i < this.kitchen.hand.length; i++) {
      const pid = preparedIdOf(this.kitchen.hand[i].ingredientId);
      const want = counts.get(pid) ?? 0;
      const have = seen.get(pid) ?? 0;
      if (have < want) seen.set(pid, have + 1);
      else return i;
    }
    return -1;
  }

  // The target order's items that are not yet on the plate, in recipe order.
  missingOnPlate(order) {
    const counts = new Map();
    for (const item of this.kitchen.plate) counts.set(item, (counts.get(item) ?? 0) + 1);
    const missing = [];
    for (const item of order.recipe.items) {
      const have = counts.get(item) ?? 0;
      if (have > 0) counts.set(item, have - 1);
      else missing.push(item);
    }
    return missing;
  }

  // The target order's items that are not yet covered by the plate, the
  // hand, the grill or the board — each listed as many times as still needed.
  stillNeededForOrder(order) {
    const counts = new Map();
    for (const item of order.recipe.items) counts.set(item, (counts.get(item) ?? 0) + 1);
    const cover = (preparedId) => {
      const left = counts.get(preparedId) ?? 0;
      if (left > 0) counts.set(preparedId, left - 1);
    };
    for (const item of this.kitchen.plate) cover(item);
    for (const item of this.kitchen.hand) cover(preparedIdOf(item.ingredientId));
    if (this.kitchen.grill.item) cover(preparedIdOf(this.kitchen.grill.item.ingredientId));
    if (this.kitchen.board.item) cover(preparedIdOf(this.kitchen.board.item.ingredientId));
    const needed = [];
    for (const [item, count] of counts) {
      for (let i = 0; i < count; i++) needed.push(item);
    }
    return needed;
  }

  plateFitsRecipe(plateItems, recipeItems) {
    const counts = new Map();
    for (const item of recipeItems) counts.set(item, (counts.get(item) ?? 0) + 1);
    for (const item of plateItems) {
      const left = counts.get(item) ?? 0;
      if (left <= 0) return false;
      counts.set(item, left - 1);
    }
    return true;
  }


  // A plain snapshot of the game's state, for debugging and screenshots.
  snapshot() {
    return {
      state: this.state,
      score: this.score,
      coins: this.coins,
      combo: this.combo,
      served: this.served,
      lost: this.lost,
      level: this.level,
      shiftLeft: Math.round(this.shiftLeft),
      orders: this.orderBoard.orders.map((o) => ({ dish: o.recipe.name, left: Math.round(o.left) })),
      plate: [...this.kitchen.plate],
      hand: this.kitchen.hand.map((item) => `${item.ingredientId}:${item.state}`),
      chefX: Math.round(this.kitchen.chef.x),
      grill: this.kitchen.grill.item
        ? { progress: Math.round(this.kitchen.grill.progress * 10) / 10, burnt: this.kitchen.grill.burnt }
        : null,
      board: this.kitchen.board.item ? this.kitchen.board.item.ingredientId : null,
    };
  }
}

// Boot the game when this module loads.
const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// A small handle for automated play-testing and screenshots: the demo and
// the snapshot are how the screenshots in this repository were taken.
window.__sizzle = {
  game,
  snapshot: () => game.snapshot(),
  state: () => game.state,
};
