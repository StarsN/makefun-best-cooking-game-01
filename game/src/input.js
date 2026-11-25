// input.js — mouse and keyboard for Sizzle & Serve. It translates clicks
// into the game's own actions (pick, chop, grill, plate, serve) and keys
// into the same actions, so mouse and keyboard always do the same thing.
// Hit areas mirror the rectangles render.js draws.

import { INGREDIENTS } from './config.js';
import { STATION_RECTS, pantryBinRect, stationFrontX } from './kitchen.js';
import { HIT_RECTS } from './render.js';

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// The order tickets live inside the board drawn by render.js: first ticket
// at y 120, each 64 high with a 6 gap, 300 wide starting at x 26.
export function ticketRectAt(index) {
  return { x: 26, y: 120 + index * 70, w: 280, h: 64 };
}

// The three hand slots in the bottom panel.
export function handSlotRectAt(index) {
  return { x: 40 + index * 84, y: 620, w: 72, h: 72 };
}

export function bindInput(canvas, game) {
  // Convert a pointer event to logical canvas coordinates.
  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    game.sound.unlock();
    const { x, y } = toLogical(event);

    // Title and game-over screens: any click starts (or restarts) the game.
    if (game.state === 'title') {
      game.startGame();
      return;
    }
    if (game.state === 'over') {
      game.restart();
      return;
    }

    // The small sound / pause buttons always work, even while paused.
    if (pointInRect(x, y, HIT_RECTS.soundButton)) {
      game.toggleMute();
      return;
    }
    if (pointInRect(x, y, HIT_RECTS.pauseButton)) {
      game.togglePause();
      return;
    }
    if (game.state === 'paused') return;

    // The big SERVE button.
    if (pointInRect(x, y, HIT_RECTS.serveButton)) {
      game.servePlate();
      return;
    }

    // An order ticket: serve the plate to that customer.
    for (let i = 0; i < game.orderBoard.orders.length; i++) {
      if (pointInRect(x, y, ticketRectAt(i))) {
        game.serveToOrder(game.orderBoard.orders[i]);
        return;
      }
    }

    // A pantry bin: walk over and pick that ingredient up.
    for (let i = 0; i < INGREDIENTS.length; i++) {
      if (pointInRect(x, y, pantryBinRect(i))) {
        game.pickIngredient(INGREDIENTS[i].id);
        return;
      }
    }

    // A hand slot: toss that item in the bin.
    for (let i = 0; i < 3; i++) {
      if (pointInRect(x, y, handSlotRectAt(i))) {
        game.trashHandItem(i);
        return;
      }
    }

    // The chopping board: chop what is in hand, or take a finished chop.
    if (pointInRect(x, y, STATION_RECTS.board)) {
      game.chopOrTake();
      return;
    }

    // The grill: start a patty, take a cooked one, or toss a burnt one.
    if (pointInRect(x, y, STATION_RECTS.grill)) {
      game.grillOrTake();
      return;
    }

    // The plating counter: add the top ready item to the plate.
    if (pointInRect(x, y, STATION_RECTS.plating)) {
      game.plateTopItem();
      return;
    }

    // The pantry itself (outside the bins): just walk over.
    if (pointInRect(x, y, STATION_RECTS.pantry)) {
      game.kitchen.chef.walkTo(stationFrontX('pantry'));
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    game.sound.unlock();

    if (game.state === 'title' && (key === 'enter' || key === ' ')) {
      event.preventDefault();
      game.startGame();
      return;
    }
    if (game.state === 'over' && (key === 'r' || key === 'enter' || key === ' ')) {
      event.preventDefault();
      game.restart();
      return;
    }
    if (key === 'escape' || key === 'p') {
      if (game.state === 'playing' || game.state === 'paused') game.togglePause();
      return;
    }
    if (key === 'm') {
      game.toggleMute();
      return;
    }
    if (game.state !== 'playing') return;

    // Number keys 1-6 grab the matching pantry ingredient.
    const digit = Number.parseInt(key, 10);
    if (digit >= 1 && digit <= INGREDIENTS.length) {
      game.pickIngredient(INGREDIENTS[digit - 1].id);
      return;
    }
    switch (key) {
      case 'c':
        game.chopOrTake();
        break;
      case 'g':
        game.grillOrTake();
        break;
      case 'p':
      case ' ':
        event.preventDefault();
        game.plateTopItem();
        break;
      case 's':
        game.servePlate();
        break;
      case 'x':
        game.trashHandItem(0);
        break;
      default:
        break;
    }
  });
}
