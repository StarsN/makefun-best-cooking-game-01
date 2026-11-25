// render.js — everything the player sees, drawn on one canvas with flat
// colours and simple shapes: the kitchen, the order board, the stations,
// the chef, the hand tray, the HUD and the title / pause / game-over screens.
// No images are loaded; every ingredient and dish is drawn here.

import { CANVAS_WIDTH, CANVAS_HEIGHT, INGREDIENTS, ingredientById, ingredientOfPreparedId, formatClock } from './config.js';
import { STATION_RECTS, pantryBinRect, FLOOR_Y } from './kitchen.js';

// ---------------------------------------------------------------- palette

const COLOURS = {
  wall: '#f6e7c8',
  wallTile: '#f1dcb4',
  floor: '#c98d5f',
  floorDark: '#b57a4e',
  counter: '#8a5a33',
  counterTop: '#a06a3e',
  hud: '#234e3f',
  hudDark: '#173528',
  cream: '#fff8e7',
  ink: '#2b2118',
  muted: '#7a6a58',
  gold: '#ffc93c',
  green: '#2e9e5b',
  red: '#e84a3a',
  blue: '#3d8bfd',
  board: '#fdf3d8',
};

// ---------------------------------------------------------------- helpers

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, weight = '700', align = 'left') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function progressRing(ctx, x, y, radius, fraction, colour) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = COLOURS.cream;
  ctx.fill();
}

// ---------------------------------------------------------------- ingredients

// Draw one ingredient at (cx, cy) with the given radius. `preparedId` is a
// prepared item id such as 'patty-cooked' or 'lettuce-chopped'; the plain
// ingredient id works too. A raw item gets a small dotted outline so the
// player can tell at a glance what still needs work.
export function drawIngredientIcon(ctx, preparedId, cx, cy, r, raw = false) {
  const ing = ingredientOfPreparedId(preparedId) ?? ingredientById(preparedId);
  if (!ing) return;
  const c = ing.colour;
  const d = ing.dark;
  ctx.save();
  ctx.translate(cx, cy);
  switch (ing.id) {
    case 'bun': {
      // A sesame bun: domed top, flat base, a few seeds.
      ctx.fillStyle = d;
      roundRect(ctx, -r, r * 0.15, r * 2, r * 0.55, r * 0.25);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.95, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      for (const [sx, sy] of [[-0.45, -0.45], [0, -0.62], [0.45, -0.45], [-0.2, -0.25], [0.25, -0.28]]) {
        ctx.beginPath();
        ctx.ellipse(sx * r, sy * r, r * 0.09, r * 0.06, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = d;
      roundRect(ctx, -r, -r * 0.45, r * 2, r * 0.95, r * 0.4);
      ctx.fill();
      ctx.fillStyle = c;
      roundRect(ctx, -r * 0.92, -r * 0.55, r * 1.84, r * 0.8, r * 0.35);
      ctx.fill();
      // Grill marks.
      ctx.strokeStyle = d;
      ctx.lineWidth = Math.max(1.5, r * 0.09);
      for (const gx of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(gx * r, -r * 0.4);
        ctx.lineTo(gx * r, r * 0.15);
        ctx.stroke();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = d;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.55);
      ctx.lineTo(r, r * 0.55);
      ctx.lineTo(0, -r * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.45);
      ctx.lineTo(r * 0.9, r * 0.45);
      ctx.lineTo(0, -r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = d;
      for (const [hx, hy] of [[-0.3, 0.1], [0.25, -0.15]]) {
        ctx.beginPath();
        ctx.arc(hx * r, hy * r, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = d;
      for (const [lx, ly, lr] of [[-0.55, 0.1, 0.55], [0.55, 0.1, 0.55], [0, -0.35, 0.6], [0, 0.35, 0.6]]) {
        ctx.beginPath();
        ctx.arc(lx * r, ly * r, lr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = c;
      for (const [lx, ly, lr] of [[-0.5, 0.05, 0.5], [0.5, 0.05, 0.5], [0, -0.3, 0.55], [0, 0.3, 0.55]]) {
        ctx.beginPath();
        ctx.arc(lx * r, ly * r, lr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tomato': {
      ctx.fillStyle = d;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7dc242';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.85, r * 0.3, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'onion': {
      ctx.fillStyle = d;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbf7ff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a8d8';
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      for (const rr of [0.6, 0.35]) {
        ctx.beginPath();
        ctx.arc(0, 0, rr * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
  if (raw) {
    ctx.strokeStyle = 'rgba(43,33,24,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- background

function drawBackground(ctx) {
  // Wall with a tile line and a menu poster.
  ctx.fillStyle = COLOURS.wall;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 340);
  ctx.fillStyle = COLOURS.wallTile;
  for (let x = 0; x < CANVAS_WIDTH; x += 64) {
    ctx.fillRect(x, 300, 62, 4);
  }
  // Floor: wide planks.
  ctx.fillStyle = COLOURS.floor;
  ctx.fillRect(0, 340, CANVAS_WIDTH, CANVAS_HEIGHT - 340);
  ctx.fillStyle = COLOURS.floorDark;
  for (let y = 380; y < CANVAS_HEIGHT; y += 56) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 3);
  }
  // A framed menu poster on the wall, above the order board.
  ctx.fillStyle = '#8a5a33';
  roundRect(ctx, 28, 84, 276, 40, 8);
  ctx.fill();
}

// ---------------------------------------------------------------- HUD

function drawHud(ctx, game) {
  ctx.fillStyle = COLOURS.hud;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 64);
  ctx.fillStyle = COLOURS.hudDark;
  ctx.fillRect(0, 60, CANVAS_WIDTH, 4);

  // Title and level.
  text(ctx, 'SIZZLE & SERVE', 20, 42, 28, COLOURS.cream, '800');
  text(ctx, `LEVEL ${game.level}`, 268, 42, 18, COLOURS.gold, '800');

  // Score, coins and combo.
  text(ctx, 'SCORE', 430, 26, 13, '#9fc5b2', '700');
  text(ctx, String(game.score), 430, 50, 24, COLOURS.cream, '800');
  text(ctx, 'COINS', 580, 26, 13, '#9fc5b2', '700');
  text(ctx, `${game.coins}`, 580, 50, 24, COLOURS.gold, '800');
  const comboColour = game.combo >= 3 ? '#ff9f43' : COLOURS.cream;
  text(ctx, 'COMBO', 700, 26, 13, '#9fc5b2', '700');
  text(ctx, game.combo > 0 ? `x${game.combo}` : '—', 700, 50, 24, comboColour, '800');

  // Shift timer: a bar and a clock, turning red in the last thirty seconds.
  const shiftFraction = Math.max(0, game.shiftLeft / game.shiftTotal);
  const timerColour = game.shiftLeft <= 30 ? COLOURS.red : COLOURS.gold;
  text(ctx, 'SHIFT', 850, 26, 13, '#9fc5b2', '700');
  text(ctx, formatClock(game.shiftLeft), 850, 50, 24, timerColour, '800');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 950, 22, 180, 18, 9);
  ctx.fill();
  ctx.fillStyle = timerColour;
  roundRect(ctx, 950, 22, Math.max(8, 180 * shiftFraction), 18, 9);
  ctx.fill();

  // Dishes served.
  text(ctx, 'SERVED', 1160, 26, 13, '#9fc5b2', '700');
  text(ctx, String(game.served), 1160, 50, 24, COLOURS.cream, '800');
}

// ---------------------------------------------------------------- order board

function drawCustomerFace(ctx, order, cx, cy, r) {
  ctx.fillStyle = order.customer.skin;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Hair cap in the customer's colour.
  ctx.fillStyle = order.customer.colour;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r * 0.95, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLOURS.ink;
  ctx.beginPath();
  ctx.arc(cx - r * 0.32, cy + r * 0.05, r * 0.09, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.32, cy + r * 0.05, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOURS.ink;
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.3, r * 0.35, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

function drawOrderBoard(ctx, game) {
  const x = 16;
  const y = 76;
  const w = 300;
  ctx.fillStyle = '#5b3a1e';
  roundRect(ctx, x, y, w, 396, 12);
  ctx.fill();
  ctx.fillStyle = COLOURS.board;
  roundRect(ctx, x + 4, y + 4, w - 8, 388, 10);
  ctx.fill();
  text(ctx, 'ORDER BOARD', x + 18, y + 32, 18, '#5b3a1e', '800');
  text(ctx, `${game.orderBoard.count} waiting`, x + w - 18, y + 32, 14, COLOURS.muted, '700', 'right');

  const ticketH = 64;
  const gap = 6;
  game.orderBoard.orders.forEach((order, index) => {
    const ty = y + 44 + index * (ticketH + gap);
    const shake = order.shaking ? (Math.random() - 0.5) * 6 : 0;
    ctx.save();
    ctx.translate(shake, 0);
    const urgent = order.isUrgent;
    ctx.fillStyle = urgent && Math.floor(game.now * 4) % 2 === 0 ? '#ffe1dc' : '#ffffff';
    roundRect(ctx, x + 10, ty, w - 20, ticketH, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? COLOURS.red : '#e0cfa8';
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();

    drawCustomerFace(ctx, order, x + 34, ty + 24, 15);
    text(ctx, order.customer.name, x + 56, ty + 20, 12, COLOURS.muted, '700');
    text(ctx, order.recipe.name, x + 56, ty + 40, 16, COLOURS.ink, '800');

    // The dish's ingredients, as icons.
    order.recipe.items.forEach((item, i) => {
      drawIngredientIcon(ctx, item, x + 190 + i * 26, ty + 26, 11);
    });

    // The ticket's own timer bar.
    const fraction = Math.max(0, order.left / order.total);
    const barColour = fraction > 0.5 ? COLOURS.green : fraction > 0.25 ? '#e8a13c' : COLOURS.red;
    ctx.fillStyle = '#eadfc2';
    roundRect(ctx, x + 18, ty + ticketH - 14, w - 36, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = barColour;
    roundRect(ctx, x + 18, ty + ticketH - 14, Math.max(6, (w - 36) * fraction), 7, 3.5);
    ctx.fill();
    text(ctx, `${Math.ceil(Math.max(0, order.left))}s`, x + w - 22, ty + ticketH - 20, 12, barColour, '800', 'right');
    ctx.restore();
  });

  if (game.orderBoard.count === 0) {
    text(ctx, 'No orders yet —', x + w / 2, y + 140, 15, COLOURS.muted, '700', 'center');
    text(ctx, 'the lunch rush is coming!', x + w / 2, y + 164, 15, COLOURS.muted, '700', 'center');
  }
}

// ---------------------------------------------------------------- stations

function drawStationCard(ctx, rect, title, accent, active) {
  ctx.fillStyle = active ? '#fff3d0' : '#ffffff';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = active ? accent : '#d8c9a3';
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  roundRect(ctx, rect.x, rect.y, rect.w, 34, 12);
  ctx.fill();
  ctx.fillRect(rect.x, rect.y + 22, rect.w, 12);
  text(ctx, title, rect.x + rect.w / 2, rect.y + 23, 15, '#ffffff', '800', 'center');
}

function drawPantry(ctx, game) {
  const rect = STATION_RECTS.pantry;
  const active = game.kitchen.pendingAction?.kind === 'pick';
  drawStationCard(ctx, rect, 'PANTRY  ·  click an ingredient', '#8a5a33', active);
  INGREDIENTS.forEach((ing, i) => {
    const bin = pantryBinRect(i);
    ctx.fillStyle = '#f6ead2';
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#d8c9a3';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredientIcon(ctx, ing.id, bin.x + bin.w / 2, bin.y + 26, 17, ing.prep !== 'none');
    text(ctx, ing.name, bin.x + bin.w / 2, bin.y + 58, 12, COLOURS.ink, '700', 'center');
    text(ctx, ing.key, bin.x + bin.w - 6, bin.y + 14, 11, COLOURS.muted, '700', 'right');
  });
  text(ctx, 'dotted = needs prep', rect.x + rect.w / 2, rect.y + rect.h - 8, 11, COLOURS.muted, '700', 'center');
}

function drawBoard(ctx, game) {
  const rect = STATION_RECTS.board;
  const kitchen = game.kitchen;
  const active = kitchen.pendingAction?.kind === 'chop' || kitchen.busyJob?.kind === 'chop';
  drawStationCard(ctx, rect, 'CHOPPING', '#7dc242', active);
  // The wooden board.
  ctx.fillStyle = '#d9a05b';
  roundRect(ctx, rect.x + 18, rect.y + 56, rect.w - 36, 130, 10);
  ctx.fill();
  ctx.fillStyle = '#e8b06a';
  roundRect(ctx, rect.x + 24, rect.y + 62, rect.w - 48, 118, 8);
  ctx.fill();
  const board = kitchen.board;
  if (board.item) {
    drawIngredientIcon(ctx, board.item.ingredientId, rect.x + rect.w / 2, rect.y + 118, 30, true);
    if (kitchen.busyJob?.kind === 'chop') {
      progressRing(ctx, rect.x + rect.w / 2, rect.y + 118, 42, board.progress / board.needed, '#7dc242');
      text(ctx, 'CHOPPING…', rect.x + rect.w / 2, rect.y + 210, 13, '#4e8f24', '800', 'center');
    } else if (board.waiting) {
      text(ctx, 'ready — click to take', rect.x + rect.w / 2, rect.y + 210, 12, '#4e8f24', '700', 'center');
    }
  } else {
    text(ctx, 'click with a raw', rect.x + rect.w / 2, rect.y + 118, 13, COLOURS.muted, '700', 'center');
    text(ctx, 'veggie in hand', rect.x + rect.w / 2, rect.y + 138, 13, COLOURS.muted, '700', 'center');
  }
  text(ctx, 'C = chop', rect.x + rect.w / 2, rect.y + rect.h - 8, 11, COLOURS.muted, '700', 'center');
}

function drawGrill(ctx, game) {
  const rect = STATION_RECTS.grill;
  const kitchen = game.kitchen;
  const active = kitchen.pendingAction?.kind === 'grill' || kitchen.pendingAction?.kind === 'take-grill';
  drawStationCard(ctx, rect, 'GRILL', '#e8734a', active);
  // The grill grate.
  ctx.fillStyle = '#3a3a3a';
  roundRect(ctx, rect.x + 16, rect.y + 56, rect.w - 32, 120, 10);
  ctx.fill();
  ctx.strokeStyle = '#6b6b6b';
  ctx.lineWidth = 3;
  for (let i = 1; i < 5; i++) {
    const gx = rect.x + 16 + ((rect.w - 32) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(gx, rect.y + 60);
    ctx.lineTo(gx, rect.y + 172);
    ctx.stroke();
  }
  const grill = kitchen.grill;
  if (grill.item) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + 116;
    if (grill.burnt) {
      drawIngredientIcon(ctx, 'patty', cx, cy, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'BURNT!', cx, cy + 5, 16, '#ffffff', '800', 'center');
      text(ctx, 'click to toss it', cx, rect.y + 210, 12, COLOURS.red, '700', 'center');
    } else {
      drawIngredientIcon(ctx, 'patty', cx, cy, 30);
      const fraction = Math.min(1, grill.progress / grill.needed);
      progressRing(ctx, cx, cy, 42, fraction, fraction >= 1 ? COLOURS.green : '#e8734a');
      if (fraction >= 1) {
        text(ctx, 'READY — click to take', cx, rect.y + 210, 12, COLOURS.green, '800', 'center');
      } else {
        text(ctx, 'sizzling…', cx, rect.y + 210, 13, '#b3541e', '700', 'center');
      }
    }
  } else {
    text(ctx, 'click with a raw', rect.x + rect.w / 2, rect.y + 196, 13, COLOURS.muted, '700', 'center');
    text(ctx, 'patty in hand', rect.x + rect.w / 2, rect.y + 214, 13, COLOURS.muted, '700', 'center');
  }
  text(ctx, 'G = grill', rect.x + rect.w / 2, rect.y + rect.h - 8, 11, COLOURS.muted, '700', 'center');
}

function drawPlateOnCounter(ctx, cx, cy, plateItems, scale = 1) {
  // The plate itself.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 62 * scale, 46 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a3';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2ead6';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 46 * scale, 32 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // The items sit side by side on the plate, newest last, so every item of
  // a dish mid-assembly stays visible instead of hiding behind the last one.
  const n = plateItems.length;
  plateItems.forEach((item, i) => {
    const spread = n <= 1 ? 0 : (i - (n - 1) / 2) * (44 / Math.max(1, n - 0.4));
    const ix = cx + spread * scale;
    const iy = cy - 4 * scale + Math.abs(spread) * 0.12 * scale;
    drawIngredientIcon(ctx, item, ix, iy, 15 * scale);
  });
}

function drawPlating(ctx, game) {
  const rect = STATION_RECTS.plating;
  const kitchen = game.kitchen;
  const match = game.orderBoard.matchForPlate(kitchen.plate);
  const active = kitchen.pendingAction?.kind === 'plate';
  drawStationCard(ctx, rect, 'PLATING', '#3d8bfd', active || !!match);
  drawPlateOnCounter(ctx, rect.x + rect.w / 2, rect.y + 128, kitchen.plate);
  if (kitchen.plate.length === 0) {
    text(ctx, 'click with a ready', rect.x + rect.w / 2, rect.y + 196, 12, COLOURS.muted, '700', 'center');
    text(ctx, 'item in hand', rect.x + rect.w / 2, rect.y + 212, 12, COLOURS.muted, '700', 'center');
  } else if (match) {
    text(ctx, `matches ${match.recipe.name}!`, rect.x + rect.w / 2, rect.y + 200, 13, COLOURS.green, '800', 'center');
    text(ctx, 'SERVE it!', rect.x + rect.w / 2, rect.y + 218, 13, COLOURS.green, '800', 'center');
  } else {
    text(ctx, `${kitchen.plate.length} item${kitchen.plate.length > 1 ? 's' : ''} on the plate`, rect.x + rect.w / 2, rect.y + 200, 12, COLOURS.ink, '700', 'center');
    text(ctx, 'keep building…', rect.x + rect.w / 2, rect.y + 218, 12, COLOURS.muted, '700', 'center');
  }
  text(ctx, 'P = add to plate', rect.x + rect.w / 2, rect.y + rect.h - 8, 11, COLOURS.muted, '700', 'center');
}

// ---------------------------------------------------------------- chef

function drawChef(ctx, chef) {
  const bob = chef.walking ? Math.abs(Math.sin(chef.bobPhase)) * 4 : 0;
  const x = chef.x;
  const y = chef.y - bob;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(chef.facing, 1);
  // Legs.
  ctx.fillStyle = '#2b2118';
  const legSwing = chef.walking ? Math.sin(chef.bobPhase) * 7 : 0;
  roundRect(ctx, -14 + legSwing, -26, 10, 26, 4);
  ctx.fill();
  roundRect(ctx, 4 - legSwing, -26, 10, 26, 4);
  ctx.fill();
  // Body: a white apron over a teal shirt.
  ctx.fillStyle = '#234e3f';
  roundRect(ctx, -22, -72, 44, 50, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -18, -66, 36, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#e84a3a';
  ctx.fillRect(-18, -44, 36, 4);
  // Arms.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(24, -48, 7, 0, Math.PI * 2);
  ctx.arc(-24, -48, 7, 0, Math.PI * 2);
  ctx.fill();
  // Head and chef hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -88, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-12, -100, 10, 0, Math.PI * 2);
  ctx.arc(0, -106, 12, 0, Math.PI * 2);
  ctx.arc(12, -100, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-18, -104, 36, 8);
  // Face.
  ctx.fillStyle = COLOURS.ink;
  ctx.beginPath();
  ctx.arc(5, -90, 2, 0, Math.PI * 2);
  ctx.arc(13, -90, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOURS.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(9, -82, 4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();

  // A small "busy" marker while chopping.
  if (chef.busyMarker) {
    text(ctx, chef.busyMarker, x, y - 122, 14, COLOURS.ink, '800', 'center');
  }
}

// ---------------------------------------------------------------- bottom panel

function drawBottomPanel(ctx, game) {
  const kitchen = game.kitchen;
  const y = 556;
  ctx.fillStyle = 'rgba(43,33,24,0.85)';
  roundRect(ctx, 16, y, CANVAS_WIDTH - 32, 228, 14);
  ctx.fill();

  // The hand tray.
  text(ctx, 'YOUR HAND', 40, y + 30, 15, COLOURS.cream, '800');
  text(ctx, 'click a slot to toss it', 40, y + 52, 12, '#c9b8a3', '700');
  for (let i = 0; i < 3; i++) {
    const sx = 40 + i * 84;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, sx, y + 64, 72, 72, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const item = kitchen.hand[i];
    if (item) {
      const prepared = item.state === 'ready';
      drawIngredientIcon(ctx, prepared ? item.ingredientId : item.ingredientId, sx + 36, y + 96, 22, !prepared);
      text(ctx, item.state === 'ready' ? 'ready' : 'raw', sx + 36, y + 128, 11, prepared ? '#9fe8b4' : '#ffd9a0', '700', 'center');
    } else {
      text(ctx, '—', sx + 36, y + 104, 20, 'rgba(255,255,255,0.4)', '700', 'center');
    }
  }

  // What the plate needs next: the oldest order's missing items.
  const first = game.orderBoard.orders[0];
  text(ctx, 'NEXT UP', 330, y + 30, 15, COLOURS.cream, '800');
  if (first) {
    text(ctx, `${first.customer.name} wants a ${first.recipe.name}`, 330, y + 54, 14, '#ffd9a0', '700');
    const missing = missingItemsForPlate(first.recipe.items, kitchen.plate);
    if (missing.length === 0) {
      text(ctx, 'Plate is complete — serve it!', 330, y + 84, 15, '#9fe8b4', '800');
    } else {
      text(ctx, 'Still needed:', 330, y + 84, 13, '#c9b8a3', '700');
      missing.forEach((item, i) => {
        drawIngredientIcon(ctx, item, 356 + i * 40, y + 112, 15);
      });
    }
  } else {
    text(ctx, 'No orders on the board yet.', 330, y + 54, 14, '#c9b8a3', '700');
  }

  // How to play, in one line.
  text(ctx, 'HOW TO PLAY', 330, y + 168, 13, COLOURS.cream, '800');
  text(
    ctx,
    '1–6 grab ingredients  ·  click a station to walk there  ·  C chop  ·  G grill  ·  P plate  ·  S serve  ·  Esc pause',
    330,
    y + 192,
    13,
    '#e8dcc8',
    '700',
  );

  // The big SERVE button, glowing when the plate matches an order.
  const match = game.orderBoard.matchForPlate(kitchen.plate);
  const bx = 1020;
  const by = y + 24;
  const bw = 224;
  const bh = 84;
  const glow = match && Math.floor(game.now * 3) % 2 === 0;
  ctx.fillStyle = match ? (glow ? '#37b96f' : COLOURS.green) : '#5a5148';
  roundRect(ctx, bx, by, bw, bh, 14);
  ctx.fill();
  ctx.strokeStyle = match ? '#b8f5cd' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'SERVE  (S)', bx + bw / 2, by + 38, 24, '#ffffff', '800', 'center');
  text(ctx, match ? match.recipe.name : 'build a dish first', bx + bw / 2, by + 66, 13, '#e8f5ec', '700', 'center');

  // Level progress: four dishes per level.
  const intoLevel = game.served % 4;
  text(ctx, `LEVEL ${game.level} — ${intoLevel}/4 dishes to next level`, 1020, y + 140, 13, '#e8dcc8', '700');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 1020, y + 150, 224, 10, 5);
  ctx.fill();
  ctx.fillStyle = COLOURS.gold;
  roundRect(ctx, 1020, y + 150, 224 * (intoLevel / 4), 10, 5);
  ctx.fill();

  // Sound and pause buttons.
  drawSmallButton(ctx, 1020, y + 176, 106, 34, game.muted ? 'SOUND OFF' : 'SOUND ON', game);
  drawSmallButton(ctx, 1138, y + 176, 106, 34, game.state === 'paused' ? 'RESUME' : 'PAUSE', game);
}

function drawSmallButton(ctx, x, y, w, h, label, game) {
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + 23, 13, COLOURS.cream, '800', 'center');
}

export function missingItemsForPlate(recipeItems, plateItems) {
  const plateCounts = new Map();
  for (const item of plateItems) plateCounts.set(item, (plateCounts.get(item) ?? 0) + 1);
  const missing = [];
  for (const item of recipeItems) {
    const have = plateCounts.get(item) ?? 0;
    if (have > 0) plateCounts.set(item, have - 1);
    else missing.push(item);
  }
  return missing;
}

// ---------------------------------------------------------------- toasts & popups

function drawToasts(ctx, game) {
  // Toasts sit in the open floor lane, below the stations and above the
  // chef, so they never cover the order board or the station headers.
  let ty = 352;
  for (const toast of game.toasts) {
    const age = game.now - toast.born;
    const alpha = age > 2.2 ? Math.max(0, 1 - (age - 2.2) / 0.6) : 1;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 17px "Trebuchet MS", "Segoe UI", Verdana, sans-serif';
    const w = ctx.measureText(toast.text).width + 32;
    ctx.fillStyle = 'rgba(43,33,24,0.88)';
    roundRect(ctx, CANVAS_WIDTH / 2 - w / 2, ty, w, 34, 17);
    ctx.fill();
    text(ctx, toast.text, CANVAS_WIDTH / 2, ty + 23, 17, toast.colour, '700', 'center');
    ctx.restore();
    ty += 42;
  }
}

function drawPopups(ctx, game) {
  for (const popup of game.popups) {
    const age = game.now - popup.born;
    const fraction = age / 1.2;
    if (fraction >= 1) continue;
    ctx.save();
    ctx.globalAlpha = 1 - fraction;
    text(ctx, popup.text, popup.x, popup.y - fraction * 46, 26, popup.colour, '800', 'center');
    ctx.restore();
  }
}

// ---------------------------------------------------------------- overlays

function drawTitleScreen(ctx, game) {
  ctx.fillStyle = 'rgba(23,53,40,0.82)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, 'SIZZLE & SERVE', CANVAS_WIDTH / 2, 190, 64, COLOURS.cream, '800', 'center');
  text(ctx, 'a lunch-rush cooking game', CANVAS_WIDTH / 2, 236, 24, COLOURS.gold, '700', 'center');

  // A sample plate, drawn large, so the title screen already shows the food.
  drawPlateOnCounter(ctx, CANVAS_WIDTH / 2, 380, ['bun', 'patty-cooked', 'cheese', 'lettuce-chopped'], 1.6);

  text(ctx, 'Orders pile up on the board. Grab ingredients, chop and grill them,', CANVAS_WIDTH / 2, 500, 19, '#e8dcc8', '700', 'center');
  text(ctx, 'build each dish on the plate, and serve it before the timer runs out.', CANVAS_WIDTH / 2, 528, 19, '#e8dcc8', '700', 'center');
  text(ctx, 'Mouse to walk and click  ·  keys 1–6, C, G, P, S  ·  one shift = 3 minutes', CANVAS_WIDTH / 2, 566, 17, '#9fc5b2', '700', 'center');

  const pulse = 0.75 + 0.25 * Math.sin(game.now * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO START', CANVAS_WIDTH / 2, 650, 26, '#ffffff', '800', 'center');
  ctx.restore();
  if (game.bestScore > 0) {
    text(ctx, `Best score: ${game.bestScore}`, CANVAS_WIDTH / 2, 700, 17, COLOURS.gold, '700', 'center');
  }
}

function drawPauseScreen(ctx, game) {
  ctx.fillStyle = 'rgba(23,53,40,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, 'PAUSED', CANVAS_WIDTH / 2, 380, 56, COLOURS.cream, '800', 'center');
  text(ctx, 'Press Esc or click Resume to keep cooking', CANVAS_WIDTH / 2, 430, 20, '#e8dcc8', '700', 'center');
}

function drawGameOverScreen(ctx, game) {
  ctx.fillStyle = 'rgba(23,53,40,0.86)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, "SHIFT'S OVER!", CANVAS_WIDTH / 2, 180, 56, COLOURS.cream, '800', 'center');
  text(ctx, 'The kitchen closes — here is how the rush went.', CANVAS_WIDTH / 2, 226, 20, '#e8dcc8', '700', 'center');

  const rows = [
    ['Score', String(game.score)],
    ['Dishes served', String(game.served)],
    ['Orders lost', String(game.lost)],
    ['Best combo', `x${game.bestCombo}`],
    ['Coins earned', String(game.coins)],
  ];
  let ry = 300;
  for (const [label, value] of rows) {
    text(ctx, label, CANVAS_WIDTH / 2 - 160, ry, 22, '#c9b8a3', '700');
    text(ctx, value, CANVAS_WIDTH / 2 + 160, ry, 22, COLOURS.cream, '800', 'right');
    ry += 44;
  }
  if (game.score >= game.bestScore && game.score > 0) {
    text(ctx, 'NEW BEST SCORE!', CANVAS_WIDTH / 2, ry + 20, 24, COLOURS.gold, '800', 'center');
  }
  const pulse = 0.75 + 0.25 * Math.sin(game.now * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', CANVAS_WIDTH / 2, 640, 26, '#ffffff', '800', 'center');
  ctx.restore();
}

// ---------------------------------------------------------------- entry point

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground(ctx);
  drawHud(ctx, game);
  drawOrderBoard(ctx, game);
  drawPantry(ctx, game);
  drawBoard(ctx, game);
  drawGrill(ctx, game);
  drawPlating(ctx, game);
  drawChef(ctx, game.kitchen.chef);
  drawBottomPanel(ctx, game);
  drawPopups(ctx, game);
  drawToasts(ctx, game);

  if (game.state === 'title') drawTitleScreen(ctx, game);
  else if (game.state === 'paused') drawPauseScreen(ctx, game);
  else if (game.state === 'over') drawGameOverScreen(ctx, game);
}

// The rectangles input.js hit-tests, exported so the two modules agree.
export const HIT_RECTS = {
  serveButton: { x: 1020, y: 580, w: 224, h: 84 },
  soundButton: { x: 1020, y: 732, w: 106, h: 34 },
  pauseButton: { x: 1138, y: 732, w: 106, h: 34 },
};
