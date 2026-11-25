# Sizzle & Serve

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/StarsN/makefun-best-cooking-game-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/StarsN/makefun-best-cooking-game-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A fast, original lunch-rush cooking game. Orders pile up on the board; you run the kitchen alone — grab ingredients from the pantry, chop the veggies, grill the patties (don't let them burn), build each dish on the plate, and serve it before the customer's timer runs out. Serve dishes in a row to build a combo, earn coins, and level up: higher levels bring more simultaneous orders and shorter timers. One shift lasts three minutes.

## How to play

- **Click a pantry bin** (or press **1–6**) to grab an ingredient. The chef walks over and picks it up.
- **Click the chopping board** (or press **C**) with a raw veggie in hand to chop it.
- **Click the grill** (or press **G**) with a raw patty in hand to cook it — take it off in time or it burns.
- **Click the plating counter** (or press **P**) with a ready item in hand to add it to the plate. Clicking the plate with an empty hand clears it.
- **Click an order ticket or the SERVE button** (or press **S**) when the plate matches that dish.
- **Esc** pauses, **M** toggles sound, **R** restarts after the shift ends.

Dishes: Sunny Burger, Garden Burger, Cheesy Melt, Veggie Stack, Double Stack and Sunrise Stack — each with its own combination of bun, cooked patty, cheese and chopped vegetables. A served dish scores its base points plus a time bonus and a combo bonus; a lost order costs 25 points and resets the combo.

## Run it

No build step, no network requests, no libraries — plain static files, with sounds synthesised by WebAudio.

```sh
# from the repository root, serve the game directory
python3 -m http.server 8080 --directory game
# then open http://localhost:8080/ in desktop Chrome
```

Or open `game/index.html` through any static server of your choice. Add `?demo=1` to the URL to watch the kitchen play itself.

## Files

- `game/index.html` — the page and canvas
- `game/style.css` — the page around the canvas
- `game/src/config.js` — ingredients, recipes, levels, scoring
- `game/src/orders.js` — the order board and its tickets
- `game/src/kitchen.js` — stations, the chef, the hand, the plate
- `game/src/render.js` — everything drawn on the canvas
- `game/src/input.js` — mouse and keyboard
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/main.js` — the game loop, scoring and the demo autopilot
- `main.ts` — the make.fun entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`
- `screenshots/` — real renders of the game running in headless Chrome

<sub>Entered on [make.fun](https://make.fun/?ref=8fnx6nps&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
