# DeLa
A pass and play, Rummikub style tile game built as a PWA and hosted on GitHub Pages.

Birthday edition for Jonathan De La.

Play it here: https://petesimple.github.io/dela/

## What it is
DeLa is a classic rack based tile game you play on one device with friends. Each player has their own rack, takes a turn, then passes the device.

It is built to be fast, offline friendly, and easy to theme like chess sets.

## Version
v0.2
Rules on
Meld rows
Validation
Opening 30 rule

## How to play
1. Tap New to start a game and enter player names (2 to 4 players)
2. Each player gets 14 tiles on their rack
3. On your turn you can
   - Draw a tile
   - Create melds on the table
   - Add tiles from your rack into melds
4. Meld rules
   - Set: same number, 3 to 4 tiles, all different colors
   - Run: same color, 3 or more tiles, consecutive numbers
   - Jokers can substitute, but melds must still be valid
5. Opening rule
   - Before your first End Turn, your melds must total 30 points or more (non joker tile values)
6. End your turn
   - You can only End Turn when all melds are valid
7. Winning
   - First player to empty their rack wins

Tip: If a meld is invalid, it is highlighted and End Turn is disabled until fixed.

## Pass and play privacy
Between turns, the game shows a pass screen so the next player can take the device without seeing the previous rack.

No promises if someone is a known rack peeker. You know who you are.

## Install as an app (PWA)
### iPhone and iPad (Safari)
1. Open https://petesimple.github.io/dela/
2. Tap Share
3. Tap Add to Home Screen
4. Launch it from your home screen

### Android (Chrome)
1. Open https://petesimple.github.io/dela/
2. Tap the menu
3. Tap Install app

Once installed, DeLa works offline after the first load.

## Hosting on GitHub Pages
1. Push these files to a GitHub repo
2. Go to Settings > Pages
3. Source: Deploy from a branch
4. Branch: main, folder: root
5. Visit your Pages URL

## Files
- index.html: UI layout
- style.css: styling, tile and meld visuals
- app.js: game logic, state, rules, validation, pass and play flow
- manifest.json: PWA config
- sw.js: service worker for offline caching
- icon-192.png, icon-512.png: app icons

## Themes
Themes are defined in app.js in the THEMES array. Each theme sets CSS variables like:
- background colors
- accent color
- tile radius

To add a new theme:
1. Add a new object to THEMES
2. Pick a unique id and friendly name
3. Define vars with CSS variables

## Export and import
Use Export to download a JSON snapshot of the current game state.
Use Import to restore a saved game.

Handy for
- pausing a game
- moving to a different device
- sharing a weird mid game situation with a friend

## Roadmap
Ideas for future versions
- drag and drop tile ordering within melds
- insert position instead of append
- split meld and merge meld
- optional house rules toggles
- scoring at end of game
- more theme packs

## License
Pick whatever you prefer.
If you want a default, MIT is a solid choice.

## Credits
Made by Pete as a birthday gift for Jonathan De La.
If this game causes a friendship argument, that is working as designed.
