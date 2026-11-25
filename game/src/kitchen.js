// kitchen.js — the working kitchen: the pantry bins, the chopping board,
// the grill, the plating counter, the chef who walks between them, and the
// hand that carries ingredients. Clicking a station sends the chef there;
// the action runs when the chef arrives.

import {
  CANVAS_WIDTH,
  CHEF_SPEED,
  HAND_CAPACITY,
  GRILL_BURN_SECONDS,
  INGREDIENTS,
  ingredientById,
  preparedIdOf,
} from './config.js';

// Where everything sits on the 1280x800 canvas. The stations share one row
// so the chef's route is a single walk along the floor beneath them.
export const STATION_RECTS = {
  pantry: { x: 340, y: 84, w: 300, h: 246 },
  board: { x: 664, y: 84, w: 180, h: 246 },
  grill: { x: 868, y: 84, w: 190, h: 246 },
  plating: { x: 1082, y: 84, w: 182, h: 246 },
};

// The pantry's six ingredient bins, in two rows of three inside the pantry.
export function pantryBinRect(ingredientIndex) {
  const pantry = STATION_RECTS.pantry;
  const col = ingredientIndex % 3;
  const row = Math.floor(ingredientIndex / 3);
  return {
    x: pantry.x + 14 + col * 92,
    y: pantry.y + 74 + row * 78,
    w: 82,
    h: 68,
  };
}

// The chef walks along this lane, below the stations.
export const FLOOR_Y = 470;

export function stationFrontX(stationName) {
  const rect = STATION_RECTS[stationName];
  return rect.x + rect.w / 2;
}

export class Chef {
  constructor() {
    this.x = 640;
    this.y = FLOOR_Y;
    this.targetX = 640;
    this.facing = 1;
    this.walking = false;
    this.bobPhase = 0;
  }

  walkTo(x) {
    this.targetX = Math.max(60, Math.min(CANVAS_WIDTH - 60, x));
  }

  get arrived() {
    return Math.abs(this.x - this.targetX) < 4;
  }

  update(dt) {
    const distance = this.targetX - this.x;
    if (Math.abs(distance) < 4) {
      this.walking = false;
      this.x = this.targetX;
      return;
    }
    this.walking = true;
    this.facing = distance > 0 ? 1 : -1;
    const step = CHEF_SPEED * dt;
    this.x += Math.max(-step, Math.min(step, distance));
    this.bobPhase += dt * 14;
  }
}

// One item the chef carries: an ingredient id plus whether it is raw or
// already prepared ('raw' or 'ready'). Its prepared id is what the plate
// and the recipes compare.
export function makeCarriedItem(ingredientId) {
  return { ingredientId, state: 'raw' };
}

export function carriedPreparedId(item) {
  if (item.state === 'ready') return preparedIdOf(item.ingredientId);
  return item.ingredientId;
}

export class Kitchen {
  constructor(sound) {
    this.sound = sound;
    this.chef = new Chef();
    // The hand: at most HAND_CAPACITY carried items.
    this.hand = [];
    // The chopping board holds one raw item and a progress timer.
    this.board = { item: null, progress: 0, needed: 0 };
    // The grill holds one patty and a progress timer; past the burn time it
    // is ruined and must be thrown away.
    this.grill = { item: null, progress: 0, needed: 0, burnt: false, readyNotified: false };
    // The plate being assembled: a list of prepared item ids.
    this.plate = [];
    // The action the chef will run when they reach their station, or null.
    this.pendingAction = null;
    // A timed job the chef is busy with ('chop' or 'grill'), or null.
    this.busyJob = null;
    this.events = [];
  }

  reset() {
    this.hand = [];
    this.board = { item: null, progress: 0, needed: 0 };
    this.grill = { item: null, progress: 0, needed: 0, burnt: false, readyNotified: false };
    this.plate = [];
    this.pendingAction = null;
    this.busyJob = null;
    this.events = [];
    this.chef = new Chef();
  }

  get handFull() {
    return this.hand.length >= HAND_CAPACITY;
  }

  // ------------------------------------------------------------ orders

  // Send the chef to a station to run an action on arrival. While a timed
  // job runs, the chef finishes it first; new orders wait their turn.
  requestAction(action) {
    if (this.busyJob) return false;
    this.pendingAction = action;
    this.chef.walkTo(action.stationX);
    return true;
  }

  // Advance the chef, the pending action and any timed job. The grill cooks
  // on its own the whole time, even while the chef is busy chopping.
  update(dt) {
    this.chef.update(dt);
    // The grill cooks on its own once a patty is on it.
    if (this.grill.item) {
      this.grill.progress += dt;
      if (!this.grill.readyNotified && this.grill.progress >= this.grill.needed) {
        this.grill.readyNotified = true;
        this.events.push({ type: 'grill-ready' });
        this.sound.startSizzle();
      }
      if (!this.grill.burnt && this.grill.progress >= GRILL_BURN_SECONDS) {
        this.grill.burnt = true;
        this.events.push({ type: 'grill-burnt' });
        this.sound.stopSizzle();
      }
    }
    if (this.busyJob) {
      if (this.busyJob.kind === 'chop') {
        this.board.progress += dt;
        if (this.board.progress >= this.board.needed) this.finishChop();
      }
      return;
    }
    if (this.pendingAction && this.chef.arrived) {
      const action = this.pendingAction;
      this.pendingAction = null;
      this.runAction(action);
    }
  }

  // Drain the event list the game loop reads each frame (sounds, toasts).
  takeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  // ------------------------------------------------------------ actions

  runAction(action) {
    switch (action.kind) {
      case 'pick':
        this.pickIngredient(action.ingredientId);
        break;
      case 'chop':
        this.startChop();
        break;
      case 'take-board':
        this.takeFromBoard();
        break;
      case 'grill':
        this.startGrill();
        break;
      case 'take-grill':
        this.takeFromGrill();
        break;
      case 'plate':
        this.addHandItemToPlate(action.handIndex ?? 0);
        break;
      case 'trash-hand':
        this.trashHandItem(action.handIndex ?? 0);
        break;
      case 'trash-grill':
        this.trashGrill();
        break;
      case 'clear-plate':
        this.clearPlate();
        break;
      default:
        break;
    }
  }

  pickIngredient(ingredientId) {
    if (this.handFull) {
      this.events.push({ type: 'hand-full' });
      this.sound.error();
      return false;
    }
    const ing = ingredientById(ingredientId);
    if (!ing) return false;
    const item = makeCarriedItem(ingredientId);
    if (ing.prep === 'none') item.state = 'ready';
    this.hand.push(item);
    this.events.push({ type: 'picked', ingredientId });
    this.sound.pickUp();
    return true;
  }

  // The first raw, choppable item in the hand goes onto the board.
  startChop() {
    if (this.board.item) {
      this.events.push({ type: 'board-busy' });
      this.sound.error();
      return false;
    }
    const index = this.hand.findIndex(
      (item) => item.state === 'raw' && ingredientById(item.ingredientId)?.prep === 'chop',
    );
    if (index < 0) {
      this.events.push({ type: 'nothing-to-chop' });
      this.sound.error();
      return false;
    }
    const item = this.hand.splice(index, 1)[0];
    const ing = ingredientById(item.ingredientId);
    this.board = { item, progress: 0, needed: ing.prepSeconds };
    this.busyJob = { kind: 'chop' };
    this.sound.chop();
    return true;
  }

  finishChop() {
    const item = this.board.item;
    this.board = { item: null, progress: 0, needed: 0 };
    this.busyJob = null;
    if (!item) return;
    item.state = 'ready';
    if (this.handFull) {
      // Nowhere to put it: leave the chopped pieces on the board's tray.
      this.board = { item, progress: 0, needed: 0, waiting: true };
      this.events.push({ type: 'chop-waiting' });
      return;
    }
    this.hand.push(item);
    this.events.push({ type: 'chopped', ingredientId: item.ingredientId });
    this.sound.chopDone();
  }

  takeFromBoard() {
    if (!this.board.item || !this.board.waiting) return false;
    if (this.handFull) {
      this.events.push({ type: 'hand-full' });
      this.sound.error();
      return false;
    }
    const item = this.board.item;
    this.board = { item: null, progress: 0, needed: 0 };
    this.hand.push(item);
    this.events.push({ type: 'picked', ingredientId: item.ingredientId });
    this.sound.pickUp();
    return true;
  }

  startGrill() {
    if (this.grill.item) {
      this.events.push({ type: 'grill-busy' });
      this.sound.error();
      return false;
    }
    const index = this.hand.findIndex(
      (item) => item.state === 'raw' && ingredientById(item.ingredientId)?.prep === 'grill',
    );
    if (index < 0) {
      this.events.push({ type: 'nothing-to-grill' });
      this.sound.error();
      return false;
    }
    const item = this.hand.splice(index, 1)[0];
    const ing = ingredientById(item.ingredientId);
    this.grill = { item, progress: 0, needed: ing.prepSeconds, burnt: false, readyNotified: false };
    this.events.push({ type: 'grilling' });
    this.sound.startSizzle();
    return true;
  }

  takeFromGrill() {
    if (!this.grill.item) return false;
    if (this.grill.burnt) {
      this.events.push({ type: 'grill-burnt-take' });
      this.sound.error();
      return false;
    }
    if (this.grill.progress < this.grill.needed) {
      this.events.push({ type: 'grill-not-ready' });
      this.sound.error();
      return false;
    }
    if (this.handFull) {
      this.events.push({ type: 'hand-full' });
      this.sound.error();
      return false;
    }
    const item = this.grill.item;
    this.grill = { item: null, progress: 0, needed: 0, burnt: false, readyNotified: false };
    item.state = 'ready';
    this.hand.push(item);
    this.events.push({ type: 'grilled', ingredientId: item.ingredientId });
    this.sound.stopSizzle();
    this.sound.pickUp();
    return true;
  }

  trashGrill() {
    if (!this.grill.item || !this.grill.burnt) return false;
    this.grill = { item: null, progress: 0, needed: 0, burnt: false, readyNotified: false };
    this.events.push({ type: 'trashed-burnt' });
    this.sound.stopSizzle();
    return true;
  }

  addHandItemToPlate(handIndex) {
    const item = this.hand[handIndex];
    if (!item) {
      this.events.push({ type: 'hand-empty' });
      this.sound.error();
      return false;
    }
    if (item.state !== 'ready') {
      this.events.push({ type: 'not-ready' });
      this.sound.error();
      return false;
    }
    this.hand.splice(handIndex, 1);
    this.plate.push(carriedPreparedId(item));
    this.events.push({ type: 'plated', preparedId: carriedPreparedId(item) });
    this.sound.plate();
    return true;
  }

  trashHandItem(handIndex) {
    const item = this.hand[handIndex];
    if (!item) return false;
    this.hand.splice(handIndex, 1);
    this.events.push({ type: 'trashed', ingredientId: item.ingredientId });
    return true;
  }

  clearPlate() {
    if (this.plate.length === 0) return false;
    this.plate = [];
    this.events.push({ type: 'plate-cleared' });
    return true;
  }

  // The plate's items, as prepared ids, in the order they were added.
  get plateItems() {
    return [...this.plate];
  }

  // The first hand item that still needs chopping, or -1.
  get choppableHandIndex() {
    return this.hand.findIndex(
      (item) => item.state === 'raw' && ingredientById(item.ingredientId)?.prep === 'chop',
    );
  }

  // The first hand item that still needs grilling, or -1.
  get grillableHandIndex() {
    return this.hand.findIndex(
      (item) => item.state === 'raw' && ingredientById(item.ingredientId)?.prep === 'grill',
    );
  }

  // The first ready hand item, or -1.
  get readyHandIndex() {
    return this.hand.findIndex((item) => item.state === 'ready');
  }
}

// The ingredient bins, in the order the keyboard shortcuts 1-6 address them.
export function binIndexOfIngredient(ingredientId) {
  return INGREDIENTS.findIndex((ing) => ing.id === ingredientId);
}
